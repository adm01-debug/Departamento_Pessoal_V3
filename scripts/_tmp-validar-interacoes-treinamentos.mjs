/** TEMPORÁRIO — interações de fechamento, foco, repetição e overflow. */
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:8080';
const OUT = 'tmp-validacao-treinamentos';
const rel = {};

const browser = await chromium.launch();
const contexto = async (w = 1440, h = 900) => {
  const context = await browser.newContext({
    storageState: 'e2e/.auth/user.json',
    viewport: { width: w, height: h },
    reducedMotion: 'no-preference',
  });
  await context.addInitScript(() => localStorage.setItem('dp-tour-completed', 'true'));
  return context;
};
const abrirTreinamentos = async (page, aba) => {
  await page.goto(`${BASE}/treinamentos`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2600);
  if (aba) {
    await page.getByRole('tab', { name: aba }).click();
    await page.waitForTimeout(900);
  }
};
const fecharX = (page) => page.locator('[role="dialog"] button:has(svg.lucide-x)').last().click();
const ativo = (page) => page.evaluate(() => {
  const el = document.activeElement;
  return el ? { tag: el.tagName, aria: el.getAttribute('aria-label'), texto: (el.textContent || '').trim().slice(0, 40) } : null;
});

try {
  // ---- caminhos de fechamento do Novo Treinamento ----
  {
    const context = await contexto();
    const page = await context.newPage();
    await abrirTreinamentos(page, 'Treinamentos');
    const caminhos = {};
    for (const [nome, fechar] of [
      ['x', fecharX],
      ['escape', (p) => p.keyboard.press('Escape')],
      ['backdrop', (p) => p.mouse.click(8, 8)],
    ]) {
      await page.getByRole('button', { name: 'Novo Treinamento', exact: true }).click();
      await page.waitForTimeout(1400);
      const antes = await page.locator('[role="dialog"]').count();
      await fechar(page);
      const durante = await page.locator('[role="dialog"]').count();
      await page.waitForTimeout(1700);
      const depois = await page.locator('[role="dialog"]').count();
      caminhos[nome] = { antes, durante, depois, foco: await ativo(page) };
    }
    rel.fechamentoNovoTreinamento = caminhos;

    // ---- repetição com espera maior que a saída real (2 blocos) ----
    const rep = [];
    for (let i = 0; i < 5; i += 1) {
      await page.getByRole('button', { name: 'Novo Treinamento', exact: true }).click();
      await page.waitForTimeout(1300);
      rep.push({ aberto: await page.locator('[role="dialog"]').count(), overlays: await page.locator('.backdrop-blur-sm').count() });
      await fecharX(page);
      await page.waitForTimeout(1700);
      rep.push({ fechado: await page.locator('[role="dialog"]').count() });
    }
    rel.repeticaoNovoTreinamento = rep;
    await context.close();
  }

  // ---- foco ao fechar "Ver curso" (sem handler explícito) ----
  {
    const context = await contexto();
    const page = await context.newPage();
    await abrirTreinamentos(page, 'Catálogo');
    await page.getByRole('button', { name: /^Ver curso/ }).first().click();
    await page.waitForTimeout(1400);
    const focoAntes = await ativo(page);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1700);
    rel.focoVerCurso = { dentro: focoAntes, depois: await ativo(page), dialogosRestantes: await page.locator('[role="dialog"]').count() };
    await context.close();
  }

  // ---- botão "Fechar" do rodapé + repetição do certificado ----
  {
    const context = await contexto();
    const page = await context.newPage();
    await abrirTreinamentos(page, 'Certificados');
    await page.getByRole('button', { name: /^Visualizar certificado/ }).first().click();
    await page.waitForTimeout(1400);
    const durante = await page.locator('[role="dialog"]').count();
    await page.getByRole('button', { name: 'Fechar', exact: true }).last().click();
    await page.waitForTimeout(2200);
    rel.fechamentoCertificadoRodape = { durante, depois: await page.locator('[role="dialog"]').count(), foco: await ativo(page) };

    const rep = [];
    for (let i = 0; i < 5; i += 1) {
      await page.getByRole('button', { name: /^Visualizar certificado/ }).first().click();
      await page.waitForTimeout(1500);
      rep.push({ aberto: await page.locator('[role="dialog"]').count() });
      await fecharX(page);
      await page.waitForTimeout(2200);
      rep.push({ fechado: await page.locator('[role="dialog"]').count() });
    }
    rel.repeticaoCertificado = rep;
    await context.close();
  }

  // ---- overflow antes/depois do modal (atribuição) ----
  rel.overflow = [];
  for (const [w, h] of [[1024, 768], [768, 1024], [390, 844]]) {
    const context = await contexto(w, h);
    const page = await context.newPage();
    await abrirTreinamentos(page, 'Treinamentos');
    const antes = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth,
      overflow: document.documentElement.scrollWidth > innerWidth,
    }));
    await page.getByRole('button', { name: 'Novo Treinamento', exact: true }).click();
    await page.waitForTimeout(1500);
    const depois = await page.evaluate(() => {
      const c = document.querySelector('[role="dialog"]');
      const r = c.getBoundingClientRect();
      return {
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth,
        overflow: document.documentElement.scrollWidth > innerWidth,
        modalDentro: r.left >= -1 && r.right <= innerWidth + 1,
      };
    });
    rel.overflow.push({ viewport: `${w}x${h}`, antes, depois: { ...depois, overflow: depois.overflow } });
    await context.close();
  }
} finally {
  await browser.close();
  writeFileSync(`${OUT}/relatorio-interacoes.json`, JSON.stringify(rel, null, 2));
  console.log(JSON.stringify(rel, null, 2));
}
