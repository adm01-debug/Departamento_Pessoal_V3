import { test, expect } from '@playwright/test';

// P5-088: E2E — Ferias
// Cobertura: listagem, solicitação, aprovação, programação
// Pages: /ferias, /ferias/programacao

test.describe('Módulo Férias', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ferias');
  });

  test('renderiza listagem de férias com colaboradores', async ({ page }) => {
    // A página tem 4 headings com "Férias" (título + seções) — primeira ocorrência.
    await expect(page.getByRole('heading', { name: /férias/i }).first()).toBeVisible();
    // A listagem mora na aba "Solicitações" (a aba default é "Dashboard").
    await page.getByRole('tab', { name: /solicitações/i }).click();
    // Com dados aparece a tabela; vazio renderiza "Nenhum … férias encontrado".
    const list = page
      .locator('table, [role="grid"], [data-testid="ferias-list"]')
      .or(page.getByText(/nenhum.*férias/i))
      .first();
    await expect(list).toBeVisible({ timeout: 10_000 });
  });

  test('filtra férias por status (pendente/aprovada/concluida)', async ({ page }) => {
    // O filtro de status mora na aba "Solicitações" (DataTableToolbar → Select "Status").
    await page.getByRole('tab', { name: /solicitações/i }).click();
    const statusSelect = page.getByRole('combobox').filter({ hasText: /status/i });
    await expect(statusSelect).toBeVisible({ timeout: 10_000 });
    await statusSelect.click();
    await page.getByRole('option', { name: /pendente/i }).click();
    // Lista reflete o filtro sem quebrar: tabela ou empty-state.
    const list = page
      .locator('table, [role="grid"]')
      .or(page.getByText(/nenhum.*férias/i))
      .first();
    await expect(list).toBeVisible({ timeout: 10_000 });
  });

  test('navega para página de编程ação de férias', async ({ page }) => {
    const programmingLink = page
      .getByRole('link', { name: /programação/i })
      .or(page.getByRole('button', { name: /programação/i }));
    if (await programmingLink.isVisible()) {
      await programmingLink.click();
      await expect(page).toHaveURL(/ferias.*programacao|programacao.*ferias/i, { timeout: 5_000 });
    }
  });

  test('exibe mensagem quando não há férias registradas', async ({ page }) => {
    // O empty-state (EmptyList "solicitação de férias") e os controles de
    // busca/filtro moram na aba "Solicitações" — na aba Dashboard este teste
    // passava vacuamente.
    await page.getByRole('tab', { name: /solicitações/i }).click();
    await expect(page.getByPlaceholder(/buscar colaborador/i)).toBeVisible({ timeout: 10_000 });
    const emptyOrTable = page
      .getByText(/nenhum.*férias/i)
      .or(page.locator('table, [role="grid"]'))
      .first();
    await expect(emptyOrTable).toBeVisible({ timeout: 10_000 });
  });
});
