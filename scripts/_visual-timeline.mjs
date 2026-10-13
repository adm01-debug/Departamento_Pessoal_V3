/**
 * TEMPORÁRIO — captura/medição da timeline do card "Ciclo Ativo" (Desempenho).
 * Uso: node scripts/_visual-timeline.mjs
 */
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1600, height: 1000 },
});
const page = await context.newPage();
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
await page.goto('http://localhost:8080/avaliacao', { waitUntil: 'domcontentloaded' });
await page.locator('[role="tablist"]').first().waitFor({ timeout: 30000 });
await page.getByText('Ciclo Ativo', { exact: true }).first().waitFor({ timeout: 15000 });
await page.waitForTimeout(1500);

const dados = await page.evaluate(() => {
  const round = (n) => Math.round(n);
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { top: round(r.top), bottom: round(r.bottom), height: round(r.height), left: round(r.left), right: round(r.right), width: round(r.width) };
  };
  const badge = [...document.querySelectorAll('span')].find((e) => /Ciclo Ativo/i.test((e.textContent ?? '').trim()) && getComputedStyle(e).backgroundColor !== 'rgba(0, 0, 0, 0)');
  let card = badge;
  while (card && !getComputedStyle(card).borderRadius.startsWith('16')) card = card.parentElement;
  const cardBox = card ? box(card) : null;

  const rotulos = ['Planejamento', 'Avaliações', 'Feedbacks', 'Calibração', 'Encerramento'];
  const labels = [...card.querySelectorAll('span')]
    .filter((e) => /text-\[11px\]/.test(e.className) && rotulos.includes(e.textContent?.trim() ?? ''))
    .map((e) => ({ texto: e.textContent.trim(), box: box(e) }));

  // Marcadores: spans 22px (`h-[22px] w-[22px]`) ou 24px (`h-6 w-6`) do grid.
  const marcadores = [...card.querySelectorAll('span')]
    .filter((e) => /h-\[22px\]/.test(e.className) || /(^|\s)h-6(\s|$)/.test(e.className))
    .map((e) => ({
      box: box(e),
      bg: getComputedStyle(e).backgroundColor,
      border: getComputedStyle(e).borderTopWidth + ' ' + getComputedStyle(e).borderTopColor,
      cls: e.className,
    }));

  // Linha de conexão (2px).
  const linha = [...card.querySelectorAll('div')].filter((e) => {
    const r = e.getBoundingClientRect();
    return round(r.height) <= 3 && r.width > 20;
  });
  const linhas = linha.map((e) => ({ box: box(e), bg: getComputedStyle(e).backgroundColor, cls: e.className }));

  return { cardBox, badge: badge ? { box: box(badge), bg: getComputedStyle(badge).backgroundColor, color: getComputedStyle(badge).color } : null, labels, marcadores, linhas };
});

const fs = await import('node:fs');
fs.writeFileSync('desempenho-timeline.txt', JSON.stringify(dados, null, 2));

// Recorte do card inteiro e da timeline ampliada.
if (dados.cardBox) {
  const c = dados.cardBox;
  await page.screenshot({ path: 'desempenho-card.png', clip: { x: c.left, y: c.top, width: c.width, height: c.height } });
}
const lb = dados.labels.map((l) => l.box);
if (lb.length) {
  const x = Math.min(...lb.map((b) => b.left)) - 40;
  const y = Math.min(...lb.map((b) => b.top)) - 58;
  const width = Math.max(...lb.map((b) => b.right)) - x + 40;
  const height = Math.max(...lb.map((b) => b.bottom)) - y + 30;
  await page.screenshot({ path: 'desempenho-timeline-zoom.png', clip: { x, y, width, height } });
}

console.log(JSON.stringify(dados, null, 2));
await browser.close();
