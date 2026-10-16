/**
 * TEMPORÁRIO — valida que a fila "Aguardando gestor" e o modal "Ver feedback"
 * falam do MESMO estado de aprovação (a divergência reportada).
 *
 * Uso: node scripts/_tmp-validar-estado-aprovacao.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'tmp-validacao-aprovacao';
mkdirSync(OUT, { recursive: true });
const relatorio = {};

const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    storageState: 'e2e/.auth/user.json',
    viewport: { width: 1456, height: 950 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-tour-completed', 'true');
  });

  await page.goto('http://localhost:8080/avaliacao', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /Gestão de Desempenho/ }).waitFor({ timeout: 30000 });
  await page.getByRole('tab', { name: /Feedbacks/i }).click();
  await page.getByText('Avaliado por').first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(2500);

  // Fila: estado do badge da PRIMEIRA linha + nome do colaborador.
  await page.getByRole('group', { name: 'Segmentar por tipo de feedback' })
    .getByRole('button', { name: /Aguardando gestor/ })
    .click();
  await page.getByText('Gestor responsável').first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(1200);

  relatorio.fila = await page.evaluate(() => {
    const card = document.querySelectorAll('.rounded-xl');
    const linha = Array.from(card).find((c) => /GESTOR RESPONSÁVEL/i.test(c.textContent ?? ''));
    const status = linha?.querySelector('[role="status"]');
    const nome = linha?.querySelector('h3')?.textContent?.trim() ?? null;
    const acoes = Array.from(linha?.querySelectorAll('button') ?? []).map((b) =>
      (b.textContent ?? '').replace(/\s+/g, ' ').trim()
    );
    return { colaborador: nome, badge: status?.textContent?.trim() ?? null, acoes };
  });
  await page.screenshot({ path: `${OUT}/fila-aguardando-gestor.png` });

  // Modal do MESMO registro (primeira linha da fila).
  await page.getByRole('button', { name: 'Ver avaliação' }).first().click();
  await page.getByRole('dialog').waitFor({ timeout: 10000 });
  await page.waitForTimeout(800);

  relatorio.modal = await page.evaluate(() => {
    const dlg = document.querySelector('[role="dialog"]');
    const status = dlg?.querySelector('[role="status"]');
    const botoes = Array.from(dlg?.querySelectorAll('button') ?? []).map((b) =>
      (b.textContent ?? '').replace(/\s+/g, ' ').trim()
    );
    return {
      titulo: dlg?.querySelector('h2')?.textContent?.trim() ?? null,
      badge: status?.textContent?.trim() ?? null,
      botoes,
      temConcluir: botoes.some((b) => /Concluir avaliação/.test(b)),
      temAprovar: botoes.some((b) => /^Aprovar$/.test(b)),
      temValidarPotencial: botoes.some((b) => /Validar Potencial/.test(b)),
    };
  });
  await page.screenshot({ path: `${OUT}/modal-do-mesmo-registro.png` });

  relatorio.consistente = relatorio.fila.badge === relatorio.modal.badge && !!relatorio.modal.badge;

  // Registro PENDENTE (não é pendência de aprovação): o modal mantém a conclusão.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await page.getByRole('group', { name: 'Segmentar por tipo de feedback' })
    .getByRole('button', { name: /^Todos/ })
    .click();
  await page.waitForTimeout(1200);
  const alvoPendente = page.getByRole('button', { name: 'Ver feedback' }).filter({ hasText: '' });
  void alvoPendente;
  relatorio.nota =
    'Pendente (não-aguardando-aprovação) segue com as ações de conclusão — ver teste unitário e captura previa-modal-rh/gestor.';

  writeFileSync(`${OUT}/relatorio.json`, JSON.stringify(relatorio, null, 2));
  console.log(JSON.stringify(relatorio, null, 2));
} finally {
  await browser.close();
}
