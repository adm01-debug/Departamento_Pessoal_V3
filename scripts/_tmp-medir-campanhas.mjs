/**
 * TEMPORÁRIO — mede a densidade do módulo Campanhas (KPIs, filtros, tabela, lateral).
 * Uso: node scripts/_tmp-medir-campanhas.mjs [largura]
 */
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

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
  const raio = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), base: Math.round(r.bottom) };
  };
  const kpiGrid = document.querySelector('[role="tablist"]')?.parentElement?.nextElementSibling;
  const kpis = Array.from(kpiGrid?.children ?? []).map((c) => ({
    titulo: (c.querySelector('p')?.textContent ?? '').trim().slice(0, 22),
    rect: raio(c),
    icone: raio(c.querySelector('span')),
    textos: Array.from(c.querySelectorAll('p')).map((p) => ({ t: (p.textContent ?? '').slice(0, 18), h: raio(p)?.h })),
  }));

  const inputBusca = document.querySelector('input[aria-label="Buscar campanhas"]');
  const barra = inputBusca?.closest('div.rounded-\\[14px\\]');
  const chips = Array.from(document.querySelectorAll('button[aria-pressed]'))
    .filter((b) => /Todos|Ativas|Finalizadas|Rascunhos/.test(b.textContent ?? ''))
    .map((b) => ({ t: (b.textContent ?? '').trim(), rect: raio(b) }));

  const secao = document.querySelector('section:has(table)') ?? document.querySelector('table')?.closest('section');
  const ths = Array.from(document.querySelectorAll('thead th')).map((t) => ({
    t: (t.querySelector('span')?.textContent ?? t.textContent ?? '').trim(),
    w: Math.round(t.getBoundingClientRect().width),
  }));
  const trs = Array.from(document.querySelectorAll('tbody tr')).map((tr) => raio(tr)?.h);
  const tdsPrimeira = Array.from(document.querySelectorAll('tbody tr:first-child td')).map((td) => raio(td));

  const lateral = secao?.parentElement?.children?.[1];
  const secoesLat = Array.from(lateral?.querySelectorAll(':scope > div > section') ?? []).map((s) => ({
    titulo: (s.querySelector('h3')?.textContent ?? '').trim(),
    rect: raio(s),
  }));

  return {
    kpis,
    barra: { rect: raio(barra), busca: raio(inputBusca), chips },
    tabela: {
      rect: raio(secao),
      thead: raio(document.querySelector('thead tr')),
      colunas: ths,
      linhas: trs,
      tdsPrimeiraLinha: tdsPrimeira,
      rodape: raio(document.querySelector('section footer')),
    },
    lateral: { rect: raio(lateral), secoes: secoesLat },
  };
});

writeFileSync(`tmp-medir-campanhas-${LARGURA}.json`, JSON.stringify(dados, null, 2));
console.log(JSON.stringify(dados, null, 2));
await browser.close();
