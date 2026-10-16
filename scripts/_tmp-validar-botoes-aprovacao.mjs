/**
 * TEMPORÁRIO — VALIDAÇÃO da tarefa: o modal "Ver feedback" apresenta
 * APROVAR AVALIAÇÃO e DEVOLVER PARA CORREÇÃO no rodapé existente, para a
 * avaliação de ANA BEATRIZ SOUZA em MODO DEMONSTRATIVO (mock), sem gravar nada.
 *
 * Uso: node scripts/_tmp-validar-botoes-aprovacao.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'tmp-validacao-botoes';
mkdirSync(OUT, { recursive: true });
const relatorio = {};

const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    storageState: 'e2e/.auth/user.json',
    viewport: { width: 1456, height: 1000 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  // Prova de que NADA é gravado: nenhuma chamada de rede às RPCs do fluxo.
  const rpcsChamadas = [];
  page.on('request', (r) => {
    if (/decidir_aprovacao_gestor|enviar_avaliacao_ao_gestor|finalizar_feedback/.test(r.url())) {
      rpcsChamadas.push(r.url());
    }
  });
  const avisos = [];
  page.on('pageerror', (e) => avisos.push(String(e.message).slice(0, 160)));

  await page.addInitScript(() => {
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-tour-completed', 'true');
  });

  await page.goto('http://localhost:8080/avaliacao', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /Gestão de Desempenho/ }).waitFor({ timeout: 30000 });
  await page.getByRole('tab', { name: /Feedbacks/i }).click();
  await page.getByText('Avaliado por').first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(2500);

  // Fila "Aguardando gestor" → linha da ANA BEATRIZ SOUZA
  await page.getByRole('group', { name: 'Segmentar por tipo de feedback' })
    .getByRole('button', { name: /Aguardando gestor/ })
    .click();
  await page.getByText('Gestor responsável').first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(1200);

  const linhaAna = page.locator('h3', { hasText: 'Ana Beatriz Souza' }).first();
  await linhaAna.waitFor({ timeout: 10000 });
  relatorio.fila = await page.evaluate(() => {
    const titulo = Array.from(document.querySelectorAll('h3')).find((h) =>
      /Ana Beatriz Souza/.test(h.textContent ?? '')
    );
    const card = titulo?.closest('.rounded-xl');
    const status = card?.querySelector('[role="status"]');
    return { badge: status?.textContent?.trim() ?? null };
  });

  // Abre a MESMA avaliação no modal (ação da própria linha)
  await page.getByRole('button', { name: 'Ver avaliação' }).first().click();
  const dialogo = page.getByRole('dialog');
  await dialogo.waitFor({ timeout: 10000 });
  await page.waitForTimeout(900);

  relatorio.modal = await dialogo.evaluate((el) => {
    const botoes = Array.from(el.querySelectorAll('button')).map((b) =>
      (b.textContent ?? '').replace(/\s+/g, ' ').trim()
    );
    const status = el.querySelector('[role="status"]');
    const aprovar = Array.from(el.querySelectorAll('button')).find((b) => /Aprovar avaliação/.test(b.textContent ?? ''));
    return {
      colaborador: el.querySelector('h2')?.textContent?.trim() ?? null,
      selo: status?.textContent?.trim() ?? null,
      botoes,
      temAprovar: botoes.some((b) => /^Aprovar avaliação$/.test(b)),
      temDevolver: botoes.some((b) => /^Devolver para correção$/.test(b)),
      tituloAprovar: aprovar?.getAttribute('title') ?? null,
      aprovarDesabilitado: aprovar ? aprovar.disabled : null,
    };
  });

  await page.screenshot({ path: `${OUT}/modal-ana-beatriz-souza.png` });
  await dialogo.screenshot({ path: `${OUT}/modal-ana-beatriz-souza-recorte.png` });

  // Demonstra a ação: NADA pode ser gravado.
  await page.getByRole('button', { name: /Aprovar avaliação/ }).click();
  await page.waitForTimeout(1200);
  relatorio.demonstracao = {
    aviso: await page
      .locator('[data-sonner-toast]')
      .first()
      .textContent()
      .catch(() => null),
    rpcsChamadas,
  };
  await page.screenshot({ path: `${OUT}/modal-ana-aprovar-demonstrativo.png` });

  writeFileSync(`${OUT}/relatorio.json`, JSON.stringify(relatorio, null, 2));
  console.log(JSON.stringify(relatorio, null, 2));
} finally {
  await browser.close();
}
