import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const PASTA = 'tmp-recrutamento/animacoes';
mkdirSync(PASTA, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1440, height: 900 },
});
await context.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-force-motion', 'off');
});
const page = await context.newPage();
page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

const medirEntrada = (seletorColuna, seletorVisual) =>
  page.evaluate(
    ({ seletorColuna, seletorVisual }) => {
      const colunas = [...document.querySelectorAll(seletorColuna)];
      return colunas.map((coluna) => {
        const visual = coluna.querySelector(seletorVisual);
        const estilo = visual ? getComputedStyle(visual) : null;
        const header = visual?.querySelector('.kb-header');
        const card = visual?.querySelector('.kanban-card');
        const footer = visual?.querySelector('.kb-footer');
        const ler = (el) => {
          if (!el) return null;
          const cs = getComputedStyle(el);
          return {
            nome: cs.animationName,
            duracao: cs.animationDuration,
            delay: cs.animationDelay,
            easing: cs.animationTimingFunction,
          };
        };
        return {
          id: coluna.getAttribute('data-pipeline-coluna') ?? coluna.getAttribute('aria-label'),
          classe: visual?.className?.slice(0, 120) ?? null,
          altura: visual ? Math.round(visual.getBoundingClientRect().height) : null,
          coluna: estilo
            ? {
                nome: estilo.animationName,
                duracao: estilo.animationDuration,
                delay: estilo.animationDelay,
                easing: estilo.animationTimingFunction,
              }
            : null,
          header: ler(header),
          card: ler(card),
          footer: ler(footer),
        };
      });
    },
    { seletorColuna, seletorVisual }
  );

// ── ADMISSÃO ────────────────────────────────────────────────────────────────
await page.goto('http://localhost:8080/admissoes', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
const tAdmissao = Date.now();
await page.getByRole('tab', { name: 'Kanban' }).click();
await page.waitForFunction(
  () => document.querySelector('.kanban-column-visual.kanban-em-entrada') !== null,
  undefined,
  { timeout: 15000 }
);
console.log('ADMISSAO_START_MS', Date.now() - tAdmissao);
const admissaoInicio = await medirEntrada('.kanban-lane-slot', '.kanban-column-visual');
console.log('ADMISSAO_INICIO', JSON.stringify(admissaoInicio, null, 2));
await page.screenshot({ path: `${PASTA}/admissao-inicio.jpg`, type: 'jpeg', quality: 55 });
await page.waitForTimeout(600);
await page.screenshot({ path: `${PASTA}/admissao-meio.jpg`, type: 'jpeg', quality: 55 });
await page.waitForTimeout(700);
await page.screenshot({ path: `${PASTA}/admissao-cards.jpg`, type: 'jpeg', quality: 55 });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${PASTA}/admissao-finalizando.jpg`, type: 'jpeg', quality: 55 });
// fim da espera: garante todas concluídas
await page.waitForFunction(
  () => document.querySelectorAll('.kanban-column-visual.kanban-coluna-concluida').length >= 5,
  undefined,
  { timeout: 15000 }
);
const admissaoFim = await medirEntrada('.kanban-lane-slot', '.kanban-column-visual');
console.log('ADMISSAO_FIM', JSON.stringify(admissaoFim.map((c) => ({ id: c.id, altura: c.altura, classe: c.classe?.includes('concluida') })), null, 2));

// ── RECRUTAMENTO ────────────────────────────────────────────────────────────
await page.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(
  () => document.querySelector('.kanban-column-visual.kanban-em-entrada') !== null,
  undefined,
  { timeout: 20000 }
);
const recrutamentoInicio = await medirEntrada('[data-pipeline-coluna]', '.kanban-column-visual');
console.log('RECRUTAMENTO_INICIO', JSON.stringify(recrutamentoInicio, null, 2));
await page.screenshot({ path: `${PASTA}/recrutamento-inicio.jpg`, type: 'jpeg', quality: 55 });
await page.waitForTimeout(700);
await page.screenshot({ path: `${PASTA}/recrutamento-meio.jpg`, type: 'jpeg', quality: 55 });
await page.waitForTimeout(1400);
await page.screenshot({ path: `${PASTA}/recrutamento-cards.jpg`, type: 'jpeg', quality: 55 });
await page.waitForFunction(
  () => document.querySelectorAll('.kanban-column-visual.kanban-coluna-concluida').length >= 5,
  undefined,
  { timeout: 20000 }
);
const recrutamentoFim = await medirEntrada('[data-pipeline-coluna]', '.kanban-column-visual');
console.log('RECRUTAMENTO_FIM', JSON.stringify(recrutamentoFim.map((c) => ({ id: c.id, altura: c.altura, classe: c.classe?.includes('concluida') })), null, 2));
console.log(
  'ANIMACOES_ATIVAS_FINAL',
  await page.evaluate(
    () => document.getAnimations().filter((a) => a.playState === 'running').length
  )
);
await page.screenshot({ path: `${PASTA}/recrutamento-final.jpg`, type: 'jpeg', quality: 55 });

await browser.close();
