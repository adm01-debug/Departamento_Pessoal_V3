import { chromium } from '@playwright/test';

/** AUDITORIA — cards + Agenda da semana (14–20/09/2026). Somente leitura. */
const resultados = [];
const registrar = (id, descricao, esperado, obtido) => {
  const ok = JSON.stringify(esperado) === JSON.stringify(obtido);
  resultados.push({ id, descricao, status: ok ? 'APROVADO' : 'REPROVADO', esperado, obtido });
};

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

const lerAgenda = () =>
  page.evaluate(() => ({
    range: document.querySelector('[data-agenda-range]')?.textContent?.trim() ?? null,
    dias: [...document.querySelectorAll('[data-agenda-dia]')].map((dia) => ({
      iso: dia.getAttribute('data-agenda-dia'),
      texto: dia.innerText.replace(/\n+/g, ' ').trim(),
      eventos: [...dia.querySelectorAll('[data-agenda-evento]')].map((evento) => ({
        id: evento.getAttribute('data-agenda-evento'),
        texto: evento.innerText.replace(/\n+/g, ' · ').trim(),
      })),
    })),
  }));

await abrirTurmas();

const cards = await page.evaluate(() => ({
  total: document.querySelectorAll('[data-turma-card]').length,
  porColuna: Object.fromEntries(
    [...document.querySelectorAll('[data-turmas-coluna]')].map((coluna) => [
      coluna.getAttribute('data-turmas-coluna'),
      coluna.querySelectorAll('[data-turma-card]').length,
    ])
  ),
}));
registrar(
  'CARDS-01',
  'Cards de turmas renderizados',
  { total: 5, porColuna: { proximas: 2, andamento: 1, concluidas: 2 } },
  cards
);

const inicial = await lerAgenda();
registrar('AG-01', 'Intervalo inicial da agenda', '14 set – 20 set 2026', inicial.range);
registrar('AG-02', 'Sete dias exibidos', 7, inicial.dias.length);
registrar(
  'AG-03',
  'Dias e datas na ordem seg→dom',
  ['SEG 14', 'TER 15', 'QUA 16', 'QUI 17', 'SEX 18', 'SÁB 19', 'DOM 20'],
  inicial.dias.map((dia) => dia.texto.split(' ').slice(0, 2).join(' '))
);
registrar(
  'AG-04',
  'NR-35 na terça 15/09 às 09:00 · Sala 02',
  { dia: '2026-09-15', id: 'mock-inst-2', texto: 'NR-35 Trabalho em Altura · 09:00 · Sala 02' },
  inicial.dias[1].eventos.map((evento) => ({
    dia: inicial.dias[1].iso?.slice(0, 10),
    id: evento.id,
    texto: evento.texto,
  }))[0]
);
registrar(
  'AG-05',
  'Dias vazios com mensagem (6 de 7)',
  6,
  inicial.dias.filter(
    (dia) => dia.eventos.length === 0 && dia.texto.includes('Nenhuma turma agendada para este dia.')
  ).length
);
await page.screenshot({ path: 'tmp-auditoria/agenda-setembro.png' });

await page.locator('[data-agenda-evento="mock-inst-2"]').click();
await page.waitForTimeout(700);
const detalhe = await page.evaluate(() => {
  const dialogo = [...document.querySelectorAll('[role="dialog"]')].at(-1);
  return { texto: dialogo?.innerText.replace(/\n+/g, ' · ').trim() ?? null };
});
const chaves = ['NR-35 Trabalho em Altura', '15/09/2026', '09:00', 'Sala 02', 'Planejado'];
registrar(
  'AG-06',
  'Clique no evento abre os detalhes corretos',
  chaves,
  chaves.filter((texto) => detalhe.texto?.includes(texto))
);
await page.keyboard.press('Escape');
await page.waitForTimeout(500);

const proxima = async () => {
  await page.getByRole('button', { name: 'Próxima semana' }).click();
  await page.waitForTimeout(250);
};
const anterior = async () => {
  await page.getByRole('button', { name: 'Semana anterior' }).click();
  await page.waitForTimeout(250);
};

await proxima();
const vazia = await lerAgenda();
registrar('AG-07', 'Próxima semana', '21 set – 27 set 2026', vazia.range);
registrar(
  'AG-08',
  'Semana sem turmas mostra sete mensagens de vazio',
  { eventos: 0, mensagens: 7 },
  {
    eventos: vazia.dias.reduce((total, dia) => total + dia.eventos.length, 0),
    mensagens: vazia.dias.filter((dia) => dia.texto.includes('Nenhuma turma agendada para este dia.')).length,
  }
);

await anterior();
await anterior();
registrar('AG-09', 'Duas semanas anteriores', '07 set – 13 set 2026', (await lerAgenda()).range);
await anterior();
registrar('AG-10', 'Transição entre meses (31/08 a 06/09)', '31 ago – 06 set 2026', (await lerAgenda()).range);
await proxima();
await proxima();
await proxima();
await proxima();
registrar('AG-11', 'Segunda transição de mês (28/09 a 04/10)', '28 set – 04 out 2026', (await lerAgenda()).range);

let transicaoAno = null;
for (let passo = 0; passo < 20; passo += 1) {
  await proxima();
  const atual = await lerAgenda();
  if (atual.range?.includes('2027')) {
    transicaoAno = atual.range;
    break;
  }
}
registrar('AG-12', 'Transição entre anos', '28 dez 2026 – 03 jan 2027', transicaoAno);

console.log(JSON.stringify(resultados, null, 2));
await browser.close();
