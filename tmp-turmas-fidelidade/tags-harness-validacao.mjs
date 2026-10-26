/**
 * TEMPORÁRIO — harness isolado: valida tags coloridas, consistência por nome,
 * tag +N neutra e variação de altura real dos cards.
 */
import { chromium } from '@playwright/test';
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1600, height: 900 } });
const p = await c.newPage();
const erros = [];
p.on('pageerror', (e) => erros.push(e.message));
await p.goto('http://localhost:8080/tmp-turmas-fidelidade/vagas-harness.html', { waitUntil: 'networkidle' });
await p.waitForTimeout(1600);

const atual = await p.evaluate(() =>
  [...document.querySelectorAll('[data-vaga-card]')].map((card) => ({
    id: card.getAttribute('data-vaga-card'),
    h: Math.round(card.getBoundingClientRect().height),
    tags: [...(card.querySelector('.mt-2\\.5.flex.flex-wrap')?.children ?? [])].map((el) => {
      const cs = getComputedStyle(el);
      return {
        texto: el.textContent?.trim(),
        h: Math.round(el.getBoundingClientRect().height),
        fonte: cs.fontSize,
        pad: `${cs.paddingLeft}/${cs.paddingRight}`,
        raio: cs.borderRadius,
        textoCor: cs.color,
        fundo: cs.backgroundColor,
        borda: cs.borderTopColor,
        sombra: cs.boxShadow,
      };
    }),
  }))
);

const antigo = await p.evaluate(() => {
  for (const row of document.querySelectorAll('[data-vaga-card] .mt-2\\.5.flex.flex-wrap')) {
    row.style.marginTop = '12px';
    row.style.minHeight = '22px';
    for (const tag of row.children) {
      tag.style.height = 'auto';
      tag.style.padding = '4px 6px';
      tag.style.fontSize = '9px';
      tag.style.lineHeight = '1.25';
      tag.style.borderRadius = '6px';
    }
  }
  return [...document.querySelectorAll('[data-vaga-card]')].map((el) => Math.round(el.getBoundingClientRect().height));
});

await p.screenshot({ path: 'tmp-turmas-fidelidade/tags-harness-1600.png' });
console.log(JSON.stringify({ atual, antigo, delta: atual.map((c2, i) => c2.h - antigo[i]), erros }, null, 2));
await b.close();
