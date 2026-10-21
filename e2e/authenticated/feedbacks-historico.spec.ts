import { test, expect, type Page } from '@playwright/test';

/**
 * Captura/regressão visual da justificativa de cancelamento e do histórico.
 * Usa SOMENTE o armazenamento demonstrativo: nenhum dado real é alterado.
 */
const DIR = 'tmp-feedbacks-historico';

async function abrirFeedbacks(page: Page) {
  await page.route('**/rest/v1/rpc/get_user_roles*', (rota) =>
    rota.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(['admin', 'gestor']),
    })
  );
  await page.goto('/avaliacao');
  await expect(page.getByRole('heading', { name: /Gestão de Desempenho/ })).toBeVisible();
  await page.getByRole('tab', { name: /Feedbacks/i }).click();
  await expect(page.getByText('Avaliado por').first()).toBeVisible({ timeout: 15000 });
}

test.describe('Feedbacks — cancelamento e histórico', () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  test('card cancelado mostra justificativa e abre o histórico (capturas)', async ({ page }) => {
    const motivo =
      'Cancelamento solicitado pelo RH após revisão do ciclo e alinhamento com o gestor responsável. ' +
      'O registro permanece preservado para consulta e auditoria.';
    await abrirFeedbacks(page);
    await page.evaluate((texto) => {
      localStorage.removeItem('dp-desempenho-demo-registros');
      localStorage.removeItem('dp-desempenho-aprovacoes-demo');
      const agora = new Date().toISOString();
      const estado = {
        versao: 1,
        criados: { ciclos: {}, metas: {}, feedbacks: {}, pdis: {} },
        patches: {
          ciclos: {},
          metas: {},
          feedbacks: { 'mock-fb-1': { status: 'cancelado', motivo_cancelamento: texto, updated_at: agora } },
          pdis: {},
        },
        removidos: { ciclos: [], metas: [], feedbacks: [], pdis: [] },
        historico: [
          {
            em: agora,
            entidade: 'feedbacks',
            operacao: 'status',
            id: 'mock-fb-1',
            descricao: 'Avaliação cancelada na demonstração',
            dados: { status: 'cancelado', motivo_cancelamento: texto },
            por: 'rh.promobrindes@empresa.com.br',
          },
        ],
      };
      localStorage.setItem('dp-desempenho-demo-registros', JSON.stringify(estado));
    }, motivo);

    await page.reload();
    await page.getByRole('tab', { name: /Feedbacks/i }).click();
    await expect(page.getByText('Avaliado por').first()).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2400);

    const card = page
      .locator('[data-testid="cartao-feedback"]')
      .filter({ has: page.getByText('Motivo do cancelamento') })
      .first();
    await expect(card).toBeVisible({ timeout: 15000 });
    await expect(card.getByText(/Cancelamento solicitado pelo RH/)).toBeVisible();
    await expect(card.getByText(/Por rh.promobrindes@empresa.com.br/)).toBeVisible();
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);
    await card.screenshot({ path: `${DIR}/card-cancelamento.png` });

    await card.getByRole('button', { name: 'Ver histórico' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Histórico da avaliação')).toBeVisible();
    await expect(dialog.getByText('Feedback cancelado')).toBeVisible();
    await expect(dialog.getByText(/Cancelamento solicitado pelo RH/)).toBeVisible();
    // A moldura usa a cascata oficial (~0,9 s); esperar evita capturar o véu.
    await page.waitForTimeout(1600);
    await dialog.screenshot({ path: `${DIR}/modal-historico.png` });
  });
});
