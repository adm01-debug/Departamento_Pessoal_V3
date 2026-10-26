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
  window.__eventos = [];
  document.addEventListener(
    'pointerdown',
    (e) => {
      const alvo = e.target;
      window.__eventos.push(`PD|${e.pointerType}|${alvo?.tagName}|${alvo?.getAttribute?.('aria-label') ?? ''}|prevent=${e.defaultPrevented}`);
    },
    true
  );
  document.addEventListener('click', (e) => {
    const alvo = e.target;
    const caminho = e
      .composedPath()
      .slice(0, 8)
      .map((no) => `${no.tagName ?? '?'}.${String(no.className ?? '').split(' ').slice(0, 2).join('.')}`);
    window.__eventos.push(
      `CL|${alvo?.tagName}|${alvo?.getAttribute?.('aria-label') ?? ''}|${alvo?.className?.toString().slice(0, 60)}|path=${caminho.join('>')}`
    );
  }, true);
});
const page = await context.newPage();
page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));
await page.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);

const card = page.locator('[data-pipeline-coluna="triagem"] [data-candidato-card]').first();
await card.scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
const botao = card.locator('button[aria-label^="Mais ações"]').first();
const caixa = await botao.boundingBox();
await page.evaluate(() => {
  window.__eventos = [];
});
await page.mouse.move(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2);
await page.mouse.down();
await page.waitForTimeout(400);
console.log(
  'DOWN>',
  JSON.stringify({
    expand: await botao.getAttribute('aria-expanded'),
    menus: await page.locator('[role="menu"]').count(),
    menuBox: await page.locator('[role="menu"]').boundingBox().catch(() => null),
    triggerBox: caixa,
    eventos: await page.evaluate(() => window.__eventos),
  })
);
await page.mouse.up();
await page.waitForTimeout(800);
console.log(
  'UP>',
  JSON.stringify({
    expand: await botao.getAttribute('aria-expanded'),
    menus: await page.locator('[role="menu"]').count(),
    dialogos: await page.locator('[role="dialog"]').count(),
    eventos: await page.evaluate(() => window.__eventos),
  })
);
const item = page.getByRole('menuitem', { name: 'Entrevista' });
if (await item.count()) {
  await item.click();
  await page.waitForTimeout(1200);
  console.log(
    'ITEM>',
    JSON.stringify({
      menus: await page.locator('[role="menu"]').count(),
      naEntrevista: await page
        .locator('[data-pipeline-coluna="entrevista"] [data-candidato-card="mock-candt-1"]')
        .count(),
    })
  );
}
await page.screenshot({ path: 'tmp-recrutamento/padrao-admissao/menu-mobile-final.png', type: 'jpeg', quality: 55 });
await browser.close();
