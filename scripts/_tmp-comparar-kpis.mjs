/**
 * TEMPORÁRIO — compara o padrão dimensional dos KPI cards de Desligamentos
 * (referência) com os do Hub de Premiações.
 * Uso: node scripts/_tmp-comparar-kpis.mjs [largura]
 */
import { chromium } from '@playwright/test';

const LARGURA = Number(process.argv[2] ?? 1440);
const browser = await chromium.launch();

async function medir(url, textoAncora, rotulo) {
  const context = await browser.newContext({
    storageState: 'e2e/.auth/user.json',
    viewport: { width: LARGURA, height: 1000 },
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-tour-completed', 'true');
  });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  const dados = await page.evaluate((ancora) => {
    const alvo = Array.from(document.querySelectorAll('p, span')).find(
      (el) => el.children.length === 0 && (el.textContent ?? '').trim() === ancora,
    );
    const titulo = alvo;
    const textBlock = titulo?.parentElement;
    const card = textBlock?.parentElement;
    const grid = alvo?.closest('div.grid') ?? card?.parentElement;
    const chip = card?.firstElementChild;
    const info = (el, rotulo) => {
      if (!el) return { rotulo, ausente: true };
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        rotulo,
        classe: String(el.className).slice(0, 90),
        h: Math.round(r.height),
        w: Math.round(r.width),
        padding: s.padding,
        gap: s.gap,
        fontSize: s.fontSize,
        lineHeight: s.lineHeight,
        fontWeight: s.fontWeight,
      };
    };
    const filhosText = Array.from(textBlock?.children ?? []);
    return {
      gridClasse: String(grid?.className ?? '').slice(0, 110),
      gridGap: grid ? getComputedStyle(grid).gap : null,
      gridColunas: grid ? getComputedStyle(grid).gridTemplateColumns : null,
      alturaPorCard: grid ? Array.from(grid.children).map((c) => Math.round(c.getBoundingClientRect().height)) : null,
      card: info(card, 'cartao'),
      chip: info(chip, 'icone-caixa'),
      chipIcone: info(chip?.querySelector('svg'), 'icone-glifo'),
      textBlock: info(textBlock, 'bloco-texto'),
      titulo: info(filhosText[0], 'titulo'),
      valor: info(filhosText[1], 'valor'),
      apoio: info(filhosText[2], 'apoio'),
    };
  }, textoAncora);
  await page.screenshot({ path: `tmp-kpi-${rotulo}-${LARGURA}.png` });
  await context.close();
  return dados;
}

const desp = await medir('http://localhost:8080/desligamentos', 'Total Desligamentos', 'desligamentos');
const prem = await medir('http://localhost:8080/premiacoes', 'Total Aprovado', 'premiacoes');
console.log(JSON.stringify({ desligamentos: desp, premiacoes: prem }, null, 2));
await browser.close();
