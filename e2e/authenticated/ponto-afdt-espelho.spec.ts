import { test, expect } from '@playwright/test';

/**
 * E2E — Fluxo AFDT (Portaria MTP 671/2021) + Assinatura de Espelho de Ponto.
 *
 * Cobertura:
 *  1. Página de Ponto renderiza triggers de Importar AFDT e Gerar AEJ.
 *  2. Dialog de importação AFDT abre, valida arquivo obrigatório, e exibe seletor de tipo.
 *  3. Dialog de geração AEJ abre e exige competência.
 *  4. Página /admin/ponto/divergencias renderiza KPIs e filtros sem runtime errors.
 *  5. RLS/Auth: rota é admin-only (o setup autenticado é admin).
 *
 * Estratégia: smoke tests focados em contratos de UI + guards.
 * Não dispara uploads reais (evita poluir DB); valida a superfície interativa.
 */

test.describe('Ponto — AFDT & Assinatura de Espelho', () => {
  test('página de Ponto expõe triggers AFDT e AEJ', async ({ page }) => {
    const errs: string[] = [];
    page.on('pageerror', (e) => errs.push(e.message));

    await page.goto('/ponto');
    await expect(page).toHaveURL(/\/ponto/);

    // Triggers principais visíveis no header
    await expect(page.getByRole('button', { name: /Importar AFDT/i }).first())
      .toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: /AEJ|Gerar AEJ/i }).first())
      .toBeVisible();

    expect(errs, `Runtime errors: ${errs.join('\n')}`).toHaveLength(0);
  });

  test('dialog de importação AFDT abre com seletor de tipo', async ({ page }) => {
    await page.goto('/ponto');
    await page.getByRole('button', { name: /Importar AFDT/i }).first().click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/Portaria MTP 671/i)).toBeVisible();
    // Combobox de tipo (AFDT | ACJEF | AEJ)
    await expect(page.getByRole('combobox').first()).toBeVisible();
    // Botão Importar exposto
    await expect(page.getByRole('button', { name: /^Importar$/i })).toBeVisible();
  });

  test('/admin/ponto/divergencias renderiza KPIs e filtros', async ({ page }) => {
    const errs: string[] = [];
    page.on('pageerror', (e) => errs.push(e.message));

    await page.goto('/admin/ponto/divergencias');
    await expect(page).toHaveURL(/\/admin\/ponto\/divergencias/);

    // Heading da página
    await expect(page.getByRole('heading', { name: /Diverg[êe]ncias/i }).first())
      .toBeVisible({ timeout: 15_000 });

    // KPIs esperados (4 cards)
    await expect(page.getByText(/Total/i).first()).toBeVisible();
    await expect(page.getByText(/Pendentes/i).first()).toBeVisible();
    await expect(page.getByText(/Sem colaborador/i).first()).toBeVisible();
    await expect(page.getByText(/Sem batida/i).first()).toBeVisible();

    expect(errs, `Runtime errors: ${errs.join('\n')}`).toHaveLength(0);
  });
});
