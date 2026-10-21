/**
 * TEMPORÁRIO — verifica o Simulador ROI com "movimento reduzido" do sistema:
 *   • entrada automática respeita a preferência (vai para a altura final);
 *   • o botão "Reproduzir animação" anima mesmo assim.
 * Uso: node scripts/_tmp-roi-reduced-motion.mjs
 */
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1440, height: 900 },
  reducedMotion: 'reduce',
});
const page = await context.newPage();
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});

await page.goto('http://localhost:8080/premiacoes', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30000 });
await page.getByRole('tab', { name: /Simulador ROI/ }).click();
await page.getByText('1. Configure seu cenário').waitFor({ timeout: 15000 });
await page.waitForTimeout(1500);

const ler = () =>
  page.evaluate(() => {
    const wrap = document.querySelector('.roi-grafico');
    return {
      status: (document.querySelector('[data-testid="roi-anim-status"]')?.textContent ?? '').trim(),
      payout: Number(getComputedStyle(wrap).getPropertyValue('--roi-payout-scale') || 0),
      h: Math.round(
        document.querySelector('[data-testid="roi-bar-payout"]')?.getBoundingClientRect().height ?? 0,
      ),
    };
  });

console.log('REDUZIDO_INICIAL', JSON.stringify(await ler()));
await page.getByTestId('reproduzir-animacao').click();
const amostra = [];
for (let i = 0; i < 20; i += 1) {
  amostra.push({ t: i * 100, ...(await ler()) });
  await page.waitForTimeout(100);
}
console.log('REDUZIDO_MANUAL', JSON.stringify(amostra));
await context.close();
await browser.close();
