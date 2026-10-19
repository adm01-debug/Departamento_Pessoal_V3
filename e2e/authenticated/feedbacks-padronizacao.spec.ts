import { test, expect, type Page } from '@playwright/test';

/**
 * ============================================================================
 * FEEDBACKS — FILTROS NORMAIS × FILA DO GESTOR, ALTURA E EDIÇÃO.
 *
 * Contrato protegido por este spec:
 *   1. filtros normais (Todos/Gestor/Pares/Autoavaliação/Subordinado):
 *      **somente** `Editar feedback` por card — nenhum controle de aprovação;
 *   2. fila "Aguardando gestor": `Ver avaliação` · `Devolver` · `Aprovar`
 *      (e as ações de RH quando aplicáveis), com a prévia dos textos;
 *   3. cards compactos (altura pelo conteúdo) e sem sobreposição em 1440/1024;
 *   4. edição abre o formulário EXISTENTE preenchido, salva, atualiza o card e
 *      persiste após F5 (demonstração) — sem tocar no Supabase.
 *
 * Capturas em `tmp-feedbacks-edicao/`.
 * ============================================================================
 */

const DIR = 'tmp-feedbacks-edicao';

const ACOES_APROVACAO = ['Ver avaliação', 'Devolver para correção', 'Aprovar avaliação', 'Enviar ao gestor'];

async function abrirFeedbacks(page: Page) {
  await page.goto('/avaliacao');
  await expect(page.getByRole('heading', { name: /Gestão de Desempenho/ })).toBeVisible();
  await page.getByRole('tab', { name: /Feedbacks/i }).click();
  await expect(page.getByText('Avaliado por').first()).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(2200);
}

/** Cards da visualização atual, com rótulos das regiões e ações visíveis. */
async function lerCards(page: Page) {
  return page.evaluate(() => {
    const texto = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
    const candidatos = Array.from(document.querySelectorAll('div.rounded-xl')).filter((d) =>
      Array.from(d.querySelectorAll('p')).some((p) => texto(p) === 'Avaliado por')
    );
    const raizes = candidatos.filter((d) => !candidatos.some((o) => o !== d && d.contains(o)));
    return raizes.map((card) => {
      const r = card.getBoundingClientRect();
      const corpo = card.children[0];
      const rodape = card.children[1];
      return {
        colaborador: texto(card.querySelector('h3')),
        altura: Math.round(r.height),
        corpo: corpo ? Math.round(corpo.getBoundingClientRect().height) : 0,
        rodape: rodape ? Math.round(rodape.getBoundingClientRect().height) : 0,
        regioes: Array.from(card.querySelectorAll('p')).map(texto),
        acoes: Array.from(card.querySelectorAll('button'))
          .map((b) => texto(b))
          .filter((t) => t && t !== ''),
        largura: Math.round(r.width),
      };
    });
  });
}

const chip = (page: Page, nome: RegExp) =>
  page.getByRole('group', { name: 'Segmentar por tipo de feedback' }).getByRole('button', { name: nome });

test.describe('Feedbacks — filtros normais × fila', () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  test('filtros normais: cada card tem SOMENTE "Editar feedback"', async ({ page }) => {
    await abrirFeedbacks(page);

    for (const tipo of ['Todos', 'Gestor', 'Pares', 'Autoavaliação']) {
      await chip(page, new RegExp(`^${tipo}`))
        .first()
        .click();
      await page.waitForTimeout(900);

      const cards = await lerCards(page);
      if (cards.length === 0) continue;

      cards.forEach((c) => {
        expect(c.acoes, `ações do card em "${tipo}"`).toContain('Editar feedback');
        ACOES_APROVACAO.forEach((acao) =>
          expect(c.acoes, `"${acao}" não pode aparecer em "${tipo}"`).not.toContain(acao)
        );
      });

      await page.screenshot({ path: `${DIR}/filtro-${tipo}.png`, fullPage: true });
    }

    // "Subordinados, quando disponível" — filtro de TIPO (não há chip próprio):
    // mesma regra: somente Editar feedback.
    await chip(page, /^Todos/)
      .first()
      .click();
    await page.getByRole('combobox', { name: 'Tipo' }).click();
    await page.getByRole('option', { name: 'Subordinado' }).click();
    await page.waitForTimeout(900);
    const subordinados = await lerCards(page);
    subordinados.forEach((c) => {
      expect(c.acoes).toContain('Editar feedback');
      ACOES_APROVACAO.forEach((acao) => expect(c.acoes).not.toContain(acao));
    });
    await page.screenshot({ path: `${DIR}/filtro-Subordinado.png`, fullPage: true });
  });

  test('fila do gestor: Ver/Devolver/Aprovar, textos e altura compacta', async ({ page }) => {
    await abrirFeedbacks(page);
    await chip(page, /Aguardando gestor/).click();
    await page.getByText('Gestor responsável').first().waitFor();
    await page.waitForTimeout(1600);

    const cards = await lerCards(page);
    expect(cards.length).toBeGreaterThan(0);

    cards.forEach((c) => {
      // A edição NÃO pertence à fila.
      expect(c.acoes).not.toContain('Editar feedback');
      ['Ver avaliação', 'Devolver para correção', 'Aprovar avaliação'].forEach((acao) =>
        expect(c.acoes, `"${acao}" ausente na fila`).toContain(acao)
      );
      // Altura acompanha o conteúdo (sem min-height/estiramento artificial).
      expect(c.altura, `card de ${c.colaborador} alto demais`).toBeLessThanOrEqual(270);
      expect(c.corpo).toBeLessThanOrEqual(c.altura);
    });

    // Prévia dos textos no card do gestor (uma linha por seção).
    const comTexto = cards.find((c) => c.regioes.some((t) => t.startsWith('Fortes:')));
    expect(comTexto, 'nenhum card com prévia de texto').toBeTruthy();
    ['Fortes:', 'Melhoria:', 'Comentários:'].forEach((rotulo) => {
      expect(comTexto!.regioes.some((t) => t.startsWith(rotulo))).toBe(true);
    });
    await page.screenshot({ path: `${DIR}/fila-1440.png`, fullPage: true });

    await page.setViewportSize({ width: 1024, height: 1000 });
    await page.waitForTimeout(1200);
    const cards1024 = await lerCards(page);
    cards1024.forEach((c) => expect(c.altura, `card 1024 de ${c.colaborador}`).toBeLessThanOrEqual(270));
    await page.screenshot({ path: `${DIR}/fila-1024.png`, fullPage: true });
  });

  test('edição: abre preenchida, salva, atualiza o card e persiste após F5', async ({ page }) => {
    await abrirFeedbacks(page);
    await chip(page, /^Todos/)
      .first()
      .click();
    await page.waitForTimeout(900);

    const antes = await lerCards(page);
    expect(antes.length).toBeGreaterThan(0);
    const alvo = antes[0];
    const marcador = `Ajuste ${Date.now()}`;

    const card = page.locator('div.rounded-xl', { has: page.getByRole('heading', { name: alvo.colaborador }) }).first();
    await card.getByRole('button', { name: 'Editar feedback' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Editar feedback').first()).toBeVisible();

    // Formulário EXISTENTE preenchido com os dados originais.
    const textareas = dialog.locator('textarea');
    await expect(textareas).toHaveCount(3);
    await expect(dialog.getByRole('button', { name: 'Salvar alterações' })).toBeEnabled();
    await page.screenshot({ path: `${DIR}/edicao-form-preenchido.png`, fullPage: true });

    await textareas.nth(2).fill(marcador);
    await dialog.getByRole('button', { name: 'Salvar alterações' }).click();
    await expect(dialog).toBeHidden({ timeout: 15000 });

    await expect(card.getByText(marcador, { exact: false })).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: `${DIR}/edicao-apos-salvar.png`, fullPage: true });

    // F5 → o valor continua (demonstração persiste localmente).
    await page.reload();
    await page.getByRole('tab', { name: /Feedbacks/i }).click();
    await expect(page.getByText('Avaliado por').first()).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2400);
    const cardAposF5 = page
      .locator('div.rounded-xl', { has: page.getByRole('heading', { name: alvo.colaborador }) })
      .first();
    await expect(cardAposF5.getByText(marcador, { exact: false })).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: `${DIR}/edicao-apos-F5.png`, fullPage: true });
  });

  test('admin aprova em ciclos/tipos distintos (concluído, PAR e sem gestor) e persiste', async ({ page }) => {
    await abrirFeedbacks(page);
    // Estado demonstrativo determinístico (nenhum dado real é tocado).
    await page.evaluate(() => {
      localStorage.removeItem('dp-desempenho-demo-registros');
      localStorage.removeItem('dp-desempenho-aprovacoes-demo');
    });
    await page.reload();
    await page.getByRole('tab', { name: /Feedbacks/i }).click();
    await expect(page.getByText('Avaliado por').first()).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2400);
    await chip(page, /Aguardando gestor/).click();
    await page.waitForTimeout(1400);

    const contador = async () => {
      const t = (await chip(page, /Aguardando gestor/).textContent()) ?? '';
      return Number((t.match(/(\d+)\s*$/)?.[1] ?? '-1').toString());
    };
    const cardDe = (nome: string) => page.locator('[data-testid="cartao-feedback"]').filter({ hasText: nome }).first();

    expect(await contador()).toBeGreaterThan(0);

    // (A) Gestor vinculado (ciclo atual, tipo gestor) — admin tem escopo de tenant.
    const vinculado = cardDe('William Nunes Cardoso');
    await expect(vinculado.getByRole('button', { name: 'Aprovar avaliação' })).toBeEnabled();
    await vinculado.getByRole('button', { name: 'Aprovar avaliação' }).click();
    await expect(vinculado.getByRole('status').first()).toHaveText(/Aprovada pelo gestor/i, { timeout: 15000 });

    // (B) PAR concluído SEM gestor vinculado — mesma regra, sem bloquear pelo tipo.
    const orfao = cardDe('Lucas Gabriel Fernandes');
    await expect(orfao.getByRole('button', { name: 'Aprovar avaliação' })).toBeEnabled();
    await orfao.getByRole('button', { name: 'Aprovar avaliação' }).click();
    await expect(orfao.getByRole('status').first()).toHaveText(/Aprovada pelo gestor/i, { timeout: 15000 });

    // Nada é gravado no Supabase: a confirmação é explicitamente demonstrativa.
    await expect(page.locator('[data-sonner-toast]').first()).toContainText(/Demonstração/i);
    await page.screenshot({ path: `${DIR}/aprovacao-todos-os-tipos.png`, fullPage: true });

    // F5 → decisões locais persistem e o contador da fila diminuiu 2.
    const apos = await contador();
    await page.reload();
    await page.getByRole('tab', { name: /Feedbacks/i }).click();
    await expect(page.getByText('Avaliado por').first()).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2400);
    await chip(page, /Aguardando gestor/).click();
    await page.waitForTimeout(1400);
    await expect(cardDe('William Nunes Cardoso').getByRole('status').first()).toHaveText(/Aprovada pelo gestor/i);
    await expect(cardDe('Lucas Gabriel Fernandes').getByRole('status').first()).toHaveText(/Aprovada pelo gestor/i);
    expect(await contador()).toBe(Math.max(0, apos));
  });
});
