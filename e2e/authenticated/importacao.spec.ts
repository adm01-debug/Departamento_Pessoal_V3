import { test, expect } from '@playwright/test';

/**
 * E2E — Fluxo de Importação em Massa (Onda 10)
 *
 * Cobre:
 *  1. Página carrega e mostra dropzone + botão de download do modelo
 *  2. Download do template modelo (.xlsx) via exceljs
 *  3. Colunas reconhecidas são exibidas
 */
test.describe('Importação em Massa (autenticado)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/importacao');
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('exibe interface de upload com dropzone e colunas reconhecidas', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /importa[cç][aã]o/i }).first()
    ).toBeVisible();

    // Dropzone
    await expect(page.getByText(/arraste ou clique para selecionar/i)).toBeVisible();
    await expect(page.getByText(/formatos.*\.xlsx.*\.csv/i)).toBeVisible();

    // Colunas reconhecidas (badges)
    for (const col of ['Nome', 'CPF', 'Email', 'Cargo', 'Salário', 'PIS']) {
      await expect(page.getByText(col, { exact: true }).first()).toBeVisible();
    }
  });

  test('baixa o template modelo em .xlsx', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /baixar modelo/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/i);
  });
});
