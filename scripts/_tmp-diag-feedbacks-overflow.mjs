/**
 * TEMPORÁRIO — diagnóstico do overflow da coluna "AVALIADO POR" nos cards de
 * Feedback (Gestão de Desempenho → aba Feedbacks).
 *
 * Mede, por card: a caixa da coluna (B), a caixa do nome do avaliador, o
 * `scrollWidth` vs `clientWidth` do nome (prova de truncamento) e a caixa da
 * coluna (C) (nota/estrelas) — para provar/negar a sobreposição.
 *
 * Uso: node scripts/_tmp-diag-feedbacks-overflow.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const URL = 'http://localhost:8080/avaliacao';
const OUT_DIR = 'tmp-diag-feedbacks';
mkdirSync(OUT_DIR, { recursive: true });

const VIEWPORTS = [
  { nome: '1194', width: 1194, height: 900 },
  { nome: '1456', width: 1456, height: 900 },
  { nome: '900', width: 900, height: 1000 },
  { nome: '400', width: 400, height: 900 },
];

const browser = await chromium.launch();
const relatorio = {};
try {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      storageState: 'e2e/.auth/user.json',
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('ui-theme', 'dark');
      localStorage.setItem('dp-tour-completed', 'true');
    });
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: /Gestão de Desempenho/ }).waitFor({ timeout: 30000 });

    // Aba Feedbacks
    const aba = page.getByRole('tab', { name: /Feedbacks/i });
    await aba.click();
    await page.waitForTimeout(2500);

    const dados = await page.evaluate(() => {
      const r = (el) => (el ? el.getBoundingClientRect() : null);
      const B = (v) => (v == null ? null : Math.round(v));
      // A coluna (B) é o div que CONTÉM o <p>Avaliado por</p> como filho direto.
      const ler = (colInterna) => {
        const nome = colInterna.querySelector('span.block');
        const colB = colInterna.parentElement; // a COLUNA (B) real (216 px no desktop)
        const rb = r(colB);
        const ri = r(colInterna);
        const rn = r(nome);
        const colC = colB.nextElementSibling;
        const rc = r(colC);
        const card = colB.closest('.rounded-xl') ?? colB.parentElement;
        const cardRect = r(card);
        const cs = nome ? getComputedStyle(nome) : null;
        return {
          nome: (nome?.textContent ?? '').trim(),
          cardLargura: cardRect ? Math.round(cardRect.width) : null,
          colB: rb ? { x: B(rb.x), w: B(rb.width), right: B(rb.right) } : null,
          colInterna: ri ? { x: B(ri.x), w: B(ri.width), right: B(ri.right) } : null,
          nomeBox: rn ? { x: B(rn.x), w: B(rn.width), right: B(rn.right) } : null,
          nomeScrollW: nome ? nome.scrollWidth : null,
          nomeClientW: nome ? nome.clientWidth : null,
          truncado: nome ? nome.scrollWidth > nome.clientWidth : null,
          colC: rc ? { x: B(rc.x), w: B(rc.width), left: B(rc.left) } : null,
          // > 0 ⇒ o nome passou da borda esquerda da coluna de nota/estrelas
          invasaoColC: rn && rc ? B(rn.right - rc.left) : null,
          nomeOverflowEstilo: cs?.overflow ?? null,
          nomeTextoOverflow: cs?.textOverflow ?? null,
          nomeWhiteSpace: cs?.whiteSpace ?? null,
        };
      };
      const colunas = Array.from(document.querySelectorAll('div')).filter((d) => {
        const p = d.querySelector(':scope > p');
        return p && /^Avaliado por$/i.test((p.textContent ?? '').trim());
      });
      const antes = colunas.map(ler);
      // PROVA: injeta o nome longo reportado na PRIMEIRA coluna (só no DOM do teste).
      const alvo = colunas[0]?.querySelector('span.block');
      if (alvo) alvo.textContent = 'HOMOLOG-NB Colaborador Descartavel';
      const depois = colunas.map(ler);

      // Seletor de ciclo do topo (mesma suspeita de overflow).
      const gatilhoCiclo = document.querySelector('[role="combobox"]');
      const rg = r(gatilhoCiclo);
      const medir = (el) => {
        const rr = r(el);
        return rr
          ? {
              x: B(rr.x),
              w: B(rr.width),
              right: B(rr.right),
              texto: (el.textContent ?? '').trim().slice(0, 40),
              sw: el.scrollWidth,
              cw: el.clientWidth,
            }
          : null;
      };
      const filhos = gatilhoCiclo ? Array.from(gatilhoCiclo.querySelectorAll('span, div')) : [];
      const valorCiclo =
        gatilhoCiclo?.querySelector('div')?.querySelector('span') ?? filhos.find((e) => e.tagName === 'SPAN') ?? filhos[0];
      const cicloAntes = medir(valorCiclo);
      if (valorCiclo) valorCiclo.textContent = 'HOMOLOG-NB Ciclo Nine-Box de Avaliação Trimestral 2026';
      const cicloDepois = medir(valorCiclo);
      const ciclo = {
        gatilho: rg ? { x: B(rg.x), w: B(rg.width), right: B(rg.right) } : null,
        valorAntes: cicloAntes,
        valorDepois: cicloDepois,
        // o que o conteúdo REALMENTE gasta vs. a caixa: >0 ⇒ pinta fora do trigger
        gatilhoScrollW: gatilhoCiclo ? gatilhoCiclo.scrollWidth - gatilhoCiclo.clientWidth : null,
        gatilhoScrollH: gatilhoCiclo ? gatilhoCiclo.scrollHeight - gatilhoCiclo.clientHeight : null,
      };

      return { antes, depois, ciclo };
    });

    relatorio[vp.nome] = dados;
    await page.screenshot({ path: `${OUT_DIR}/feedbacks-${vp.nome}.png`, fullPage: false });
    await context.close();
  }
} finally {
  await browser.close();
}

writeFileSync('tmp-diag-feedbacks-overflow.json', JSON.stringify(relatorio, null, 2));
console.log(JSON.stringify(relatorio, null, 2));
