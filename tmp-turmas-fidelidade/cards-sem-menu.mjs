/**
 * TEMPORÁRIO — cards sem menu contextual: só “Ver turma” em toda a largura.
 */
import { chromium } from '@playwright/test';

const larguras = process.argv.slice(2).map(Number);
const alvos = larguras.length ? larguras : [1600, 390];
const b = await chromium.launch();
const saida = [];

for (const width of alvos) {
  const c = await b.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width, height: 900 } });
  await c.addInitScript(() => {
    localStorage.setItem('dp-tour-completed', 'true');
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-force-motion', 'on');
  });
  const p = await c.newPage();
  await p.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1800);
  await p.getByRole('tab', { name: 'Turmas' }).click();
  await p.waitForTimeout(2200);

  const estrutura = await p.evaluate(() => {
    const r = (el) => (el ? el.getBoundingClientRect() : null);
    return [...document.querySelectorAll('[data-turmas-coluna]')].map((col) => ({
      grupo: col.getAttribute('data-turmas-coluna'),
      cards: [...col.querySelectorAll('[data-turma-card]')].map((card) => {
        const footer = card.querySelector('[data-turma-rodape]');
        const principal = footer?.querySelector('button[aria-label^="Ver turma"]');
        const menu = footer?.querySelector('button[aria-label^="Ações da turma"]');
        const f = r(footer);
        const pr = r(principal);
        return {
          id: card.getAttribute('data-turma-card'),
          titulo: card.querySelector('[data-turma-titulo]')?.textContent?.trim(),
          temMenu: !!menu,
          botaoW: pr ? Math.round(pr.width) : null,
          rodapeW: f ? Math.round(f.width) : null,
          diferenca: pr && f ? Math.round(f.width - pr.width) : null,
          altura: pr ? Math.round(pr.height) : null,
          raio: principal ? getComputedStyle(principal).borderRadius : null,
          overflow: card.scrollWidth - card.clientWidth,
        };
      }),
    }));
  });

  const semCopiarLocal = await p.evaluate(() => !document.body.innerText.includes('Copiar local'));
  const grupos = {};
  for (const coluna of estrutura) {
    const primeiro = p.locator(`[data-turmas-coluna="${coluna.grupo}"] [data-turma-card]`).first();
    const titulo = (await primeiro.locator('[data-turma-titulo]').innerText()).trim();
    await primeiro.locator('button[aria-label^="Ver turma"]').click();
    await p.waitForTimeout(1700);
    const dialogo = p.getByRole('dialog');
    grupos[coluna.grupo] = {
      titulo,
      dialogoAberto: await dialogo.isVisible(),
      detalheOk: (await dialogo.innerText()).includes(titulo),
    };
    await p.keyboard.press('Escape');
    await p.waitForTimeout(1700);
    grupos[coluna.grupo].fechou = (await dialogo.count()) === 0;
  }

  saida.push({ width, semCopiarLocal, estrutura, grupos });
  await p.screenshot({ path: `tmp-turmas-fidelidade/sem-menu-${width}.png`, fullPage: true });
  await c.close();
}

console.log(JSON.stringify(saida, null, 2));
await b.close();
