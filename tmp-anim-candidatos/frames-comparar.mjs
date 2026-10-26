import { chromium } from '@playwright/test';

const AUTO_SCROLL = () => {
  new MutationObserver(() => {
    if (window.__rolou) return;
    const tabela = document.querySelector('table');
    if (tabela && tabela.querySelector('tbody tr')) {
      window.__rolou = true;
      tabela.scrollIntoView({ block: 'center' });
    }
  }).observe(document, { childList: true, subtree: true });
};

const browser = await chromium.launch();
async function abrir() {
  const c = await browser.newContext({
    storageState: 'e2e/.auth/user.json',
    viewport: { width: 1440, height: 900 },
  });
  await c.addInitScript(() => {
    localStorage.setItem('dp-tour-completed', 'true');
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-force-motion', 'on');
  });
  await c.addInitScript(AUTO_SCROLL);
  const p = await c.newPage();
  p.setDefaultTimeout(60000);
  return { c, p };
}

async function sequencia(page, prefixo) {
  await page.locator('table tbody tr').first().waitFor({ state: 'attached' });
  const tempos = [0, 250, 500, 750, 1000, 1500];
  let anterior = 0;
  for (const tempo of tempos) {
    await page.waitForTimeout(tempo - anterior);
    anterior = tempo;
    await page.screenshot({ path: `tmp-anim-candidatos/${prefixo}-${String(tempo).padStart(4, '0')}ms.png` });
  }
}

const ref = await abrir();
await ref.p.goto('http://localhost:8080/desligamentos', { waitUntil: 'domcontentloaded' });
await sequencia(ref.p, 'frames-desligamentos');
await ref.c.close();

const dst = await abrir();
await dst.p.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
await dst.p.getByRole('tab', { name: 'Candidatos', exact: true }).click();
await sequencia(dst.p, 'frames-candidatos');
await dst.c.close();

console.log('frames gerados');
await browser.close();
