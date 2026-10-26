import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1440, height: 900 },
});
await context.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-force-motion', 'off');
});
const page = await context.newPage();
page.on('console', async (msg) => {
  if (msg.type() !== 'error') return;
  const texto = msg.text();
  if (!texto.includes('same key')) return;
  const valores = [];
  for (const arg of msg.args()) {
    try {
      valores.push(JSON.stringify(await arg.jsonValue()));
    } catch {
      valores.push('?');
    }
  }
  console.log('CHAVE DUPLICADA:', valores.join(' | '), '|', texto.slice(0, 160));
});
await page.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);
console.log(
  'TAGS:',
  JSON.stringify(
    await page.evaluate(() =>
      [...document.querySelectorAll('[data-candidato-card]')].map((card) => {
        const blocos = [...card.querySelectorAll('div.flex.flex-wrap.gap-1')];
        const tags = blocos.length > 1 ? [...blocos[1].querySelectorAll('span')] : [];
        return {
          id: card.getAttribute('data-candidato-card'),
          tags: tags.map((s) => s.textContent),
        };
      })
    )
  )
);
await browser.close();
