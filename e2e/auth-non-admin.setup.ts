import { test as setup, expect } from '@playwright/test';
import path from 'node:path';

const AUTH_FILE = path.resolve('e2e/.auth/user-non-admin.json');

const EMAIL = process.env.E2E_NON_ADMIN_EMAIL ?? 'user@teste.local';
const PASSWORD_ENV = process.env.E2E_NON_ADMIN_PASSWORD;
if (!PASSWORD_ENV)
  throw new Error('E2E_NON_ADMIN_PASSWORD não definido — configure o secret (senha não fica no repo).');
const PASSWORD: string = PASSWORD_ENV;

/**
 * Autentica um SEGUNDO usuário SEM privilégios de admin.
 * Persiste a sessão em `e2e/.auth/user-non-admin.json` para os specs
 * de autorização RBAC (bloqueio em rotas administrativas).
 *
 * Estratégia resiliente:
 *  1. Tenta login direto (usuário já existe).
 *  2. Se o login falhar, tenta cadastro via UI (self-signup) e loga em seguida.
 *  3. Se ambos falharem, o setup falha com mensagem clara — indica que a
 *     conta precisa ser provisionada manualmente (self-signup desativado).
 *
 * IMPORTANTE: este usuário NÃO deve receber a role `admin`. A validação
 * de bloqueio depende dele permanecer com role `user` padrão.
 */
setup('autentica usuário não-admin', async ({ page }) => {
  const tryLogin = async () => {
    await page.goto('/login');
    const emailInput = page.getByLabel(/e-?mail/i).first();
    await expect(emailInput).toBeVisible({ timeout: 15_000 });
    await emailInput.fill(EMAIL);
    await page
      .getByLabel(/senha|password/i)
      .first()
      .fill(PASSWORD);
    await page
      .getByRole('button', { name: /entrar|login|acessar/i })
      .first()
      .click();
    try {
      await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 });
      return true;
    } catch {
      return false;
    }
  };

  let loggedIn = await tryLogin();

  if (!loggedIn) {
    // Tenta self-signup se disponível na UI
    const signupLink = page
      .getByRole('button', { name: /criar conta|cadastrar|sign ?up/i })
      .or(page.getByRole('link', { name: /criar conta|cadastrar|sign ?up/i }))
      .first();

    if (await signupLink.isVisible().catch(() => false)) {
      await signupLink.click();
      const nameInput = page.getByLabel(/nome/i).first();
      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill('Usuário Teste E2E');
      }
      await page
        .getByLabel(/e-?mail/i)
        .first()
        .fill(EMAIL);
      await page
        .getByLabel(/senha|password/i)
        .first()
        .fill(PASSWORD);
      await page
        .getByRole('button', { name: /criar|cadastrar|sign ?up|registrar/i })
        .first()
        .click();
      await page.waitForTimeout(3000);
      loggedIn = await tryLogin();
    }
  }

  expect(
    loggedIn,
    `Não foi possível autenticar ${EMAIL}. Provisione a conta ou defina E2E_NON_ADMIN_EMAIL/PASSWORD.`
  ).toBe(true);

  // Desabilita onboarding tour (mesmo bloqueio do setup admin)
  await page.evaluate(() => localStorage.setItem('dp-tour-completed', 'true'));
  await page.context().storageState({ path: AUTH_FILE });
});
