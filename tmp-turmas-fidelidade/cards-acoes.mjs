/**
 * TEMPORÁRIO — valida ações dos cards de turma nas três colunas.
 */
import { chromium } from '@playwright/test';

const larguras = process.argv.slice(2).map(Number);
const alvos = larguras.length ? larguras : [1600, 390];
const b = await chromium.launch();
const saida = [];

for (const width of alvos) {
  const c = await b.newContext({
    storageState: 'e2e/.auth/user.json',
    viewport: { width, height: 900 },
    permissions: ['clipboard-read', 'clipboard-write'],
  });
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
        const mr = r(menu);
        return {
          id: card.getAttribute('data-turma-card'),
          titulo: card.querySelector('[data-turma-titulo]')?.textContent?.trim(),
          temMenu: !!menu,
          botao: pr && { w: Math.round(pr.width), h: Math.round(pr.height), right: Math.round(pr.right) },
          kebab: mr && { w: Math.round(mr.width), h: Math.round(mr.height), x: Math.round(mr.x) },
          rodape: f && { w: Math.round(f.width), right: Math.round(f.right) },
          gap: pr && mr ? Math.round(mr.x - pr.right) : null,
          semSobreposicao: pr && mr ? pr.right <= mr.x + 0.5 : true,
          botaoLarguraTotalSemMenu: !menu && f && pr ? Math.abs(pr.width - f.width) <= 2 : null,
          overflowCard: card.scrollWidth - card.clientWidth,
        };
      }),
    }));
  });

  const grupos = {};
  for (const coluna of estrutura) {
    const nome = coluna.grupo;
    grupos[nome] = { cards: coluna.cards.length, menus: 0, semMenu: 0, itens: [], detalheOk: null, copia: null };
    for (const card of coluna.cards) {
      if (card.temMenu) grupos[nome].menus += 1;
      else grupos[nome].semMenu += 1;
    }

    const primeiro = p.locator(`[data-turmas-coluna="${nome}"] [data-turma-card]`).first();
    const kebab = primeiro.locator('button[aria-label^="Ações da turma"]');
    if (await kebab.count()) {
      await kebab.click();
      await p.waitForTimeout(350);
      const itens = await p.getByRole('menuitem').allInnerTexts();
      grupos[nome].itens = itens.map((t) => t.trim());
      grupos[nome].menuVazio = itens.length === 0;
      grupos[nome].semVerDetalhes = !itens.some((t) => /ver detalhes/i.test(t));
      grupos[nome].temCopiarLocal = itens.some((t) => /copiar local/i.test(t));
      await p.screenshot({ path: `tmp-turmas-fidelidade/menu-${width}-${nome}.png`, fullPage: true });
      await p.keyboard.press('Escape');
      await p.waitForTimeout(350);
    }

    const botaoPrincipal = primeiro.locator('button[aria-label^="Ver turma"]');
    if (await botaoPrincipal.count()) {
      const titulo = (await primeiro.locator('[data-turma-titulo]').innerText()).trim();
      await botaoPrincipal.click();
      await p.waitForTimeout(1700);
      const dialogo = p.getByRole('dialog');
      grupos[nome].dialogoAberto = await dialogo.isVisible();
      grupos[nome].detalheOk = (await dialogo.innerText()).includes(titulo);
      grupos[nome].titulo = titulo;
      await p.keyboard.press('Escape');
      await p.waitForTimeout(1700);
      grupos[nome].dialogoFechado = (await dialogo.count()) === 0;
    }
  }

  // Copiar local no primeiro card que oferece a ação.
  const cardCopia = p.locator('[data-turma-card]').filter({ has: p.locator('button[aria-label^="Ações da turma"]') }).first();
  if (await cardCopia.count()) {
    await cardCopia.locator('button[aria-label^="Ações da turma"]').click();
    await p.waitForTimeout(350);
    const copiar = p.getByRole('menuitem', { name: /copiar local/i });
    if (await copiar.count()) {
      await copiar.click();
      await p.waitForTimeout(600);
      let area = null;
      try {
        area = await p.evaluate(() => navigator.clipboard.readText());
      } catch (erro) {
        area = `erro: ${String(erro).slice(0, 80)}`;
      }
      grupos.copia = {
        texto: area,
        toast: (await p.locator('text=Local copiado').count()) > 0,
        dialogos: await p.getByRole('dialog').count(),
      };
    }
  }

  saida.push({ width, grupos, estrutura });
  await p.screenshot({ path: `tmp-turmas-fidelidade/cards-${width}.png`, fullPage: true });
  await c.close();
}

console.log(JSON.stringify(saida, null, 2));
await b.close();
