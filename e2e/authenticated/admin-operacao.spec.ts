import { test, expect } from '@playwright/test';

/**
 * Painel Consolidado de Operação (/admin/operacao)
 * Valida que todas as 6 seções (KPIs, DLQ, Conflitos, Queries lentas,
 * Idempotência, Cron, Alertas) renderizam sem erros de runtime.
 * As RPCs são admin-only; o setup autenticado deve estar logado como admin.
 */
test.describe('Admin — Painel de Operação', () => {
  test('carrega dashboard consolidado com todas as seções', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));

    await page.goto('/admin/operacao');
    await expect(page).toHaveURL(/\/admin\/operacao/);

    // Título da página
    await expect(page.getByRole('heading', { name: /Opera[çc][ãa]o/i }).first())
      .toBeVisible({ timeout: 15_000 });

    // KPIs no topo (DLQ, Conflitos, Endpoints com falha)
    await expect(page.getByText(/DLQ.*fila morta/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Conflitos folha/i).first()).toBeVisible();
    await expect(page.getByText(/Endpoints com falha/i).first()).toBeVisible();

    // Seções principais
    await expect(page.getByText(/Dead-Letter Queue/i)).toBeVisible();
    await expect(page.getByText(/Conflitos de Concorr[êe]ncia/i)).toBeVisible();
    await expect(page.getByText(/Top 10 Queries/i)).toBeVisible();
    await expect(page.getByText(/Sa[úu]de de Idempot[êe]ncia/i)).toBeVisible();
    await expect(page.getByText(/Cron Jobs/i)).toBeVisible();
    await expect(page.getByText(/Alertas de Seguran[çc]a Ativos/i)).toBeVisible();

    // Botão global de refresh
    await expect(page.getByRole('button', { name: /Atualizar/i })).toBeVisible();

    expect(pageErrors, `Runtime errors: ${pageErrors.join('\n')}`).toHaveLength(0);
  });

  test('botão Atualizar dispara refetch sem erros', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));

    await page.goto('/admin/operacao');
    await page.getByRole('button', { name: /Atualizar/i }).click();

    // Nenhum erro de runtime após refetch
    await page.waitForTimeout(1500);
    expect(pageErrors, `Runtime errors após refetch: ${pageErrors.join('\n')}`).toHaveLength(0);
  });
});
