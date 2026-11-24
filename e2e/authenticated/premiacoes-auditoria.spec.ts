import { test, expect, type Page } from '@playwright/test';

/**
 * Regressão da nova central de auditoria de Premiações.
 * Usa o mock visual aprovado (`VITE_PREMIACOES_MOCK=true`) e não grava nada.
 */
async function abrirAuditoria(page: Page) {
  await page.goto('/premiacoes');
  await expect(page.getByRole('heading', { name: /Hub de Premiações/i })).toBeVisible();
  await page.getByRole('tab', { name: /Auditoria/i }).click();
  await expect(page.locator('[data-testid="auditoria-evento"]').first()).toBeVisible({ timeout: 20_000 });
}

test.describe('Premiações — auditoria em timeline', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('substitui KPIs/tabela pela timeline, filtra e abre detalhes', async ({ page }) => {
    await abrirAuditoria(page);

    // A composição antiga saiu da aba; os cards continuam existindo apenas nas
    // outras abas do Hub.
    await expect(page.getByText('Total Aprovado')).toHaveCount(0);
    await expect(page.getByText('Painel Gerencial de Auditoria & ROI v1.2')).toHaveCount(0);
    await expect(page.locator('table')).toHaveCount(0);

    await expect(page.getByLabel('Filtros da auditoria')).toBeVisible();
    await expect(page.getByText(/Hoje ·/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'CSV' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'PDF' })).toBeVisible();

    const busca = page.getByLabel(/Buscar evento, campanha, colaborador ou valor/i);
    await busca.fill('IRRF');
    await expect(page.getByText('Divergência identificada na conciliação').first()).toBeVisible();
    await expect(page.getByText('Campanha criada')).toHaveCount(0);

    await busca.fill('');
    await page.getByRole('button', { name: /Campanhas\s*2/ }).click();
    await expect(page.getByText('Campanha criada').first()).toBeVisible();
    await expect(page.getByText('Divergência identificada na conciliação')).toHaveCount(0);

    await page.getByRole('button', { name: /Ver detalhes/ }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Informações financeiras')).toBeVisible();
    await expect(dialog.getByText('Dados anteriores')).toBeVisible();
    await page.keyboard.press('Escape');

    await page.screenshot({ path: 'tmp-premiacoes-auditoria/e2e-auditoria-1440.png', fullPage: false });
  });

  test('os KPIs permanecem nas outras abas e somem apenas da Auditoria', async ({ page }) => {
    await page.goto('/premiacoes');
    await expect(page.getByText('Total Aprovado')).toBeVisible();
    await page.getByRole('tab', { name: /Auditoria/i }).click();
    await expect(page.getByText('Total Aprovado')).toHaveCount(0);
    await page.getByRole('tab', { name: /Campanhas/i }).click();
    await expect(page.getByText('Total Aprovado')).toBeVisible();
  });

  test('mobile reorganiza os eventos em cards verticais', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await abrirAuditoria(page);
    await expect(page.getByRole('button', { name: /Ver detalhes/ }).first()).toBeVisible();
    await page.screenshot({ path: 'tmp-premiacoes-auditoria/e2e-auditoria-390.png', fullPage: false });
  });
});
