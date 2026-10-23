import { chromium } from '@playwright/test';
const b = await chromium.launch();
const c = await b.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1280, height: 900 } });
const p = await c.newPage();
await p.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(800);
const trechos = await p.evaluate(() => {
  const textos = [];
  for (const sheet of document.styleSheets) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of rules) {
      const texto = rule.cssText || '';
      for (const alvo of ['330px', 'min-h-\\[36px\\]', 'min-height:36px', 'min-height: 36px']) {
        const i = texto.indexOf(alvo);
        if (i >= 0) textos.push({ alvo, trecho: texto.slice(Math.max(0, i - 200), i + 250) });
      }
    }
  }
  return textos;
});
console.log(JSON.stringify(trechos, null, 2));
await b.close();
