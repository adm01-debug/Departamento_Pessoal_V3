import { chromium } from '@playwright/test';
import fs from 'node:fs';

/**
 * Validação de navegador da janela de detalhes do candidato (Recrutamento).
 * Usa a sessão E2E já persistida e o modo demonstração (VITE_RECRUTAMENTO_MOCK).
 * Nenhuma escrita de rede: o mock em memória responde por tudo.
 */
const OUT = 'tmp-modal-validacao';
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:8080';

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage();
// Tema dark (o da referência aprovada do sistema) + tour já visto.
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') erros.push(`console: ${m.text()}`);
});

await page.goto(`${BASE}/recrutamento`, { waitUntil: 'domcontentloaded' });
await page.locator('[data-pipeline-coluna] [data-candidato-card]').first().waitFor({ timeout: 40000 });
await page.waitForTimeout(2500);

async function medir() {
  return page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    if (!d) return null;
    const box = d.getBoundingClientRect();
    const faixa = (nome) => {
      const el = d.querySelector(`[data-modal-faixa="${nome}"]`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        height: Math.round(r.height),
        scrollH: el.scrollHeight,
        clientH: el.clientHeight,
        overflowY: getComputedStyle(el).overflowY,
      };
    };
    const ultimo = d.querySelector('[data-modal-faixa="historico"] ol > li:last-child');
    const rodape = faixa('rodape');
    return {
      width: Math.round(box.width),
      height: Math.round(box.height),
      top: Math.round(box.top),
      bottom: Math.round(box.bottom),
      maxHeight: getComputedStyle(d).maxHeight,
      viewport: { w: innerWidth, h: innerHeight },
      faixas: {
        cabecalho: faixa('cabecalho'),
        contato: faixa('contato'),
        etapas: faixa('etapas'),
        historico: faixa('historico'),
        rodape,
      },
      vaoUltimoEventoRodape:
        ultimo && rodape ? Math.round(rodape.top - ultimo.getBoundingClientRect().bottom) : null,
      registros: d.querySelector('[aria-label="Histórico do processo"]')?.innerText.match(/(\d+) registros?/)?.[1] ?? null,
      etapaAtual: d.querySelector('[data-modal-faixa="etapas"] [aria-current="step"]')?.innerText ?? null,
      avanco: [...d.querySelectorAll('button')].map((b) => b.innerText.trim()).find((t) => t.startsWith('Avançar')) ?? null,
      score: /Score/.test(d.innerText),
      overflowX: d.scrollWidth > d.clientWidth,
    };
  });
}

async function abrir(id) {
  const card = page.locator(`[data-candidato-card="${id}"]`);
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await card.click();
  await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(1400);
}

async function fecharComEscape() {
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 15000 });
  await page.waitForTimeout(400);
}

const relatorio = { cenarios: {}, viewports: {}, erros };

/* ── Cenário A: um único evento, na Triagem (sem score) ──────────────────── */
await abrir('mock-candt-1');
relatorio.cenarios.umEvento = await medir();
await page.screenshot({ path: `${OUT}/01-um-evento-1440.png` });

/* ── Cenário I: responsividade com a MESMA janela aberta ─────────────────── */
for (const [nome, size] of Object.entries({
  '1920x1080': { width: 1920, height: 1080 },
  '1600x900': { width: 1600, height: 900 },
  '1366x768': { width: 1366, height: 768 },
  '768x1024': { width: 768, height: 1024 },
  '390x844': { width: 390, height: 844 },
})) {
  await page.setViewportSize(size);
  await page.waitForTimeout(500);
  relatorio.viewports[nome] = await medir();
  await page.screenshot({ path: `${OUT}/02-responsivo-${nome}.png` });
}
await page.setViewportSize({ width: 1440, height: 900 });
await page.waitForTimeout(400);
await fecharComEscape();

/* ── Cenário E/F: uma janela por etapa (e sem score na triagem) ──────────── */
const porEtapa = [
  ['triagem', 'mock-candt-1'],
  ['entrevista', 'mock-candt-5'],
  ['teste', 'mock-candt-9'],
  ['proposta', 'mock-candt-10'],
  ['contratado', 'mock-candt-12'],
];
for (const [etapa, id] of porEtapa) {
  await abrir(id);
  relatorio.cenarios[`etapa-${etapa}`] = await medir();
  await page.screenshot({ path: `${OUT}/03-etapa-${etapa}.png` });
  await fecharComEscape();
}

/* ── Cenário B: histórico extenso — 4 eventos no Contratado ──────────────── */
await abrir('mock-candt-12');
relatorio.cenarios.multiplosEventos = await medir();
await page.screenshot({ path: `${OUT}/04-multiplos-eventos-1440.png` });
await page.setViewportSize({ width: 768, height: 1024 });
await page.waitForTimeout(500);
relatorio.cenarios.multiplosEventosTablet = await medir();
await page.screenshot({ path: `${OUT}/05-multiplos-eventos-768.png` });

/* Histórico extenso em viewport BAIXO: só a faixa do histórico rola. */
await page.setViewportSize({ width: 1366, height: 620 });
await page.waitForTimeout(500);
relatorio.cenarios.multiplosEventosBaixo = await medir();
relatorio.cenarios.multiplosEventosBaixo.scrollDoHistorico = await page.evaluate(() => {
  const el = document.querySelector('[data-modal-faixa="historico"]');
  if (!el) return null;
  el.scrollTop = el.scrollHeight;
  return { scrollTop: el.scrollTop, scrollH: el.scrollHeight, clientH: el.clientHeight };
});
await page.screenshot({ path: `${OUT}/05b-multiplos-eventos-1366x620.png` });
await page.setViewportSize({ width: 1440, height: 900 });
await page.waitForTimeout(300);

/* ── Cenário H: fechamento pelo X (o Radix também cobre Escape/véu) ──────── */
const botaoX = page.getByRole('dialog').getByRole('button', { name: 'Fechar' }).first();
await botaoX.click();
await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 15000 });
await page.waitForTimeout(500);
relatorio.fechouPeloX = (await page.getByRole('dialog').count()) === 0;

/* ── Cenário J: o Kanban continua íntegro após fechar ───────────────────── */
relatorio.kanbanDepois = await page.evaluate(() => {
  const main = document.querySelector('main');
  const cards = document.querySelectorAll('[data-pipeline-coluna] [data-candidato-card]').length;
  const antes = main?.scrollTop ?? 0;
  if (main) main.scrollTop = antes + 240;
  const depois = main?.scrollTop ?? 0;
  return { cards, scrollAntes: antes, scrollDepois: depois, scrollFunciona: depois > antes };
});
await page.screenshot({ path: `${OUT}/06-kanban-apos-fechar.png` });

await browser.close();
fs.writeFileSync(`${OUT}/relatorio.json`, JSON.stringify(relatorio, null, 2));
console.log(JSON.stringify(relatorio, null, 2));
