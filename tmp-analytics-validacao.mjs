import { chromium } from '@playwright/test';
import fs from 'node:fs';

/**
 * Validação de navegador da ABA ANALYTICS do Recrutamento.
 * Sessão E2E existente + modo demonstração (VITE_RECRUTAMENTO_MOCK=true).
 * Nenhuma escrita: a tela é 100% leitura.
 */
const OUT = 'tmp-analytics-validacao';
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:8080';

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage();
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
await page.getByRole('tab', { name: 'Analytics' }).waitFor({ timeout: 40000 });
await page.waitForTimeout(2000);
await page.getByRole('tab', { name: 'Analytics' }).click();
await page.locator('[data-analytics-recrutamento]').waitFor({ state: 'visible', timeout: 20000 });
await page.waitForTimeout(1800);

async function medir() {
  return page.evaluate(() => {
    const root = document.querySelector('[data-analytics-recrutamento]');
    const box = (el) => {
      const r = el.getBoundingClientRect();
      return { top: Math.round(r.top), height: Math.round(r.height), width: Math.round(r.width) };
    };
    const paineis = [...root.querySelectorAll('[data-analytics-painel]')].map((el) => ({
      titulo: el.getAttribute('data-analytics-painel'),
      ...box(el),
    }));
    const kpis = [...root.querySelectorAll('[data-analytics-kpi]')].map((el) => ({
      id: el.getAttribute('data-analytics-kpi'),
      texto: el.innerText.replace(/\s+/g, ' ').trim(),
      ...box(el),
    }));
    const chart = root.querySelector('.recharts-surface');
    return {
      root: box(root),
      paineis,
      kpis,
      temGrafico: Boolean(chart),
      grafico: chart ? box(chart) : null,
      rolagemHorizontal: document.documentElement.scrollWidth > window.innerWidth,
      rootOverflowX: root.scrollWidth > root.clientWidth,
      viewport: { w: window.innerWidth, h: window.innerHeight },
      texto: root.innerText.replace(/\s+/g, ' ').trim().slice(0, 900),
    };
  });
}

const relatorio = { viewports: {}, periodos: {}, erros };

const TAMANHOS = {
  '1920x1080': { width: 1920, height: 1080 },
  '1600x900': { width: 1600, height: 900 },
  '1440x900': { width: 1440, height: 900 },
  '1366x768': { width: 1366, height: 768 },
  '1280x800': { width: 1280, height: 800 },
  '768x1024': { width: 768, height: 1024 },
  '390x844': { width: 390, height: 844 },
};

for (const [nome, tamanho] of Object.entries(TAMANHOS)) {
  await page.setViewportSize(tamanho);
  await page.waitForTimeout(700);
  relatorio.viewports[nome] = await medir();
  await page.screenshot({
    path: `${OUT}/analytics-${nome}.png`,
    fullPage: nome === '1440x900' || nome === '390x844',
  });
}

// Volta ao desktop e troca o recorte do gráfico (seletor local).
await page.setViewportSize({ width: 1440, height: 900 });
await page.waitForTimeout(500);
await page.getByRole('combobox', { name: 'Período da evolução de candidaturas' }).click();
await page.getByRole('option', { name: '12 meses' }).click();
await page.waitForTimeout(900);
relatorio.periodos.dozeMeses = {
  subtitulo: await page
    .locator('[data-analytics-painel="Evolução de candidaturas"]')
    .innerText()
    .then((texto) => texto.replace(/\s+/g, ' ').trim().slice(0, 160)),
  temGrafico: (await page.locator('[data-analytics-painel="Evolução de candidaturas"] .recharts-surface').count()) > 0,
};
await page.screenshot({ path: `${OUT}/analytics-periodo-12-meses.png` });

fs.writeFileSync(`${OUT}/relatorio.json`, JSON.stringify(relatorio, null, 2));
console.log(JSON.stringify(relatorio, null, 2));
await browser.close();
