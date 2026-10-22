/** TEMPORÁRIO — funcionalidade/animação da tabela de Pagamentos após o grid. */
import { chromium } from '@playwright/test';
import { appendFileSync, existsSync } from 'node:fs';

const log = (m) => appendFileSync('tmp-pagamentos-grid/funcional.log', `${m}\n`);
const browser = await chromium.launch();
const contexto = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  storageState: existsSync('e2e/.auth/user.json') ? 'e2e/.auth/user.json' : undefined,
});
await contexto.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
const page = await contexto.newPage();
page.setDefaultTimeout(20000);
const erros = [];
page.on('pageerror', (e) => erros.push(e.message));

await page.goto('http://localhost:8080/premiacoes', { waitUntil: 'domcontentloaded' });
await page.getByRole('tab', { name: /^Pagamentos$/ }).click();
await page.getByRole('table', { name: 'Pagamentos' }).waitFor({ timeout: 30000 });

// Animação de entrada da 1ª linha (mesma régua do Hub).
const animacao = await page.evaluate(async () => {
  const inicio = performance.now();
  const amostras = [];
  await new Promise((resolve) => {
    const tick = () => {
      const linha = document.querySelector('[role="rowgroup"] [role="row"]:nth-child(2)');
      if (linha) {
        const cs = getComputedStyle(linha);
        amostras.push({ t: Math.round(performance.now() - inicio), op: Number(cs.opacity), tr: cs.transform });
      }
      if (performance.now() - inicio < 2000) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
  const comecou = amostras.find((a) => a.op > 0.02);
  const terminou = amostras.find((a) => a.op >= 0.99 && (a.tr === 'none' || a.tr === ''));
  return {
    opInicial: amostras[0]?.op ?? null,
    trInicial: amostras[0]?.tr ?? null,
    inicioMs: comecou?.t ?? null,
    fimMs: terminou?.t ?? null,
    duracaoMs: comecou && terminou ? terminou.t - comecou.t : null,
  };
});
log(JSON.stringify({ etapa: 'animacao', ...animacao }));
await page.waitForTimeout(2200);

// Seleção individual + barra de ação.
const caixas = page.getByRole('checkbox', { name: /Selecionar pagamento de/ });
await caixas.first().click();
await page.getByText(/1 pagamento selecionado/).waitFor();
log(
  JSON.stringify({
    etapa: 'selecao-individual',
    barra: await page.getByText(/1 pagamento selecionado/).innerText(),
    aprovarVisivel: await page.getByRole('button', { name: /Aprovar selecionados/ }).isVisible(),
    marcado: await caixas.first().getAttribute('aria-checked'),
  })
);

// Selecionar todos pelo cabeçalho.
await page.getByRole('checkbox', { name: /Selecionar todos os pagamentos/ }).click();
await page.getByText(/6 pagamentos selecionados/).waitFor();
log(
  JSON.stringify({
    etapa: 'selecionar-todos',
    texto: await page.getByText(/6 pagamentos selecionados/).innerText(),
    marcados: await caixas.evaluateAll((els) => els.filter((el) => el.getAttribute('aria-checked') === 'true').length),
  })
);
await page.getByRole('button', { name: 'Limpar', exact: true }).click();
await page.waitForTimeout(300);
log(JSON.stringify({ etapa: 'limpar-selecao', barra: await page.getByText(/pagamentos? selecionado/).count() }));

// Menu de ações da linha.
await page.getByRole('button', { name: /Mais ações para/ }).first().click();
const menu = (await page.getByRole('menu').innerText()).replace(/\s+/g, ' ').slice(0, 120);
await page.keyboard.press('Escape');
log(JSON.stringify({ etapa: 'menu', itens: menu }));

// Ordenação.
const primeiraAntes = (await page.locator('[role="rowgroup"] [role="row"]:nth-child(2)').innerText()).slice(0, 60);
await page.getByLabel('Ordenar por').click();
await page.getByRole('option', { name: 'Maior valor' }).click();
await page.waitForTimeout(1600);
const primeiraDepois = (await page.locator('[role="rowgroup"] [role="row"]:nth-child(2)').innerText()).slice(0, 60);
log(JSON.stringify({ etapa: 'ordenacao', mudou: primeiraAntes !== primeiraDepois }));

// Paginação.
const rotuloAntes = await page.getByText(/Mostrando \d+ de \d+ pagamentos/).innerText();
await page.getByRole('button', { name: 'Próxima página' }).click();
await page.waitForTimeout(1500);
log(
  JSON.stringify({
    etapa: 'paginacao',
    antes: rotuloAntes,
    depois: await page.getByText(/Mostrando \d+ de \d+ pagamentos/).innerText(),
    linhas: await page.locator('[role="rowgroup"] [role="row"]').count(),
  })
);

// Estado vazio.
await page.getByLabel('Buscar pagamentos').fill('zzzz-sem-pagamento');
await page.waitForTimeout(1200);
log(
  JSON.stringify({
    etapa: 'vazio',
    texto: await page.getByText(/Nenhum pagamento/i).first().innerText().catch(() => null),
  })
);

log(JSON.stringify({ erros }));
await browser.close();
