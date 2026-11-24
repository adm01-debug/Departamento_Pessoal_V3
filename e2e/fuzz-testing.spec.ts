import { test, expect } from '@playwright/test';

test.describe('Fuzz Testing: Formulário de Admissão', () => {
  test('deve lidar com entradas extremas sem crashar', async ({ page }) => {
    await page.goto('/colaboradores/novo');
    
    // Tenta submeter campos com strings gigantes e caracteres especiais
    const longString = 'A'.repeat(5000);
    const specialChars = '<script>alert(1)</script> ¯\\_(ツ)_/¯ " OR 1=1 --';

    await page.fill('input[name="nome_completo"]', longString);
    await page.fill('input[name="cpf"]', '99999999999'); // Formato inválido intencional
    await page.fill('textarea[name="observacoes"]', specialChars);

    await page.click('button[type="submit"]');

    // O sistema não deve ter um "white screen of death"
    // Deve mostrar validação do Zod ou erro amigável
    const bodyText = await page.innerText('body');
    expect(bodyText.length).toBeGreaterThan(0);
    
    // Verifica se houve redirecionamento de erro (500)
    const errors = await page.locator('.text-destructive, .bg-destructive').count();
    expect(errors).toBeGreaterThan(0);
  });
});
