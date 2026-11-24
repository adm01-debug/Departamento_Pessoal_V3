/**
 * TEMPORÁRIO — detecta estouro de texto na tabela/KPIs/lateral e conta os
 * registros visíveis na coluna lateral.
 * Uso: node scripts/_tmp-checa-overflow-campanhas.mjs [largura]
 */
import { chromium } from '@playwright/test';

const LARGURA = Number(process.argv[2] ?? 1440);
const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: LARGURA, height: 1000 },
});
const page = await context.newPage();
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
await page.goto('http://localhost:8080/premiacoes', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30000 });
await page.waitForTimeout(2000);

const dados = await page.evaluate(() => {
  const estouros = [];
  const varrer = (raiz, rotulo) => {
    Array.from(raiz?.querySelectorAll('p, span, button, h3, th') ?? []).forEach((el) => {
      const w = Math.round(el.getBoundingClientRect().width);
      if (w > 0 && el.scrollWidth > w + 1) {
        estouros.push(`${rotulo} · <${el.tagName.toLowerCase()}> "${(el.textContent ?? '').trim().slice(0, 30)}" ${el.scrollWidth}>${w}`);
      }
    });
  };
  varrer(document.querySelector('table'), 'tabela');
  // Contêineres flex dentro das células (ex.: botão + kebab da coluna Ações).
  Array.from(document.querySelectorAll('tbody tr:first-child td')).forEach((td, i) => {
    Array.from(td.querySelectorAll(':scope > div')).forEach((d) => {
      const w = Math.round(d.getBoundingClientRect().width);
      if (w > 0 && d.scrollWidth > w + 1) estouros.push(`celula${i} · <div> largura ${d.scrollWidth}>${w}`);
    });
  });
  const kpiTitulo = Array.from(document.querySelectorAll('p')).find((el) => el.textContent.trim() === 'Total Aprovado');
  const grid = kpiTitulo?.closest('div.grid');
  Array.from(grid?.children ?? []).forEach((c, i) => varrer(c, `kpi${i + 1}`));
  const barra = document.querySelector('input[aria-label="Buscar campanhas"]')?.closest('div.rounded-\\[14px\\]');
  varrer(barra, 'filtros');

  const lateral = document.querySelector('table')?.closest('section')?.parentElement?.children?.[1];
  varrer(lateral, 'lateral');
  const secoes = Array.from(lateral?.querySelectorAll(':scope > div > section') ?? []);
  const atividade = secoes.find((s) => /Atividade recente/i.test(s.textContent ?? ''));
  const ul = atividade?.querySelector('ul');
  const itens = Array.from(ul?.children ?? []).map((li) => Math.round(li.getBoundingClientRect().height));
  const ulRect = ul?.getBoundingClientRect();
  const ultimo = ul?.lastElementChild?.getBoundingClientRect();
  return {
    estouros,
    atividade: {
      itens: itens.length,
      alturaUl: ul ? Math.round(ulRect.height) : null,
      conteudo: ul ? ul.scrollHeight : null,
      rola: ul ? ul.scrollHeight > Math.ceil(ulRect.height) + 1 : null,
      baseUltimoItem: ultimo ? Math.round(ultimo.bottom) : null,
      baseUl: ulRect ? Math.round(ulRect.bottom) : null,
    },
    acoesVisiveis: secoes[0]?.querySelectorAll('li').length ?? 0,
    textoAtividade: Array.from(ul?.querySelectorAll('li') ?? []).map((li) => (li.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40)),
  };
});

console.log(JSON.stringify(dados, null, 2));
await browser.close();
