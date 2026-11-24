import { test, expect } from '@playwright/test';

test.describe('Checklist Operacional e Auditoria de Rotas', () => {
  const ROTAS_ADMIN = [
    '/usuarios',
    '/configuracoes',
    '/auditoria',
    '/seguranca',
    '/backup'
  ];

  for (const rota of ROTAS_ADMIN) {
    test(`Acesso administrativo e integridade: ${rota}`, async ({ page }) => {
      await page.goto(rota);
      
      // Valida se não há erros 404/500
      const title = await page.title();
      expect(title).not.toContain('404');
      expect(title).not.toContain('Error');

      // Verifica elementos de layout padrão (Header/Sidebar)
      await expect(page.locator('nav')).toBeVisible();
      
      // Captura console logs para auditoria de erros silenciosos
      page.on('console', msg => {
        if (msg.type() === 'error') {
          console.error(`ERRO DETECTADO EM ${rota}: ${msg.text()}`);
        }
      });
    });
  }
});
