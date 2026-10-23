import { chromium } from '@playwright/test';
const b = await chromium.launch();
const c = await b.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1280, height: 900 } });
const p = await c.newPage();
await p.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1800);
await p.getByRole('tab', { name: 'Certificados' }).click();
await p.waitForTimeout(2000);
const dados = await p.evaluate(() => {
  const card = document.querySelector('[data-certificado-card]');
  const h3 = card.querySelector('h3');
  const article = card;
  return {
    articleW: article.getBoundingClientRect().width,
    articleContainer: getComputedStyle(article).containerType,
    articleContain: getComputedStyle(article).contain,
    h3Min: getComputedStyle(h3).minHeight,
    h3ParentW: h3.parentElement.getBoundingClientRect().width,
    h3ParentContainer: getComputedStyle(h3.parentElement).containerType,
    rightW: h3.parentElement.parentElement.getBoundingClientRect().width,
    rightContainer: getComputedStyle(h3.parentElement.parentElement).containerType,
    htmlClass: document.documentElement.className,
  };
});
console.log(JSON.stringify(dados, null, 2));
await b.close();
