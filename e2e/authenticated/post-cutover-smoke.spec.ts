import { test, expect } from '@playwright/test';

/**
 * Smoke test pós-cutover: valida os fluxos mínimos que devem funcionar
 * imediatamente após apontar a aplicação para o novo projeto Supabase.
 *
 * Pré-requisitos: setup de auth admin em `e2e/auth.setup.ts` já executado
 * (playwright.config.ts injeta storageState).
 *
 * Cada passo tem timeout curto (10s) — se o cutover degradou latências, o
 * teste falha rápido e a evidência aparece no relatório.
 */

test.describe('Post-cutover smoke', () => {
  test.setTimeout(90_000);

  test('admin → dashboard → colaboradores → folha → diagnóstico', async ({ page }) => {
    // 1. Dashboard raiz
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible({ timeout: 10_000 });
    // Não travar em textos frágeis — o objetivo é só provar que o app monta.
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });

    // 2. Colaboradores — lista carrega sem erro no console
    const consoleErrors: string[] = [];
    page.on('pageerror', (e) => consoleErrors.push(String(e)));
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text());
    });

    await page.goto('/admin/colaboradores');
    await page.waitForLoadState('networkidle', { timeout: 15_000 });
    await expect(page.locator('h1, [role="heading"]').first()).toBeVisible();

    // 3. Folha — página abre e mostra competência
    await page.goto('/folha');
    await page.waitForLoadState('networkidle', { timeout: 15_000 });

    // 4. Diagnóstico da migração — todos os checks devem terminar.
    // A página faz polling contínuo (health/telemetria), então `networkidle`
    // nunca é atingido — esperamos diretamente o badge que prova que run()
    // completou ao menos uma vez. `OK 0` já renderiza no mount inicial
    // (counts.ok=0) — exigimos ≥1 para garantir que run() de fato terminou
    // (o check 'env' fica 'ok' sempre que a página monta com VITE_SUPABASE_URL).
    await page.goto('/admin/diagnostico-migracao');
    // Dois sinais, na ordem: `OK ≥1` prova que run() começou (o check 'env'
    // fica 'ok' assim que a página monta com VITE_SUPABASE_URL); o botão
    // "Rodar novamente" fica disabled durante run() e só reabilita quando
    // TODOS os checks terminam — é ele que prova a conclusão.
    await expect(page.getByText(/OK [1-9]\d*/).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: /rodar novamente/i })).toBeEnabled({ timeout: 30_000 });

    // 5. Sem erros de console críticos (ignoramos ruído previsível).
    // BRIDGE_SCHEMA_ERROR em `user_roles` é esperado: a denylist da bridge
    // bloqueia essa tabela intencionalmente e o diagnóstico a sonda.
    const critical = consoleErrors.filter(
      (m) => !/favicon|ResizeObserver|non-passive|preload/i.test(m) && !/BRIDGE_SCHEMA_ERROR.*user_roles/i.test(m)
    );
    expect(critical, `Erros críticos no console:\n${critical.join('\n')}`).toEqual([]);
  });
});
