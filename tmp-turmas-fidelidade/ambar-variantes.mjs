import { chromium } from '@playwright/test';

const variantes = [
  { nome: 'exato-20', accent: '251 191 36', alpha: '0.20' },
  { nome: 'exato-24', accent: '251 191 36', alpha: '0.24' },
  { nome: 'ambar-245-158-11-24', accent: '245 158 11', alpha: '0.24' },
  { nome: 'gold-252-211-77-22', accent: '252 211 77', alpha: '0.22' },
];

const b = await chromium.launch();
const c = await b.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1000, height: 760 } });
await c.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-force-motion', 'on');
});
const p = await c.newPage();
await p.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1800);
await p.getByRole('tab', { name: 'Vagas', exact: true }).click();
await p.waitForTimeout(3500);
await p.evaluate((variantes) => {
  const original = document.querySelector('[data-vaga-card="mock-vaga-3"]');
  const overlay = document.createElement('div');
  overlay.style.cssText =
    'position:fixed;inset:0;z-index:99999;background:#0b121e;display:grid;grid-template-columns:repeat(2,440px);gap:16px;padding:24px;align-content:start;';
  variantes.forEach((v) => {
    const clone = original.cloneNode(true);
    clone.removeAttribute('id');
    clone.style.transform = 'none';
    clone.style.opacity = '1';
    clone.style.setProperty('--vaga-accent', v.accent);
    clone.style.setProperty('--vaga-accent-alpha', v.alpha);
    clone.style.width = '440px';
    clone.style.height = '323px';
    overlay.appendChild(clone);
  });
  document.body.appendChild(overlay);
}, variantes);
await p.waitForTimeout(300);
await p.screenshot({ path: 'tmp-turmas-fidelidade/ambar-variantes.png' });
await c.close();
await b.close();
