import { test, expect } from '@playwright/test';

/**
 * Valida que um usuário SEM role `admin` é bloqueado ao acessar rotas
 * administrativas — o AdminRoute deve renderizar "Acesso Restrito"
 * em vez do conteúdo protegido.
 */
const rotasAdmin = ['/admin/telemetria'];

test.describe('RBAC — bloqueio de rotas admin para usuário comum', () => {
  for (const rota of rotasAdmin) {
    test(`usuário não-admin recebe "Acesso Restrito" em ${rota}`, async ({ page }) => {
      await page.goto(rota);

      // AdminRoute renderiza o card de acesso negado (permanece autenticado, não redireciona)
      await expect(page.getByRole('heading', { name: /acesso restrito/i })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText(/não possui permissão/i)).toBeVisible();

      // As roles chegam de forma assíncrona (AuthContext marca pronto com ['user'] e
      // enriquece depois): reconfirma o bloqueio depois que a rede assentar, senão o
      // teste passa por corrida mesmo quando a conta vê a página admin.
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: /acesso restrito/i })).toBeVisible();
      await expect(page.getByRole('heading', { name: /telemetria de queries/i })).toHaveCount(0);

      // Não deve haver conteúdo administrativo carregado
      expect(page.url()).toContain(rota);
    });
  }

  test('usuário não-admin acessa /dashboard normalmente (não é bloqueio geral)', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
    expect(page.url()).toContain('/dashboard');
    // Não deve mostrar "Acesso Restrito" em rota comum
    await expect(page.getByRole('heading', { name: /acesso restrito/i })).not.toBeVisible();
  });

  test('usuário não-admin acessa /perfil normalmente', async ({ page }) => {
    await page.goto('/perfil');
    await page.waitForURL(/\/perfil/, { timeout: 15_000 });
    expect(page.url()).toContain('/perfil');
  });
});
