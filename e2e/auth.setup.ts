import { test as setup, expect, type Page } from '@playwright/test';
import path from 'node:path';

const AUTH_FILE = path.resolve('e2e/.auth/user.json');
const AUTH_FILE_MOBILE = path.resolve('e2e/.auth/user-mobile.json');

const EMAIL = process.env.E2E_USER_EMAIL ?? 'admin@teste.local';
const PASSWORD = process.env.E2E_USER_PASSWORD ?? 'Admin@2026!';

/**
 * Autentica e persiste a sessão (cookies + localStorage).
 * Os specs autenticados reusam esse arquivo, evitando múltiplos logins.
 *
 * Cada família de projetos recebe um storageState PRÓPRIO (login separado):
 * refresh tokens do Supabase são single-use; se dois projetos partilham a
 * mesma sessão e um deles a rotaciona, o GoTrue revoga a família inteira e
 * o projeto que rodar depois é expulso para /login.
 *
 * Usar { page } em ambos os setups é suficiente: Playwright cria um contexto
 * de browser SEPARADO por teste, gerando sessões Supabase independentes.
 */
async function login(page: Page, file: string) {
  await page.goto('/login');

  // Marca o GuidedTour como concluído ANTES de salvar o storageState:
  // sem isso, o tour auto-abre 2s após o load e seu backdrop (z-[200])
  // intercepta todos os cliques dos testes autenticados.
  await page.evaluate(() => localStorage.setItem('dp-tour-completed', 'true'));

  // Caso a sessão já esteja persistida pelo dev, o app redireciona para /dashboard.
  if (page.url().includes('/dashboard')) {
    await page.context().storageState({ path: file });
    return;
  }

  const emailInput = page.getByLabel(/e-?mail/i).first();
  await expect(emailInput, 'tela de login deve estar visível').toBeVisible({ timeout: 15_000 });

  await emailInput.fill(EMAIL);
  await page.getByLabel(/senha|password/i).first().fill(PASSWORD);
  await page.getByRole('button', { name: /entrar|login|acessar/i }).first().click();

  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20_000 });

  // Aguarda a sessão Supabase ser gravada no localStorage antes de persisti-la
  await page.waitForFunction(
    () => Object.keys(localStorage).some((k) => k.startsWith('sb-')),
    undefined,
    { timeout: 10_000 },
  );

  await page.context().storageState({ path: file });
}

setup('autentica usuário de teste', async ({ page }) => {
  await login(page, AUTH_FILE);
});

setup('autentica usuário de teste (mobile)', async ({ page }) => {
  await login(page, AUTH_FILE_MOBILE);
});
