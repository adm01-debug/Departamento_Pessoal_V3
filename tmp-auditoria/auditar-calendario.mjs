import { chromium } from '@playwright/test';

/** AUDITORIA — Calendário completo (somente leitura, mocks atuais). */
const resultados = [];
const registrar = (id, descricao, esperado, obtido) => {
  const ok = JSON.stringify(esperado) === JSON.stringify(obtido);
  resultados.push({ id, descricao, status: ok ? 'APROVADO' : 'REPROVADO', esperado, obtido });
};

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1440, height: 900 },
});
await context.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-force-motion', 'on');
});
const page = await context.newPage();

const abrirTurmas = async () => {
  await page.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);
  await page.getByRole('tab', { name: /Turmas/ }).click();
  await page.waitForTimeout(1600);
};

const lerCalendario = () =>
  page.evaluate(() => {
    const dialogo = [...document.querySelectorAll('[role="dialog"]')].at(-1);
    const celulas = [...(dialogo?.querySelectorAll('[data-calendario-dia]') ?? [])];
    const chips = [...(dialogo?.querySelectorAll('[data-calendario-turma]') ?? [])];
    return {
      mes: dialogo?.querySelector('[data-calendario-mes]')?.textContent?.trim() ?? null,
      celulas: celulas.length,
      diasUnicos: new Set(celulas.map((c) => c.getAttribute('data-calendario-dia'))).size,
      chips: chips.map((chip) => ({
        id: chip.getAttribute('data-calendario-turma'),
        texto: chip.innerText.replace(/\n+/g, ' · ').trim(),
        dia: chip.closest('[data-calendario-dia]')?.getAttribute('data-calendario-dia')?.slice(0, 10) ?? null,
        naListaMobile: Boolean(chip.closest('[data-calendario-lista-mes]')),
        visivel: chip.getBoundingClientRect().width > 0,
      })),
      texto: dialogo?.innerText.replace(/\n+/g, ' · ').trim() ?? null,
      listaMobile: (() => {
        const lista = dialogo?.querySelector('[data-calendario-lista-mes]');
        return lista ? getComputedStyle(lista).display !== 'none' : false;
      })(),
      caixa: (() => {
        if (!dialogo) return null;
        const r = dialogo.getBoundingClientRect();
        return {
          w: Math.round(r.width),
          h: Math.round(r.height),
          viewportW: window.innerWidth,
          overflowX: dialogo.scrollWidth - dialogo.clientWidth,
          overflowY: getComputedStyle(dialogo).overflowY,
          scrollable: dialogo.scrollHeight > dialogo.clientHeight,
        };
      })(),
    };
  });

const contarDiasDoMes = (ano, mes) =>
  page.evaluate(
    ({ ano, mes }) => {
      const dialogo = [...document.querySelectorAll('[role="dialog"]')].at(-1);
      const datas = [...dialogo.querySelectorAll('[data-calendario-dia]')].map(
        (c) => new Date(c.getAttribute('data-calendario-dia'))
      );
      const doMes = datas.filter((d) => d.getFullYear() === ano && d.getMonth() === mes);
      return {
        diasNoMes: new Set(doMes.map((d) => d.getDate())).size,
        primeiro: Math.min(...doMes.map((d) => d.getDate())),
        ultimo: Math.max(...doMes.map((d) => d.getDate())),
        celulasUnicas: new Set(datas.map((d) => d.toDateString())).size === datas.length,
      };
    },
    { ano, mes }
  );

const mesAtual = async () => {
  const texto = (await page.locator('[data-calendario-mes]').innerText()).trim();
  const [nome, ano] = texto.split(' de ');
  return { indice: MESES.indexOf(nome), ano: Number(ano), texto };
};

const irParaMes = async (ano, indice) => {
  for (let passo = 0; passo < 48; passo += 1) {
    const atual = await mesAtual();
    if (atual.indice === indice && atual.ano === ano) return atual;
    const alvo = ano * 12 + indice;
    const posicao = atual.ano * 12 + atual.indice;
    await page.getByRole('button', { name: alvo > posicao ? 'Próximo mês' : 'Mês anterior' }).click();
    await page.waitForTimeout(60);
  }
  return mesAtual();
};

await abrirTurmas();
await page.getByRole('button', { name: /Ver calendário completo/i }).click();
await page.waitForTimeout(800);

const setembro = await lerCalendario();
const setembroVisiveis = setembro.chips.filter((chip) => !chip.naListaMobile);
registrar('CAL-01', 'Abre no mês da agenda', 'Setembro de 2026', setembro.mes);
registrar('CAL-02', 'Células da grade sem duplicatas', true, setembro.diasUnicos === setembro.celulas);
registrar('CAL-03', 'Setembro tem 30 dias', 30, (await contarDiasDoMes(2026, 8)).diasNoMes);
registrar(
  'CAL-04',
  'Duas turmas em setembro, sem duplicatas por dia',
  { total: 2, unicos: 2, datasDistintas: 2 },
  {
    total: setembroVisiveis.length,
    unicos: new Set(setembroVisiveis.map((c) => c.id)).size,
    datasDistintas: new Set(setembroVisiveis.map((c) => c.dia)).size,
  }
);
registrar(
  'CAL-05',
  'Evento de 15/09 é a mesma turma da agenda',
  'mock-inst-2',
  setembroVisiveis.find((chip) => chip.texto.includes('NR-35'))?.id ?? null
);
registrar(
  'CAL-06',
  'Evento mantém horário e local da agenda',
  true,
  Boolean(setembroVisiveis.find((chip) => chip.id === 'mock-inst-2')?.texto.includes('09:00 · Sala 02'))
);
await page.screenshot({ path: 'tmp-auditoria/calendario-setembro.png' });

await page.locator('[data-calendario-turma="mock-inst-2"]').first().click();
await page.waitForTimeout(700);
const detalhe = await page.evaluate(() => {
  const dialogos = [...document.querySelectorAll('[role="dialog"]')];
  return { quantidade: dialogos.length, texto: dialogos.at(-1)?.innerText.replace(/\n+/g, ' · ').trim() ?? null };
});
registrar('CAL-07', 'Calendário permanece aberto sob o detalhe', 2, detalhe.quantidade);
const chaves = ['NR-35 Trabalho em Altura', '15/09/2026', '09:00', 'Sala 02'];
registrar(
  'CAL-08',
  'Detalhe contém data, horário e local',
  chaves,
  chaves.filter((texto) => detalhe.texto?.includes(texto))
);
await page.keyboard.press('Escape');
await page.waitForTimeout(1900);
registrar('CAL-09', 'Fechar detalhe mantém o calendário', 1, await page.locator('[role="dialog"]').count());

await page.getByRole('button', { name: 'Próximo mês' }).click();
await page.waitForTimeout(350);
const outubro = await lerCalendario();
registrar('CAL-10', 'Navegação para outubro', 'Outubro de 2026', outubro.mes);
registrar(
  'CAL-11',
  'Mês sem turmas explica o vazio',
  { chips: 0, mensagem: true },
  { chips: outubro.chips.length, mensagem: Boolean(outubro.texto?.includes('Nenhuma turma neste mês.')) }
);

await irParaMes(2026, 7);
const agosto = await lerCalendario();
const agostoGrade = agosto.chips.filter((chip) => !chip.naListaMobile);
const agostoDoMes = agostoGrade.filter((chip) => chip.dia?.startsWith('2026-08'));
const agostoAdjacente = agostoGrade.filter((chip) => !chip.dia?.startsWith('2026-08'));
const longo = await page.evaluate(() => {
  const dialogo = [...document.querySelectorAll('[role="dialog"]')].at(-1);
  const titulo = dialogo.querySelector('[data-calendario-turma="mock-inst-3"] span.block.truncate');
  return titulo
    ? { texto: titulo.textContent?.trim(), classe: titulo.className, truncado: titulo.scrollWidth > titulo.clientWidth }
    : null;
});
const pontos = await page.evaluate(() => {
  const dialogo = [...document.querySelectorAll('[role="dialog"]')].at(-1);
  return ['mock-inst-3', 'mock-inst-5'].map(
    (id) => dialogo.querySelector(`[data-calendario-turma="${id}"]`)?.querySelector('span')?.className ?? null
  );
});
registrar(
  'CAL-12',
  'Agosto exibe duas turmas do mês com status distintos',
  { total: 2, unicos: 2, pontosDiferentes: true },
  {
    total: agostoDoMes.length,
    unicos: new Set(agostoDoMes.map((c) => c.id)).size,
    pontosDiferentes: pontos[0] !== pontos[1],
  }
);
registrar(
  'CAL-12B',
  'Dia adjacente (01/09) aparece na grade de agosto sem duplicar no dia 01/08',
  { adjacentes: 1, id: 'mock-inst-1', semDuplicataNoMes: true },
  {
    adjacentes: agostoAdjacente.length,
    id: agostoAdjacente[0]?.id ?? null,
    semDuplicataNoMes: new Set(agostoDoMes.map((c) => `${c.dia}|${c.id}`)).size === agostoDoMes.length,
  }
);
registrar(
  'CAL-13',
  'Nome longo truncado no chip',
  { truncado: true, classeTruncate: true },
  { truncado: longo?.truncado, classeTruncate: Boolean(longo?.classe.includes('truncate')) }
);
await page.screenshot({ path: 'tmp-auditoria/calendario-agosto.png' });

/* Tamanhos de mês, ano bissexto e virada de ano */
const meses = [
  [2026, 0, 31],
  [2026, 1, 28],
  [2026, 3, 30],
  [2026, 4, 31],
  [2026, 8, 30],
  [2028, 1, 29],
  [2028, 11, 31],
];
for (const [ano, indice, esperado] of meses) {
  await irParaMes(ano, indice);
  const dados = await contarDiasDoMes(ano, indice);
  registrar(
    `CAL-14-${ano}-${indice + 1}`,
    `${MESES[indice]}/${ano} tem ${esperado} dias`,
    { dias: esperado, primeiro: 1, ultimo: esperado, celulasUnicas: true },
    { dias: dados.diasNoMes, primeiro: dados.primeiro, ultimo: dados.ultimo, celulasUnicas: dados.celulasUnicas }
  );
}
await irParaMes(2029, 0);
registrar('CAL-15', 'Virada dezembro → janeiro atualiza o ano', 'Janeiro de 2029', (await mesAtual()).texto);

/* Responsividade do modal */
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
await abrirTurmas();
await page.getByRole('button', { name: /Ver calendário completo/i }).click();
await page.waitForTimeout(700);
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(700);
const mobile = await lerCalendario();
registrar(
  'CAL-16',
  'Modal cabe na tela de 390 px, sem overflow horizontal',
  { cabeNaTela: true, overflowX: 0 },
  { cabeNaTela: (mobile.caixa?.w ?? 0) <= 390, overflowX: mobile.caixa?.overflowX }
);
registrar('CAL-17', 'Lista “Turmas do mês” visível no mobile', true, mobile.listaMobile);
registrar(
  'CAL-18',
  'Conteúdo do modal acessível (cabe ou rola), sem corte silencioso',
  { conteudoAcessivel: true, overflowY: 'auto' },
  {
    conteudoAcessivel:
      (mobile.caixa?.scrollable ?? false) ||
      (mobile.caixa?.h ?? 0) <= 844 * 0.9 + 1 ||
      mobile.caixa?.overflowY === 'auto',
    overflowY: mobile.caixa?.overflowY,
  }
);
await page.screenshot({ path: 'tmp-auditoria/calendario-mobile.png' });

console.log(JSON.stringify(resultados, null, 2));
await browser.close();
