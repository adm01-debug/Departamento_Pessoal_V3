/**
 * TEMPORÁRIO — validação da REMOÇÃO dos dois painéis legados da aba Pagamentos.
 *
 * Confere no DOM real:
 *   1. a faixa "Pagamentos Rejeitados (auditoria necessária)" NÃO existe na aba;
 *   2. o "Painel Gerencial de Auditoria & ROI v1.2" NÃO existe na aba;
 *   3. o Painel Gerencial está na aba AUDITORIA (implementação preservada:
 *      filtros, CSV/PDF e a tabela consolidada), junto da trilha;
 *   4. não sobrou espaço vazio no fim da aba Pagamentos;
 *   5. o pagamento REJEITADO continua na tabela com a ação "Reiniciar fluxo" e o
 *      diálogo abre (funcionalidade preservada);
 *   6. nenhum erro de página.
 *
 * Uso: node scripts/_tmp-validar-remocao.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const URL = 'http://localhost:8080/premiacoes';
const SAIDA = 'tmp-remocao-paineis';
mkdirSync(SAIDA, { recursive: true });

const browser = await chromium.launch();
const contexto = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1456, height: 1000 },
});
const page = await contexto.newPage();
const erros = [];
page.on('pageerror', (e) => erros.push(String(e.message).slice(0, 200)));
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30_000 });
await page.getByRole('tab', { name: /Pagamentos/ }).click();
await page.getByRole('heading', { name: /Pagamentos & Premiações/ }).waitFor({ timeout: 15_000 });
await page.waitForTimeout(2200);

const contagem = (texto) => page.getByText(texto, { exact: false }).count();
const r = {};

/* 1-2 · Os painéis legados não existem na aba Pagamentos */
r.bandaRejeitadosNaAba = await page.getByText(/Pagamentos rejeitados/i).count();
r.painelGerencialNaAba = await page.getByText(/Painel Gerencial de Auditoria/i).count();
r.tabelasNaAba = await page.locator('table').count();
r.lateraisNaAba = await page.getByText(/Resumo Financeiro|Próximas ações|Atividade recente/).count();

/* 4 · Sem espaço vazio no fim: o último elemento visível encosta no fim do conteúdo */
r.fimDaAba = await page.evaluate(() => {
  const ativo = document.querySelector('[role="tabpanel"][data-state="active"]');
  if (!ativo) return null;
  const filhos = Array.from(ativo.querySelectorAll('*')).filter((el) => {
    const cs = getComputedStyle(el);
    return el.getBoundingClientRect().height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden';
  });
  const ultimo = filhos.length
    ? filhos.reduce((a, b) => (b.getBoundingClientRect().bottom > a.getBoundingClientRect().bottom ? b : a))
    : null;
  const a = ativo.getBoundingClientRect();
  return {
    alturaAba: Math.round(a.height),
    ultimoVisivel: ultimo ? `${ultimo.tagName.toLowerCase()} bottom=${Math.round(ultimo.getBoundingClientRect().bottom)}` : null,
    folgaFinal: ultimo ? Math.round(a.bottom - ultimo.getBoundingClientRect().bottom) : null,
  };
});

/* 3 · Linha rejeitada: ação principal preservada */
const linhaRejeitada = page.locator('tbody tr').filter({ hasText: 'Rejeitado' }).first();
r.linhaRejeitadaExiste = (await linhaRejeitada.count()) > 0;
r.acaoDaLinhaRejeitada = r.linhaRejeitadaExiste
  ? (await linhaRejeitada.locator('td:last-child button').first().innerText()).trim()
  : null;
r.kebabDaRejeitadaTemReiniciar = r.linhaRejeitadaExiste
  ? await (async () => {
      await linhaRejeitada.getByRole('button', { name: /Mais ações/ }).click();
      await page.waitForTimeout(400);
      const tem = (await page.getByRole('menuitem', { name: /Reiniciar fluxo/ }).count()) > 0;
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      return tem;
    })()
  : null;

/* 5 · Reiniciar fluxo abre o diálogo (escrita preservada) */
if (r.linhaRejeitadaExiste) {
  await linhaRejeitada.getByRole('button', { name: /Reiniciar fluxo/ }).click();
  await page.waitForTimeout(600);
  r.dialogoReinicio = (await page.getByRole('dialog').innerText()).slice(0, 160);
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await page.waitForTimeout(400);
}

await page.screenshot({ path: `${SAIDA}/pagamentos-final.png`, fullPage: true });

/* 3 · Aba Auditoria: o painel está lá, com filtros, exportação e tabela */
await page.getByRole('tab', { name: /Auditoria/ }).click();
await page.waitForTimeout(1200);
r.auditoria = {
  painelGerencial: await page.getByText(/Painel Gerencial de Auditoria & ROI v1\.2/).count(),
  subtitulo: await page.getByText(/Dados consolidados com snapshot de metas/i).count(),
  filtros: await page.getByLabel(/Filtrar por (período|unidade|faixa de meta)/).count(),
  botoesCsvPdf: [
    await page.getByRole('button', { name: /CSV/ }).count(),
    await page.getByRole('button', { name: /PDF/ }).count(),
  ],
  tabelas: await page.locator('table').count(),
  linhasDoPainel: await page.locator('tbody tr').count(),
  trilha: await page.getByText(/Trilha de Auditoria de Premiações/).count(),
};
await page.screenshot({ path: `${SAIDA}/auditoria-final.png`, fullPage: true });

r.erros = erros;
writeFileSync(`${SAIDA}/relatorio.json`, JSON.stringify(r, null, 2));
console.log(JSON.stringify(r, null, 2));

await contexto.close();
await browser.close();
