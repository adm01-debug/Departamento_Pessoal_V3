import { chromium } from '@playwright/test';
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';

const PASTA = 'tmp-recrutamento/animacoes';
const VIDEOS = `${PASTA}/videos`;
mkdirSync(VIDEOS, { recursive: true });

const browser = await chromium.launch();

async function capturar(nome, abrir) {
  const context = await browser.newContext({
    storageState: 'e2e/.auth/user.json',
    viewport: { width: 1200, height: 800 },
    recordVideo: { dir: VIDEOS, size: { width: 1200, height: 800 } },
  });
  await context.addInitScript(() => {
    localStorage.setItem('dp-tour-completed', 'true');
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-force-motion', 'off');
  });
  const page = await context.newPage();
  page.on('pageerror', (err) => console.log(`${nome} PAGE ERROR:`, err.message));
  const video = page.video();

  await abrir(page);
  await page.waitForFunction(
    () => document.querySelector('.kanban-column-visual.kanban-em-entrada') !== null,
    undefined,
    { timeout: 25_000 }
  );

  const tempos = [
    [0, 't0'],
    [450, 't1'],
    [650, 't2'],
    [700, 't3'],
    [1000, 't4'],
  ];
  for (const [espera, rotulo] of tempos) {
    if (espera) await page.waitForTimeout(espera);
    await page.screenshot({ path: `${PASTA}/${nome}-${rotulo}.jpg`, type: 'jpeg', quality: 55 });
  }

  await page.waitForFunction(
    () => {
      const colunas = document.querySelectorAll('.kanban-column-visual');
      return (
        colunas.length > 0 &&
        document.querySelectorAll('.kanban-column-visual.kanban-coluna-concluida').length === colunas.length
      );
    },
    undefined,
    { timeout: 25_000 }
  );
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${PASTA}/${nome}-final.jpg`, type: 'jpeg', quality: 55 });

  await context.close();
  const origem = await video?.path();
  if (origem) {
    const destino = `${PASTA}/animacao-${nome}.webm`;
    try {
      renameSync(origem, destino);
    } catch {
      /* vídeo pode já estar no destino */
    }
    console.log(`${nome} VIDEO`, destino);
  }
}

await capturar('admissao', async (page) => {
  await page.goto('http://localhost:8080/admissoes', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2200);
  await page.getByRole('tab', { name: 'Kanban' }).click();
});

await capturar('recrutamento', async (page) => {
  await page.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
});

const linha = (tempo, admissao, recrutamento) => `
  <div class="linha">
    <div class="tempo">${tempo}</div>
    <figure><figcaption>ADMISSÃO</figcaption><img src="admissao-${admissao}.jpg"></figure>
    <figure><figcaption>RECRUTAMENTO</figcaption><img src="recrutamento-${recrutamento}.jpg"></figure>
  </div>`;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  body{margin:0;background:#0b1220;color:#e5e7eb;font:600 15px/1.3 system-ui,sans-serif;padding:14px}
  .linha{display:grid;grid-template-columns:70px 1fr 1fr;gap:12px;margin-bottom:14px;align-items:start}
  .tempo{padding-top:26px;color:#9ca3af;font-variant-numeric:tabular-nums}
  figure{margin:0}figcaption{padding:2px 0 6px;color:#cbd5e1}
  img{display:block;width:100%;border:1px solid #22304a;border-radius:8px}
</style></head><body>
  ${linha('t0', 't0', 't0')}
  ${linha('+0,45s', 't1', 't1')}
  ${linha('+1,1s', 't2', 't2')}
  ${linha('+1,8s', 't3', 't3')}
  ${linha('+2,8s', 't4', 't4')}
  ${linha('final', 'final', 'final')}
</body></html>`;
writeFileSync(`${PASTA}/comparativo-tempos.html`, html);

const comparador = await browser.newPage({ viewport: { width: 1100, height: 1950 } });
await comparador.goto(
  `file:///C:/Users/artes03/Desktop/departamento-pessoal-v2-main/${PASTA}/comparativo-tempos.html`
);
await comparador.waitForTimeout(900);
await comparador.screenshot({ path: `${PASTA}/comparativo-tempos.jpg`, type: 'jpeg', quality: 50 });

await browser.close();
console.log('SEQUENCIA OK');
