import { test, expect } from '@playwright/test';

/**
 * =============================================================================
 * HOMOLOGAÇÃO — capa real no card (TrainingCover)
 * =============================================================================
 * Só executa quando explicitamente habilitado:
 *
 *   E2E_TRAINING_IMAGES_HOMOLOG=1
 *   E2E_BASE_URL=https://<app-apontando-para-homolog>
 *   E2E_USER_EMAIL=homolog.a@exemplo.local
 *   E2E_USER_PASSWORD=<senha>
 *
 * Pré-requisitos:
 *   • app servido com VITE_TRAINING_IMAGES=true;
 *   • projeto Supabase de homologação (nunca produção);
 *   • uma capa `succeeded` no bucket privado + linha em `training_images`;
 *   • sessão E2E criada pelo projeto `authenticated`.
 *
 * Nenhuma chamada à OpenAI é feita por este teste.
 * =============================================================================
 */
const habilitado = process.env.E2E_TRAINING_IMAGES_HOMOLOG === '1';

test.describe('TrainingCover — capa real (homologação)', () => {
  test.skip(!habilitado, 'Requer E2E_TRAINING_IMAGES_HOMOLOG=1 e ambiente de homologação.');

  test('renderiza a capa do Storage privado em vez do fallback', async ({ page }) => {
    await page.goto('/treinamentos');

    const capa = page
      .locator('[data-training-cover][data-training-cover-estado="imagem"]')
      .first();
    await expect(capa).toBeVisible({ timeout: 20_000 });

    const imagem = capa.locator('img').first();
    await expect(imagem).toBeVisible();

    const src = await imagem.getAttribute('src');
    expect(src ?? '').toMatch(/^https?:\/\//);

    // A imagem precisa ter carregado de fato (URL assinada válida).
    const carregou = await imagem.evaluate((el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0);
    expect(carregou).toBe(true);
  });
});
