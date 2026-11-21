import { test, expect, type Page } from '@playwright/test';

/**
 * APROVAÇÃO → NINE-BOX (demonstração; nenhum dado real é gravado).
 *
 * Contrato atual homologado:
 *   T1/T2 — o gestor aprova a avaliação consolidada;
 *   T3/T4 — a aprovação classifica diretamente o Nine-Box (sem etapa
 *            posterior de validação do RH);
 *   T5 — a pessoa aparece no quadrante classificado;
 *   T6 — F5 mantém a classificação;
 *   T7 — as abas compartilham o mesmo estado.
 */
const DIR = 'tmp-ninebox-aprovacao';
const COLAB = 'Ana Beatriz Souza';

async function abrirFeedbacks(page: Page) {
  await page.goto('/avaliacao');
  await expect(page.getByRole('heading', { name: /Gestão de Desempenho/ })).toBeVisible();
  await page.getByRole('tab', { name: /Feedbacks/i }).click();
  await expect(page.getByText('Avaliado por').first()).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(2200);
}

test.describe('Nine-Box × aprovação', () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  test('aprovado classifica direto no Nine-Box e a classificação persiste', async ({ page }) => {
    // Papéis do cenário (a validação do Potencial é do RH).
    await page.route('**/rest/v1/rpc/get_user_roles', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(['admin', 'gestor', 'rh']),
      })
    );

    await abrirFeedbacks(page);
    // Estado demonstrativo determinístico.
    await page.evaluate(() => {
      localStorage.removeItem('dp-desempenho-demo-registros');
      localStorage.removeItem('dp-desempenho-aprovacoes-demo');
    });
    await page.reload();
    await page.getByRole('tab', { name: /Feedbacks/i }).click();
    await expect(page.getByText('Avaliado por').first()).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2400);

    const grupo = page.getByRole('group', { name: 'Segmentar por tipo de feedback' });
    const card = page.locator('[data-testid="cartao-feedback"]').filter({ hasText: COLAB }).first();
    await grupo.getByRole('button', { name: /Aguardando gestor/ }).click();
    await page.waitForTimeout(1200);

    // T1 — aprovação.
    await card.getByRole('button', { name: 'Aprovar avaliação' }).click();
    await expect(card.getByRole('status').first()).toHaveText(/Aprovada pelo gestor/i, { timeout: 15000 });

    // T2/T3 — aprovação classifica diretamente: não há pendência de RH.
    await page.getByRole('tab', { name: /Nine-Box/i }).click();
    await expect(page.getByText(/Matriz Nine-Box/i).first()).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2200);
    await expect(page.getByText(/aprovada pelo gestor aguardando/i).first()).toHaveCount(0);
    await expect(page.getByText(new RegExp(COLAB)).first()).toBeVisible();

    // T4/T5 — a pessoa aparece no quadrante classificado.
    await page
      .getByRole('button', { name: /Estrela — \d+ colaborador/i })
      .first()
      .click();
    const quadrante = page.getByRole('dialog');
    await expect(quadrante).toBeVisible();
    await expect(quadrante.getByText(new RegExp(COLAB))).toBeVisible();
    await page.keyboard.press('Escape');
    await page.screenshot({ path: `${DIR}/e2e-02-ninebox-classificado.png`, fullPage: true });

    // T6 — F5 mantém a classificação.
    await page.reload();
    await page.getByRole('tab', { name: /Nine-Box/i }).click();
    await expect(page.getByText(/Matriz Nine-Box/i).first()).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2400);
    await expect(page.getByText(new RegExp(COLAB)).first()).toBeVisible();
    await expect(page.getByText(/aprovada pelo gestor aguardando/i).first()).toHaveCount(0);
    await page.screenshot({ path: `${DIR}/e2e-03-ninebox-validado.png`, fullPage: true });
  });
});
