import { chromium } from '@playwright/test';
const b = await chromium.launch();
for (const [width, height] of [
  [1024, 768],
  [768, 1024],
  [390, 844],
]) {
  const c = await b.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width, height } });
  await c.addInitScript(() => {
    localStorage.setItem('dp-tour-completed', 'true');
    localStorage.setItem('ui-theme', 'dark');
  });
  const p = await c.newPage();
  await p.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1800);
  const antes = await p.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    return [...document.querySelectorAll('body *')]
      .filter((el) => el.getBoundingClientRect().right > vw + 1)
      .slice(0, 8)
      .map((el) => ({
        tag: el.tagName,
        cls: (el.className || '').toString().slice(0, 70),
        right: Math.round(el.getBoundingClientRect().right),
      }));
  });
  await p.getByRole('tab', { name: 'Turmas' }).click();
  await p.waitForTimeout(1800);
  const depois = await p.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    return [...document.querySelectorAll('body *')]
      .filter((el) => el.getBoundingClientRect().right > vw + 1)
      .slice(0, 8)
      .map((el) => ({
        tag: el.tagName,
        cls: (el.className || '').toString().slice(0, 70),
        right: Math.round(el.getBoundingClientRect().right),
      }));
  });
  console.log(JSON.stringify({ width, antes, depois }, null, 2));
  await c.close();
}
await b.close();
