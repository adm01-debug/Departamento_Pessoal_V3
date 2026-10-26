import { chromium } from '@playwright/test';

const PASTA = 'tmp-recrutamento/padrao-admissao';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1430, height: 380 } });
await page.goto(
  `file:///C:/Users/artes03/Desktop/departamento-pessoal-v2-main/${PASTA}/lado-a-lado-preview.html`
);
await page.waitForTimeout(600);
await page.screenshot({ path: `${PASTA}/lado-a-lado-preview.jpg`, type: 'jpeg', quality: 55 });
await browser.close();
console.log('ok');
