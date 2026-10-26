import { chromium, devices } from '@playwright/test';

const browser = await chromium.launch();
const pixel = devices['Pixel 5'];
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: pixel.deviceScaleFactor,
  isMobile: pixel.isMobile,
  hasTouch: pixel.hasTouch,
  userAgent: pixel.userAgent,
});
await context.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
});
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await page.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4500);

const card = page.locator('[data-pipeline-coluna="triagem"] [data-candidato-card]').first();
await card.scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
const id = await card.getAttribute('data-candidato-card');
const caixa = await card.boundingBox();
const destino = await page.locator('[data-pipeline-coluna="entrevista"] [data-pipeline-lista]').boundingBox();
const inicioX = caixa.x + 50;
const inicioY = caixa.y + 50;
const alvoX = Math.min(destino.x + 24, 370);
const alvoY = inicioY + 20;
console.log('INICIO', inicioX, inicioY, 'ALVO', alvoX, alvoY);

await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: inicioX, y: inicioY }] });
for (let i = 1; i <= 14; i += 1) {
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: inicioX + ((alvoX - inicioX) * i) / 14, y: inicioY + ((alvoY - inicioY) * i) / 14 }],
  });
  await page.waitForTimeout(24);
}
await page.waitForTimeout(300);
console.log(
  'DURANTE',
  JSON.stringify(
    await page.evaluate(() => ({
      overlay: document.querySelectorAll('[data-pipeline-arrastado]').length,
      drop: document.querySelectorAll('[data-pipeline-drop="true"]').length,
      boardScroll: document.querySelector('[data-pipeline-board]').scrollLeft,
    }))
  )
);
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await page.waitForTimeout(1200);
console.log(
  'DEPOIS',
  JSON.stringify(
    await page.evaluate((cardId) => ({
      entrevista: document.querySelectorAll(`[data-pipeline-coluna="entrevista"] [data-candidato-card="${cardId}"]`).length,
      triagem: document.querySelectorAll(`[data-pipeline-coluna="triagem"] [data-candidato-card="${cardId}"]`).length,
      boardScroll: document.querySelector('[data-pipeline-board]').scrollLeft,
    }), id)
  )
);
await browser.close();
