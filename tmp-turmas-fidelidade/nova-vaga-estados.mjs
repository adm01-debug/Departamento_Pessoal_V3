/**
 * TEMPORÁRIO — captura o Nova Vaga em normal, hover e foco (glow removido).
 */
import { chromium } from '@playwright/test';
const b = await chromium.launch();
const c = await b.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1600, height: 700 } });
await c.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-force-motion', 'on');
});
const p = await c.newPage();
await p.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1600);
const botao = p.getByRole('button', { name: /Nova Vaga/i });
const caixa = await botao.boundingBox();
const clip = { x: caixa.x - 24, y: caixa.y - 24, width: caixa.width + 48, height: caixa.height + 48 };
await p.screenshot({ path: 'tmp-turmas-fidelidade/nova-vaga-normal.png', clip });
await botao.hover();
await p.waitForTimeout(350);
await p.screenshot({ path: 'tmp-turmas-fidelidade/nova-vaga-hover.png', clip });
await p.mouse.move(10, 10);
await p.waitForTimeout(250);
await botao.focus();
await p.waitForTimeout(250);
await p.screenshot({ path: 'tmp-turmas-fidelidade/nova-vaga-foco.png', clip });
console.log(JSON.stringify({ clip, caixa }));
await b.close();
