import { test, expect, type Page } from '@playwright/test';

/**
 * APROVAÇÃO → NINE-BOX (demonstração; nenhum dado real é gravado).
 *
 * T1/T2 aprovar coloca a pessoa na aba (pendente do RH, com nome);
 * T3 não há quadrante oficial antes da validação;
 * T4/T5 validar o Potencial libera o quadrante;
 * T6 F5 mantém; T7 as abas compartilham o mesmo estado.
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

  test('aprovado aparece no Nine-Box, RH valida e a classificação persiste', async ({ page }) => {
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

    // T2/T3 — Nine-Box pendente do RH (nome visível; sem quadrante oficial).
    await page.getByRole('tab', { name: /Nine-Box/i }).click();
    await expect(page.getByText(/Matriz Nine-Box/i).first()).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2200);
    await expect(page.getByText(/aprovada pelo gestor aguardando/i).first()).toBeVisible();
    await expect(page.getByText(new RegExp(COLAB)).first()).toBeVisible();

    await page
      .getByRole('button', { name: /Estrela — \d+ colaborador/i })
      .first()
      .click();
    const quadrante = page.getByRole('dialog');
    await expect(quadrante).toBeVisible();
    await expect(quadrante.getByText(new RegExp(COLAB))).toHaveCount(0);
    await page.keyboard.press('Escape');
    await page.screenshot({ path: `${DIR}/e2e-02-ninebox-aguardando-rh.png`, fullPage: true });

    // T4/T5 — validação do RH no modal da fila.
    await page.getByRole('tab', { name: /Feedbacks/i }).click();
    await expect(page.getByText('Avaliado por').first()).toBeVisible({ timeout: 15000 });
    await grupo.getByRole('button', { name: /Aguardando gestor/ }).click();
    await page.waitForTimeout(1000);
    await card.getByRole('button', { name: 'Ver avaliação' }).click();
    const detalhe = page.getByRole('dialog');
    await expect(detalhe).toBeVisible();
    // `evaluate(click)`: o rodapé troca de etapa no MESMO render (o botão some);
    // o clique nativo do Playwright poderia perder o elemento durante a troca.
    await detalhe
      .getByRole('button', { name: /Validar Potencial/i })
      .evaluate((el) => (el as HTMLButtonElement).click());
    await expect(page.locator('[data-sonner-toast]').first()).toContainText(/Demonstração/i);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(800);

    // T6 — Nine-Box classificado; F5 mantém.
    await page.getByRole('tab', { name: /Nine-Box/i }).click();
    await expect(page.getByText(/Matriz Nine-Box/i).first()).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2200);
    await expect(page.getByText(/aprovada pelo gestor aguardando/i).first()).toBeHidden();
    await expect(page.getByText(new RegExp(COLAB)).first()).toBeVisible();
    await page.screenshot({ path: `${DIR}/e2e-03-ninebox-validado.png`, fullPage: true });

    await page.reload();
    await page.getByRole('tab', { name: /Nine-Box/i }).click();
    await expect(page.getByText(/Matriz Nine-Box/i).first()).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2400);
    await expect(page.getByText(new RegExp(COLAB)).first()).toBeVisible();
    await expect(page.getByText(/aprovada pelo gestor aguardando/i).first()).toBeHidden();
  });
});
