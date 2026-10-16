#!/usr/bin/env node
/**
 * ============================================================================
 * CAPTURA DE REFERÊNCIAS — Gestão de Desempenho / Feedbacks (área congelada)
 * ============================================================================
 *
 * Gera as capturas do layout APROVADO para `docs/protegido/referencias/`.
 * Serve de referência visual para revisão humana (o verificador de âncoras e o
 * teste de navegador cobrem o resto).
 *
 * As capturas 2 e 3 injetam, SÓ NO DOM DO NAVEGADOR, um nome de avaliador e um
 * nome de ciclo longos — é exatamente o caso que já causou sobreposição — para
 * congelar o comportamento de TRUNCAMENTO aprovado. Nada é gravado em banco.
 *
 * Uso (dev server em http://localhost:8080):
 *   node scripts/capturar-referencias-protegidas.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const URL = 'http://localhost:8080/avaliacao';
const OUT = 'docs/protegido/referencias';
const NOME_LONGO = 'HOMOLOG-NB Colaborador Descartavel';
const CICLO_LONGO = 'HOMOLOG-NB Ciclo Nine-Box de Avaliação Trimestral 2026';

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
try {
  for (const vp of [
    { nome: '1456', width: 1456, height: 950 },
    { nome: '1194', width: 1194, height: 950 },
  ]) {
    const context = await browser.newContext({
      storageState: 'e2e/.auth/user.json',
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('ui-theme', 'dark');
      localStorage.setItem('dp-tour-completed', 'true');
    });
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: /Gestão de Desempenho/ }).waitFor({ timeout: 30000 });
    await page.getByRole('tab', { name: /Feedbacks/i }).click();
    await page.waitForTimeout(2500);

    // 1) Layout como está (dados atuais da empresa da sessão).
    await page.screenshot({ path: `${OUT}/feedbacks-${vp.nome}.png` });

    // 2) Contrato de truncamento do nome do avaliador (coluna "Avaliado por").
    await page.evaluate((nome) => {
      const alvo = Array.from(document.querySelectorAll('div')).find((d) => {
        const p = d.querySelector(':scope > p');
        return p && /^Avaliado por$/i.test((p.textContent ?? '').trim());
      });
      const span = alvo?.querySelector('span.block');
      if (span) span.textContent = nome;
    }, NOME_LONGO);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/feedbacks-nome-longo-${vp.nome}.png` });

    // 3) Contrato de truncamento do seletor de ciclo (chrome da área).
    await page.evaluate((nome) => {
      const gatilho = document.querySelector('[role="combobox"]');
      const span = gatilho?.querySelector('div')?.querySelector('span');
      if (span) span.textContent = nome;
    }, CICLO_LONGO);
    await page.waitForTimeout(400);
    await page.screenshot({
      path: `${OUT}/ciclo-nome-longo-${vp.nome}.png`,
      clip: { x: 0, y: 60, width: vp.width, height: 220 },
    });

    // 4) Recorte "Aguardando gestor" — chip na MESMA linha dos segmentos
    //    (alteração AUTORIZADA de posicionamento).
    await page.getByRole('group', { name: 'Segmentar por tipo de feedback' })
      .getByRole('button', { name: /Aguardando gestor/ })
      .click();
    await page.getByText('Gestor responsável').first().waitFor({ timeout: 15000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/aguardando-gestor-${vp.nome}.png` });

    await context.close();
    console.log(`✓ referências de ${vp.nome}px em ${OUT}`);
  }
} finally {
  await browser.close();
}
