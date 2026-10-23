/**
 * TEMPORÁRIO — mede as três faixas de cabeçalho de Turmas / Instâncias.
 * Verifica: largura da coluna, altura igual, ícone solto, contador à direita,
 * subtítulo alinhado ao título, acento de 2 px, cores por status e 8 px até o card.
 */
import { chromium } from '@playwright/test';

const larguras = process.argv.slice(2).map(Number);
const alvos = larguras.length ? larguras : [1600, 1440, 1280, 1024, 768, 390];
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
  await p.waitForTimeout(2000);

  const dados = await p.evaluate(() => {
    const r = (el) => (el ? el.getBoundingClientRect() : null);
    const cs = (el) => (el ? getComputedStyle(el) : null);
    const main = document.querySelector('main');
    return {
      overflowDoc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      overflowMain: main ? main.scrollWidth - main.clientWidth : null,
      colunas: [...document.querySelectorAll('[data-turmas-coluna]')].map((col) => {
        const h = col.querySelector('[data-turmas-cabecalho]');
        const icone = h?.querySelector('svg');
        const titulo = h?.querySelector('h2');
        const contador = h?.querySelector('[data-turmas-contador]');
        const sub = h?.querySelector('p');
        const acento = h?.querySelector('[data-turmas-acento]');
        const card = col.querySelector('[data-turma-card]');
        const hStyle = cs(h);
        const hRect = r(h);
        const cRect = r(card);
        return {
          coluna: col.getAttribute('data-turmas-coluna'),
          header: { x: Math.round(hRect.x), y: Math.round(hRect.y), w: Math.round(hRect.width), h: Math.round(hRect.height) },
          mesmaLarguraDaColuna: Math.abs(hRect.width - col.getBoundingClientRect().width) < 1,
          overflowInterno: h.scrollWidth - h.clientWidth,
          padding: `${hStyle.paddingTop}/${hStyle.paddingRight}/${hStyle.paddingBottom}/${hStyle.paddingLeft}`,
          raio: hStyle.borderTopLeftRadius,
          fundo: hStyle.backgroundColor,
          borda: hStyle.borderTopColor,
          icone: icone
            ? {
                x: Math.round(r(icone).x),
                y: Math.round(r(icone).y),
                w: Math.round(r(icone).width),
                h: Math.round(r(icone).height),
                temContainer: icone.parentElement?.tagName.toLowerCase() !== 'header',
              }
            : null,
          titulo: { x: Math.round(r(titulo).x), y: Math.round(r(titulo).y), right: Math.round(r(titulo).right) },
          contador: {
            x: Math.round(r(contador).x),
            y: Math.round(r(contador).y),
            w: Math.round(r(contador).width),
            right: Math.round(r(contador).right),
          },
          sub: { x: Math.round(r(sub).x), y: Math.round(r(sub).y) },
          acento: {
            h: Math.round(r(acento).height),
            cor: cs(acento).backgroundColor,
            largura: Math.round(r(acento).width),
          },
          gapIconeTitulo: Math.round(r(titulo).x - r(icone).right),
          gapTituloContador: Math.round(r(contador).x - r(titulo).right),
          subAlinhadoAoTitulo: Math.round(r(sub).x) === Math.round(r(titulo).x),
          gapTituloSub: Math.round(r(sub).y - r(titulo).bottom),
          contadorNaDireita: Math.abs(r(contador).right - (hRect.right - parseFloat(hStyle.paddingRight))) < 1,
          gapAteCard: card ? Math.round(cRect.y - hRect.bottom) : null,
          tituloTruncado: titulo.scrollWidth > titulo.clientWidth,
          contadorOverflow: contador.scrollWidth - contador.clientWidth,
        };
      }),
    };
  });

  saida.push({ width, ...dados });
  await p.screenshot({ path: `tmp-turmas-fidelidade/faixas-${width}.png`, fullPage: true });
  for (const chave of ['proximas', 'andamento', 'concluidas']) {
    await p
      .locator(`[data-turmas-coluna="${chave}"] [data-turmas-cabecalho]`)
      .screenshot({ path: `tmp-turmas-fidelidade/faixa-${width}-${chave}.png` });
  }
  await c.close();
}

console.log(JSON.stringify(saida, null, 2));
await b.close();
