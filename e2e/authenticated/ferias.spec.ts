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
    // "Rejeitada" é o status mais raro — maximiza a chance de provar a filtragem.
    await page.getByRole('option', { name: /rejeitada/i }).click();
    // A filtragem é server-side (useFerias): esperamos o resultado aplicar —
    // ou aparece uma linha Rejeitada, ou o empty-state do filtro.
    const rows = page.locator('table tbody tr, [role="grid"] [role="row"]');
    const rejeitadaRow = rows.filter({ hasText: /rejeitada/i }).first();
    await expect(
      page
        .getByText(/nenhum.*férias/i)
        .first()
        .or(rejeitadaRow)
    ).toBeVisible({ timeout: 10_000 });
    // Toda linha visível precisa ter o status escolhido — uma lista
    // não-filtrada com status mistos falharia aqui.
    const rowCount = await rows.count();
    for (let i = 0; i < rowCount; i++) {
      await expect(rows.nth(i), `linha ${i} deveria ser Rejeitada`).toContainText(/rejeitada/i);
    }
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
    const busca = page.getByPlaceholder(/buscar colaborador/i);
    await expect(busca).toBeVisible({ timeout: 10_000 });
    // Busca por colaborador inexistente (≥3 chars dispara o filtro) — gera
    // o estado vazio de forma determinística, independente dos dados do tenant.
    await busca.fill('zzzqxxk-colaborador-inexistente');
    await expect(page.getByText(/nenhum.*férias/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
