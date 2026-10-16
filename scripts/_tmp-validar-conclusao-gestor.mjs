/**
 * TEMPORÁRIO — validação no navegador da tarefa:
 *   1. os DOIS chips superiores foram removidos (e o espaço vertical com eles);
 *   2. existe UMA única linha de chips coloridos, com "Aguardando gestor" DEPOIS
 *      de "Autoavaliação";
 *   3. o modal "Ver feedback" tem a MESMA estrutura em ciclos diferentes;
 *   4. "Concluir avaliação" fica BLOQUEADO para admin/RH;
 *   5. o gestor RESPONSÁVEL vê o controle (prévia DEV de papel).
 *
 * Uso: node scripts/_tmp-validar-conclusao-gestor.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'tmp-validacao-gestor';
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

  // ── (1) e (2) linha única de chips ────────────────────────────────────────
  relatorio.chips = await page.evaluate(() => {
    const grupos = Array.from(document.querySelectorAll('[role="group"]')).filter((g) =>
      /Segmentar por tipo/i.test(g.getAttribute('aria-label') ?? '')
    );
    const linha = grupos[0];
    const banner = Array.from(document.querySelectorAll('p')).find((p) => /FOCO AGORA/i.test(p.textContent ?? ''));
    const tabs = document.querySelector('[role="tablist"]');
    const secao = banner?.closest('section') ?? banner?.closest('div');
    return {
      quantidadeDeLinhasDeChips: grupos.length,
      rotulosDaLinha: linha
        ? Array.from(linha.querySelectorAll('button')).map((b) => (b.textContent ?? '').replace(/\s+/g, ' ').trim())
        : [],
      chipAvaliacoesAcima: /(^|\s)Avaliações/.test(document.body.innerText.replace(/Autoavaliação/g, '')),
      espacoAcimaDoBanner:
        secao && tabs ? Math.round(secao.getBoundingClientRect().top - tabs.getBoundingClientRect().bottom) : null,
    };
  });

  await page.screenshot({ path: `${OUT}/feedbacks-linha-unica.png` });

  // ── (3) modal em DOIS ciclos diferentes ──────────────────────────────────
  const medirModal = async (nomeCiclo) => {
    if (nomeCiclo) {
      await page.locator('button[role="combobox"]').first().click();
      await page.getByRole('option', { name: new RegExp(nomeCiclo, 'i') }).click();
      // Espera a lista do ciclo escolhido carregar (o rótulo do grupo muda).
      await page.getByRole('button', { name: 'Ver feedback' }).first().waitFor({ timeout: 20000 });
      await page.waitForTimeout(1500);
    }
    await page.getByRole('button', { name: 'Ver feedback' }).first().click();
    await page.getByRole('dialog').waitFor({ timeout: 10000 });
    await page.waitForTimeout(600);
    const estrutura = await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"]');
      if (!dlg) return null;
      const botoes = Array.from(dlg.querySelectorAll('button'));
      const concluir = botoes.find((x) => /Concluir avaliação/i.test(x.textContent ?? ''));
      return {
        blocos: Array.from(dlg.querySelectorAll('p')).map((p) =>
          (p.textContent ?? '').replace(/\s+/g, ' ').trim().toUpperCase()
        ),
        botoes: botoes.map((b) => (b.textContent ?? '').replace(/\s+/g, ' ').trim()),
        largura: Math.round(dlg.getBoundingClientRect().width),
        ciclo: (dlg.textContent ?? '').match(/Prazo do ciclo: \d{2}\/\d{2}\/\d{4}/)?.[0] ?? null,
        concluirDesabilitado: concluir ? concluir.disabled : null,
        concluirTitulo: concluir ? concluir.getAttribute('title') : null,
      };
    });
    await page.screenshot({ path: `${OUT}/modal-${(nomeCiclo ?? 'ciclo-ativo').replace(/\s+/g, '-').toLowerCase()}.png` });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    return estrutura;
  };

  const cicloA = await medirModal(null); // ciclo ativo (S2 2026)
  const cicloB = await medirModal('Ciclo S1 2026'); // outro tipo/objeto de ciclo
  relatorio.modal = {
    cicloS2: cicloA,
    cicloAnual2025: cicloB,
    // Estrutura = marcos fixos (os textos de negócio variam de ciclo para ciclo,
    // o que é permitido). Compara rótulos de seção, botões e largura.
    mesmaEstrutura:
      !!cicloA &&
      !!cicloB &&
      JSON.stringify(cicloA.blocos.filter((b) => /^(AVALIADO POR|DATAS|PONTOS|COMENT)/.test(b))) ===
        JSON.stringify(cicloB.blocos.filter((b) => /^(AVALIADO POR|DATAS|PONTOS|COMENT)/.test(b))) &&
      JSON.stringify(cicloA.botoes) === JSON.stringify(cicloB.botoes) &&
      cicloA.largura === cicloB.largura,
  };

  // ── (5) prévia DEV: gestor responsável ───────────────────────────────────
  await page.goto('http://localhost:8080/dev/ninebox-preview', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const clicarPapel = async (rotulo) => {
    await page.getByRole('button', { name: new RegExp(`^${rotulo}$`, 'i') }).first().click();
    await page.waitForTimeout(600);
  };
  const medirConcluir = async () =>
    page.evaluate(() =>
      Array.from(document.querySelectorAll('button'))
        .filter((x) => /Concluir avaliação/i.test(x.textContent ?? ''))
        .map((b) => ({ desabilitado: b.disabled, titulo: b.getAttribute('title') }))
    );

  /** Abre o cenário "pendente" no modal e mede o botão de conclusão do rodapé. */
  const medirNoModal = async (rotuloPapel) => {
    await clicarPapel(rotuloPapel);
    await page.getByRole('button', { name: /^Abrir modal$/ }).first().click();
    await page.getByRole('dialog').waitFor({ timeout: 10000 });
    await page.waitForTimeout(700);
    const medicao = await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"]');
      if (!dlg) return null;
      const b = Array.from(dlg.querySelectorAll('button')).find((x) =>
        /Concluir avaliação/i.test(x.textContent ?? '')
      );
      return b ? { desabilitado: b.disabled, titulo: b.getAttribute('title') } : null;
    });
    await page.screenshot({ path: `${OUT}/previa-modal-${rotuloPapel}.png` });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    return medicao;
  };

  const rhModal = await medirNoModal('rh');
  const gestorModal = await medirNoModal('gestor');
  relatorio.rodape = { rh: rhModal, gestor: gestorModal };

  writeFileSync(`${OUT}/relatorio.json`, JSON.stringify(relatorio, null, 2));
  console.log(JSON.stringify(relatorio, null, 2));
} finally {
  await browser.close();
}
