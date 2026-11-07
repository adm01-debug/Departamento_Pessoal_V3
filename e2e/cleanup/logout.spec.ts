import { test, expect } from '@playwright/test';

/**
 * Teste de LOGOUT isolado em um projeto próprio (`cleanup`) que roda DEPOIS de
 * `authenticated` e `mobile-smoke` (ver `dependencies` em playwright.config.ts).
 *
 * Motivo: o logout dispara `supabase.auth.signOut()` com escopo global, que
 * revoga o refresh token compartilhado no `storageState` reusado por todos os
 * projetos autenticados. Quando rodava junto com os demais (navigation.spec.ts,
 * projeto authenticated), a sessão era revogada no meio da execução paralela —
 * derrubando o `mobile-smoke` (/ponto virava /login) e causando flakiness em
 * rotas como /relatorios. Isolado e rodando por último, a corrida desaparece.
 */
test.describe('Logout (cleanup — executa por último)', () => {
  test('fluxo de logout completo via menu de perfil', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).not.toHaveURL(/\/login/);

    // O menu de perfil está no Header (UserProfileMenu). Usa o aria-label
    // estável do trigger em vez de /usuário/i: o nome exibido é o e-mail do
    // usuário E2E (provision-e2e-users.mjs não define user_metadata.name),
    // então um seletor por nome real nunca casaria de forma determinística.
    const profileButton = page.getByRole('button', { name: /menu do usuário/i });
    await expect(profileButton).toBeVisible();
    await profileButton.click();

    // Clicar em "Sair" no dropdown
    const logoutItem = page.getByRole('menuitem', { name: /sair/i });
    await expect(logoutItem).toBeVisible();
    await logoutItem.click();

    // Verificar redirecionamento para login
    await page.waitForURL(/\/login/, { timeout: 15000 });
    await expect(page.getByLabel(/e-?mail/i).first()).toBeVisible();

    // Tentar acessar uma rota protegida após logout (deve redirecionar)
    await page.goto('/dashboard');
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain('/login');
  });
});
