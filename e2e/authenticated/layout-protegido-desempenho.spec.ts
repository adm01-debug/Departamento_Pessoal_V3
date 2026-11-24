import { test, expect, type Page } from '@playwright/test';

/**
 * ============================================================================
 * GUARDA DE LAYOUT — GESTÃO DE DESEMPENHO · aba Feedbacks (ÁREA PROTEGIDA)
 * ============================================================================
 *
 * Regressão que este teste impede (defeito real já reportado): um nome LONGO de
 * avaliador (ex.: `HOMOLOG-NB Colaborador Descartavel`) crescia a coluna
 * "AVALIADO POR" além dos 216 px reservados e o texto passava POR CIMA da
 * coluna de nota/estrelas/badge. Mesmo defeito no seletor de ciclo do topo, cujo
 * nome longo quebrava em duas linhas dentro de um trigger `h-11`.
 *
 * O teste mede o DOM real (sem pixel-diff, para não falhar por rendering):
 *   • o nome do avaliador NUNCA cruza a borda esquerda da coluna de nota;
 *   • nome longo É truncado (scrollWidth > clientWidth) e não empurra nada;
 *   • o seletor de ciclo não transborda (scrollWidth/scrollHeight == caixa);
 *   • a faixa de abas continua com os seis rótulos, sem sobrepor o seletor;
 *   • os controles aprovados (Editar feedback, menu, Novo Ciclo) continuam lá.
 *
 * Todas as medições com nome longo são feitas com o texto INJETADO apenas no DOM
 * do navegador — nenhum dado é gravado.
 */

const ABA_FEEDBACKS = /Feedbacks/i;
const NOME_LONGO = 'HOMOLOG-NB Colaborador Descartavel';
const CICLO_LONGO = 'HOMOLOG-NB Ciclo Nine-Box de Avaliação Trimestral 2026';

/** Geometria das colunas do card, medida no DOM real. */
async function medirCards(page: Page) {
  return page.evaluate(() => {
    // O card canônico tem DUAS caixas de responsável ("Gestor responsável" e
    // "Avaliado por"): a âncora é o parágrafo "Avaliado por" — a sua caixa
    // interna é o pai e a coluna é o avô (largura 216 px contratada).
    const rotulos = Array.from(document.querySelectorAll('p')).filter((p) => p.textContent?.trim() === 'Avaliado por');
    return rotulos.map((p) => {
      const colInterna = p.parentElement!;
      const colB = colInterna.parentElement!;
      const nome = p.nextElementSibling?.querySelector('span.block') ?? null;
      const colC = colB.nextElementSibling;
      const rb = colB.getBoundingClientRect();
      const rn = nome?.getBoundingClientRect();
      const rc = colC?.getBoundingClientRect();
      return {
        nome: (nome?.textContent ?? '').trim(),
        colB: { left: rb.left, width: rb.width },
        nomeRight: rn ? rn.right : null,
        nomeScrollW: nome?.scrollWidth ?? null,
        nomeClientW: nome?.clientWidth ?? null,
        colCLeft: rc ? rc.left : null,
        colCWidth: rc ? rc.width : null,
      };
    });
  });
}

test.describe('Layout protegido — Gestão de Desempenho / Feedbacks', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  const abrirFeedbacks = async (page: Page) => {
    await page.goto('/avaliacao');
    await expect(page.getByRole('heading', { name: /Gestão de Desempenho/ })).toBeVisible();
    await page.getByRole('tab', { name: ABA_FEEDBACKS }).click();
    await expect(page.getByText('Avaliado por').first()).toBeVisible({ timeout: 15000 });
    // Deixa a coreografia de entrada terminar (expansão + cascata ≈ 0,9 s + atrasos).
    await page.waitForTimeout(2500);
  };

  test('a coluna "Avaliado por" respeita os 216px e nunca invade a nota/estrelas', async ({ page }) => {
    await abrirFeedbacks(page);
    const cards = await medirCards(page);
    expect(cards.length).toBeGreaterThan(0);

    for (const c of cards) {
      // Largura contratada da coluna de origem (216 px) e da coluna de
      // resultados (230 px — a MESMA na lista e na fila "Aguardando gestor").
      expect(c.colB.width, `coluna "Avaliado por" de "${c.nome}"`).toBeCloseTo(216, 0);
      expect(c.colCWidth, 'coluna de resultados').toBeCloseTo(230, 0);
      // O nome termina ANTES da coluna de nota começar.
      expect(c.nomeRight!, `nome "${c.nome}" invadiu a coluna de nota`).toBeLessThanOrEqual(c.colCLeft! + 0.5);
    }
  });

  test('nome longo de avaliador é truncado dentro da coluna (sem sobreposição)', async ({ page }) => {
    await abrirFeedbacks(page);

    const antes = await medirCards(page);
    expect(antes.length).toBeGreaterThan(0);

    await page.evaluate((nome) => {
      const rotulos = Array.from(document.querySelectorAll('p')).filter(
        (p) => p.textContent?.trim() === 'Avaliado por'
      );
      const alvo = rotulos[0]?.nextElementSibling?.querySelector('span.block');
      if (alvo) alvo.textContent = nome;
    }, NOME_LONGO);
    await page.waitForTimeout(300);

    const depois = await medirCards(page);
    const alvo = depois[0];
    expect(alvo.nome).toBe(NOME_LONGO);
    // A coluna NÃO cresce por causa do nome.
    expect(alvo.colB.width).toBeLessThanOrEqual(217);
    // O truncamento acontece de fato (reticências)…
    expect(alvo.nomeScrollW!).toBeGreaterThan(alvo.nomeClientW!);
    // …e nada cruza para a coluna de nota.
    expect(alvo.nomeRight!).toBeLessThanOrEqual(alvo.colCLeft! + 0.5);
  });

  test('seletor de ciclo não transborda com nome longo (chrome da área)', async ({ page }) => {
    await page.goto('/avaliacao');
    await expect(page.getByRole('heading', { name: /Gestão de Desempenho/ })).toBeVisible();

    await page.evaluate((nome) => {
      const gatilho = document.querySelector('[role="combobox"]');
      const span = gatilho?.querySelector('div')?.querySelector('span');
      if (span) span.textContent = nome;
    }, CICLO_LONGO);
    await page.waitForTimeout(300);

    const medidas = await page.evaluate(() => {
      const t = document.querySelector('[role="combobox"]') as HTMLElement | null;
      if (!t) return null;
      const valor = t.querySelector('div > span') as HTMLElement | null;
      return {
        scrollW: t.scrollWidth - t.clientWidth,
        scrollH: t.scrollHeight - t.clientHeight,
        altura: t.getBoundingClientRect().height,
        valorScrollW: valor?.scrollWidth ?? null,
        valorClientW: valor?.clientWidth ?? null,
      };
    });

    expect(medidas).not.toBeNull();
    // Nada pinta fora da caixa do trigger…
    expect(medidas!.scrollW).toBeLessThanOrEqual(1);
    expect(medidas!.scrollH).toBeLessThanOrEqual(1);
    // …e o trigger mantém a altura aprovada (h-11 = 44 px)…
    expect(medidas!.altura).toBeCloseTo(44, 0);
    // …com o nome truncado (reticências), não quebrado em linhas.
    expect(medidas!.valorScrollW!).toBeGreaterThan(medidas!.valorClientW!);
  });

  test('faixa de abas, ações e modais aprovados continuam no lugar', async ({ page }) => {
    await abrirFeedbacks(page);

    // Os seis rótulos da faixa de abas seguem existindo.
    for (const rotulo of ['Ciclos', 'Metas & OKRs', 'Feedbacks', 'PDI', 'Nine-Box', 'Auditoria']) {
      await expect(page.getByRole('tab', { name: new RegExp(rotulo, 'i') }).first()).toBeVisible();
    }

    // A faixa de abas não é sobreposta pelo seletor de ciclo.
    const folga = await page.evaluate(() => {
      const tablist = document.querySelector('[role="tablist"]');
      const gatilho = document.querySelector('[role="combobox"]');
      if (!tablist || !gatilho) return null;
      return gatilho.getBoundingClientRect().left - tablist.getBoundingClientRect().right;
    });
    expect(folga).not.toBeNull();
    expect(folga!).toBeGreaterThan(-1);

    // Controles aprovados seguem presentes…
    await expect(page.getByRole('button', { name: 'Editar feedback' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Novo Ciclo/i }).first()).toBeVisible();

    // …e "Editar feedback" continua abrindo o formulário existente (contrato preservado).
    await page.getByRole('button', { name: 'Editar feedback' }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
  });

  /* ── SUBABA "AGUARDANDO GESTOR" (fluxo de aprovação) ─────────────────────
     Alteração visual AUTORIZADA nesta tarefa: a segunda visualização interna
     da aba Feedbacks. O teste fixa o contrato dela sem tocar na primeira. */
  test('subaba "Aguardando gestor" mostra a fila de aprovação e o contador dinâmico', async ({ page }) => {
    await abrirFeedbacks(page);

    // A aba tem UMA ÚNICA linha de chips coloridos, e ela carrega o novo
    // recorte AO LADO das categorias (Todos, Gestor, Pares, Autoavaliação).
    const linhaChips = page.getByRole('group', { name: 'Segmentar por tipo de feedback' });
    await expect(linhaChips).toHaveCount(1);
    await expect(linhaChips.getByRole('button')).toHaveCount(5);

    const chipAguardando = linhaChips.getByRole('button', { name: /Aguardando gestor/ });
    const chipTodos = linhaChips.getByRole('button', { name: /Todos/ });
    await expect(chipAguardando).toBeVisible();
    await expect(chipTodos).toBeVisible();

    // O contador da nova aba é DINÂMICO (vem do dado, não é rótulo fixo).
    const textoChip = (await chipAguardando.textContent()) ?? '';
    const contador = Number((textoChip.match(/(\d+)/) ?? [])[1] ?? NaN);
    expect(Number.isFinite(contador)).toBe(true);

    // A visualização aprovada ("Avaliações") continua exatamente como era.
    await expect(page.getByText('AVALIADO POR').first()).toBeVisible();

    // Troca para a fila de aprovação.
    await chipAguardando.click();
    await expect(page.getByText('Gestor responsável').first()).toBeVisible({ timeout: 15000 });

    // Campos exigidos pelo fluxo: ciclo, gestor, desempenho, potencial, status e ação.
    await expect(page.getByText('Desempenho').first()).toBeVisible();
    await expect(page.getByText('Potencial').first()).toBeVisible();
    await expect(page.getByRole('status').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ver avaliação' }).first()).toBeVisible();

    // "Ver avaliação" reusa o MESMO modal de detalhe do módulo.
    await page.getByRole('button', { name: 'Ver avaliação' }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');

    // Em demonstração a fila OPERA sobre o armazenamento local: o aviso
    // identifica que as decisões ficam SALVAS LOCALMENTE (nada é enviado ao
    // banco e os mocks permanecem intactos).
    await expect(page.getByText(/salvas LOCALMENTE/i)).toBeVisible();

    // "Todos" devolve a listagem normal de avaliações (com Editar feedback).
    await chipTodos.click();
    await expect(page.getByText('AVALIADO POR').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Editar feedback' }).first()).toBeVisible();
  });
});
