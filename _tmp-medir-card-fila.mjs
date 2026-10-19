/**
 * Mede a altura do card da fila "Aguardando gestor" e de cada região.
 * Uso: node _tmp-medir-card-fila.mjs
 */
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
await page.goto('http://localhost:8080/avaliacao');
await page.getByRole('tab', { name: /Feedbacks/i }).click();
await page.getByText('Avaliado por').first().waitFor({ timeout: 20000 });
await page.waitForTimeout(2200);

const medir = async (rotulo) => {
  const dados = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('div.rounded-xl')).filter((d) =>
      Array.from(d.querySelectorAll('button')).some((b) => (b.textContent ?? '').trim() === 'Ver avaliação')
    );
    const raizes = cards.filter((d) => !cards.some((o) => o !== d && d.contains(o)));
    return raizes.slice(0, 2).map((card) => {
      const caixa = card.getBoundingClientRect();
      const corpo = card.children[0];
      const cols = Array.from(corpo.children).map((col) => {
        const rc = col.getBoundingClientRect();
        return {
          w: Math.round(rc.width),
          h: Math.round(rc.height),
          itens: Array.from(col.querySelectorAll(':scope > *, :scope > div > *'))
            .slice(0, 8)
            .map((el) => ({
              tag: el.tagName.toLowerCase(),
              h: Math.round(el.getBoundingClientRect().height),
              txt: (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40),
            })),
        };
      });
      return {
        card: Math.round(caixa.height),
        corpo: Math.round(corpo.getBoundingClientRect().height),
        rodape: card.children[1] ? Math.round(card.children[1].getBoundingClientRect().height) : 0,
        cols,
      };
    });
  });
  console.log(`\n=== ${rotulo} ===`);
  console.log(JSON.stringify(dados, null, 1));
};

await medir('1440 · lista');

// Fila "Aguardando gestor"
const grupo = page.getByRole('group', { name: 'Segmentar por tipo de feedback' });
await grupo.getByRole('button', { name: /Aguardando gestor/ }).click();
await page.getByText('Gestor responsável').first().waitFor({ timeout: 20000 });
await page.waitForTimeout(1600);
await medir('1440 · fila');

await page.setViewportSize({ width: 1024, height: 1000 });
await page.waitForTimeout(1200);
await medir('1024 · fila');

await browser.close();
