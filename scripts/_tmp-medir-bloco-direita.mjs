/**
 * TEMPORÁRIO — validação do ALINHAMENTO À DIREITA do bloco (Desempenho ·
 * Potencial · badge · ações) nos cards da fila, em 3 larguras e 2 ciclos.
 *
 * Mede: borda interna direita do card × borda direita das notas, do badge e da
 * última ação — e a largura da coluna (precisa ser a MESMA em todos os estados).
 * Também confere que os cards da LISTAGEM (timeline) não mudaram.
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'tmp-alinhamento-direita';
mkdirSync(OUT, { recursive: true });
const rel = {};
const browser = await chromium.launch();

const medir = (page) =>
  page.evaluate(() => {
    const dir = (el) => (el ? Number(el.getBoundingClientRect().right.toFixed(2)) : null);
    const cards = Array.from(document.querySelectorAll('div[class*="rounded-xl"]')).filter((el) =>
      /gestor responsável/i.test(el.innerText ?? '')
    );
    const linhas = cards.map((card) => {
      const selo = card.querySelector('[role="status"]');
      const coluna = selo?.parentElement ?? null;
      const notas = coluna?.querySelector(':scope > div') ?? null;
      const botoes = Array.from(card.querySelectorAll('button')).filter((b) => {
        const h = b.getBoundingClientRect().height;
        return h > 20 && h < 40;
      });
      const border = card.getBoundingClientRect().right - Number.parseFloat(getComputedStyle(card).paddingRight || '0');
      const bDir = botoes.length ? Math.max(...botoes.map((b) => b.getBoundingClientRect().right)) : null;
      const detalhe = (bloco) => {
        if (!bloco) return null;
        const filhos = Array.from(bloco.children);
        const valor = filhos[1];
        const itensValor = valor ? Array.from(valor.children) : [];
        return {
          rotulo: dir(filhos[0]),
          valor: dir(itensValor[0] ?? valor),
          seloDaFaixa: dir(itensValor[1] ?? null),
          caixa: dir(bloco),
        };
      };
      const vals = [dir(selo), dir(notas), bDir, dir(coluna)].filter((v) => v !== null);
      return {
        nome: (card.querySelector('h3')?.textContent ?? '').trim(),
        estado: (selo?.textContent ?? '').trim(),
        botoes: botoes.map((b) => (b.textContent ?? '').trim()),
        larguraColuna: coluna ? Number(coluna.getBoundingClientRect().width.toFixed(2)) : null,
        desempenho: detalhe(notas?.children[0]),
        potencial: detalhe(notas?.children[1]),
        linhaNotas: dir(notas),
        status: dir(selo),
        acoes: bDir,
        bordaInterna: Number(border.toFixed(2)),
        sobras: {
          notas: dir(notas) === null ? null : Number((border - dir(notas)).toFixed(2)),
          selo: dir(selo) === null ? null : Number((border - dir(selo)).toFixed(2)),
          acoes: bDir === null ? null : Number((border - bDir).toFixed(2)),
        },
        mesmaBordaDireita: Math.max(...vals) - Math.min(...vals) <= 1,
        passaDoCard: coluna ? Number((dir(coluna) - card.getBoundingClientRect().right).toFixed(2)) : null,
      };
    });
    const timeline = Array.from(document.querySelectorAll('div[class*="rounded-xl"]'))
      .filter((el) => !/gestor responsável/i.test(el.innerText ?? '') && /Ver feedback/i.test(el.innerText ?? ''))
      .slice(0, 3)
      .map((card) => {
        const botao = Array.from(card.querySelectorAll('button')).find((b) => /Ver feedback/i.test(b.textContent ?? ''));
        const border = card.getBoundingClientRect().right - Number.parseFloat(getComputedStyle(card).paddingRight || '0');
        return {
          nome: (card.querySelector('h3')?.textContent ?? '').trim(),
          sobraBotao: botao ? Number((border - botao.getBoundingClientRect().right).toFixed(2)) : null,
        };
      });
    return {
      larguraJanela: window.innerWidth,
      overflowDaPagina: document.documentElement.scrollWidth - document.documentElement.clientWidth > 1,
      linhas,
      timeline,
    };
  });

async function abrir({ largura }) {
  const context = await browser.newContext({
    storageState: 'e2e/.auth/user.json',
    viewport: { width: largura, height: 1000 },
  });
  await context.route('**/rest/v1/rpc/get_user_roles*', (rota) =>
    rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(['admin', 'gestor']) })
  );
  await context.addInitScript(() => localStorage.setItem('dp-tour-completed', 'true'));
  const page = await context.newPage();
  await page.goto('http://localhost:8080/avaliacao', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /Gestão de Desempenho/ }).waitFor({ timeout: 30000 });
  await page.getByRole('tab', { name: /Feedbacks/i }).click();
  await page.waitForTimeout(1400);
  return { context, page };
}

const trocarCiclo = async (page, nome) => {
  await page.locator('[role="combobox"]').first().click();
  await page.waitForTimeout(600);
  const opcoes = page.getByRole('option');
  const total = await opcoes.count();
  for (let i = 0; i < total; i += 1) {
    const t = ((await opcoes.nth(i).textContent()) ?? '').trim();
    if (t.includes(nome)) {
      await opcoes.nth(i).click();
      break;
    }
  }
  await page.waitForTimeout(2000);
};

try {
  for (const largura of [1568, 1280, 1024]) {
    const { context, page } = await abrir({ largura });
    rel[`${largura}px`] = {};
    for (const ciclo of ['Ciclo S1 2026', 'Ciclo S2 2026']) {
      await trocarCiclo(page, ciclo);
      await page
        .getByRole('group', { name: 'Segmentar por tipo de feedback' })
        .getByRole('button', { name: /Aguardando gestor/ })
        .first()
        .click();
      await page.waitForTimeout(1800);
      rel[`${largura}px`][ciclo] = await medir(page);
      await page.screenshot({ path: `${OUT}/fila-${largura}-${ciclo.replace(/\s+/g, '')}.png`, fullPage: false });
      await page
        .getByRole('group', { name: 'Segmentar por tipo de feedback' })
        .getByRole('button', { name: /Todos/ })
        .first()
        .click();
      await page.waitForTimeout(1400);
    }
    rel[`${largura}px`].timeline = (await medir(page)).timeline;
    await page.screenshot({ path: `${OUT}/lista-${largura}.png` });
    await context.close();
  }
} catch (erro) {
  rel.erro = String(erro?.message ?? erro).slice(0, 500);
  process.exitCode = 1;
} finally {
  await browser.close();
  writeFileSync(`${OUT}/medicao.json`, JSON.stringify(rel, null, 2));
  console.log(JSON.stringify(rel, null, 2).slice(0, 8000));
}
