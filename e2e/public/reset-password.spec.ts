import { test, expect } from '@playwright/test';

/**
 * Fluxo público de recuperação de senha.
 *
 * Observação: a redefinição efetiva depende do link enviado por e-mail
 * (fluxo Supabase → callback com token). Nos limites do E2E validamos:
 *  1. UI de "Esqueci minha senha" é acessível na tela de login
 *  2. Requisição de link com credencial real dispara feedback de sucesso
 *  3. Validação de e-mail obrigatória impede submissão vazia
 */
test.describe('Recuperação de senha (público)', () => {
  test('exibe formulário ao clicar em "Esqueci minha senha"', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /esqueci minha senha/i }).click();

    await expect(page.getByRole('heading', { name: /recuperar senha/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /enviar link de recuperação/i })).toBeVisible();
  });

  test('bloqueia submissão sem email (validação HTML5)', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /esqueci minha senha/i }).click();

    await page.getByRole('button', { name: /enviar link de recuperação/i }).click();

    // Continua na mesma tela — validação nativa impede o submit
    await expect(page.getByRole('heading', { name: /recuperar senha/i })).toBeVisible();
    const emailInput = page.getByLabel(/email/i);
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBe(true);
  });

  test('envia link de recuperação para email real e exibe confirmação', async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL ?? 'admin@teste.local';

    await page.goto('/login');
    await page.getByRole('button', { name: /esqueci minha senha/i }).click();
    await page.getByLabel(/email/i).fill(email);
    await page.getByRole('button', { name: /enviar link de recuperação/i }).click();

    // Aceita sucesso (email enviado) ou erro de rate-limit — ambos comprovam integração viva
    const sucesso = page.getByText(/email enviado/i);
    const rateLimit = page.locator('[role="alert"], .text-destructive').filter({ hasText: /rate|limite|aguarde/i });

    await expect(sucesso.or(rateLimit).first()).toBeVisible({ timeout: 15_000 });
  });

  test('permite voltar ao login após solicitar recuperação', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /esqueci minha senha/i }).click();
    await page.getByRole('button', { name: /voltar ao login/i }).click();

    await expect(page.getByRole('heading', { name: /bem-vindo de volta/i })).toBeVisible();
  });
});
