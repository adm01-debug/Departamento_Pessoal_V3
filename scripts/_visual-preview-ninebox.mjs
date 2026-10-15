/**
 * TEMPORÁRIO — validação visual da PRÉVIA LOCAL dos controles do feedback
 * (`/dev/ninebox-preview`). Sobe o Vite, tira os prints e derruba o servidor.
 * Nenhuma escrita: a prévia usa serviço simulado (ver a própria página).
 *
 * Uso: node scripts/_visual-preview-ninebox.mjs
 */
import { chromium } from '@playwright/test';
import { spawn, execSync } from 'node:child_process';

const PORTA = 8080;
const BASE = `http://localhost:${PORTA}`;
const URL = `${BASE}/dev/ninebox-preview`;

const servidor = spawn('cmd.exe', ['/c', `npx vite --port ${PORTA}`], {
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});
servidor.stdout.on('data', () => {});
servidor.stderr.on('data', () => {});

async function servidorPronto() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(URL, { redirect: 'manual' });
      if (r.status < 500) return true;
    } catch {
      /* ainda subindo */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

const resultados = [];
let browser;

try {
  const pronto = await servidorPronto();
  if (!pronto) throw new Error('servidor Vite não ficou pronto em 60s');

  browser = await chromium.launch();

  async function capturar(largura, altura, nome, interacoes) {
    const context = await browser.newContext({ viewport: { width: largura, height: altura } });
    const page = await context.newPage();
    const erros = [];
    page.on('pageerror', (e) => erros.push(String(e.message).slice(0, 200)));
    await page.addInitScript(() => localStorage.setItem('ui-theme', 'dark'));
    await page.goto(URL, { waitUntil: 'domcontentloaded' });

    let encontrouTitulo = true;
    try {
      await page.getByText(/Prévia · Controles do feedback/).waitFor({ timeout: 25000 });
    } catch {
      encontrouTitulo = false;
    }
    await page.waitForTimeout(800);
    if (interacoes && encontrouTitulo) {
      await interacoes(page).catch((e) => erros.push(`interacao: ${e.message}`));
    }

    const arquivo = `tmp-preview-ninebox-${nome}.png`;
    await page.screenshot({ path: arquivo, fullPage: true });

    const info = await page.evaluate(() => {
      const textos = Array.from(document.querySelectorAll('button, [role="status"]'))
        .map((e) => (e.textContent ?? '').trim())
        .filter(Boolean);
      return {
        inicioDoCorpo: (document.body.innerText ?? '').replace(/\s+/g, ' ').slice(0, 200),
        controles: textos.filter((t) => /Concluir|Cancelar|Reabrir|Validar Potencial/.test(t)),
        abrirModal: textos.filter((t) => /Abrir modal/.test(t)).length,
        selos: Array.from(document.querySelectorAll('[role="status"]')).map((e) =>
          (e.textContent ?? '').trim()
        ),
        rolagemHorizontal: document.documentElement.scrollWidth > window.innerWidth + 1,
      };
    });

    resultados.push({ arquivo, largura, encontrouTitulo, erros: erros.slice(0, 3), ...info });
    await context.close();
  }

  await capturar(1440, 1000, 'desktop');

  await capturar(1440, 1000, 'modal', async (page) => {
    await page.getByRole('button', { name: /Abrir modal/ }).first().click();
    await page.getByRole('button', { name: /Cancelar avaliação/ }).first().waitFor({ timeout: 15000 });
    await page.waitForTimeout(500);
  });

  await capturar(1440, 1000, 'cancelamento', async (page) => {
    await page.getByRole('button', { name: /Abrir modal/ }).first().click();
    await page.getByRole('button', { name: /Cancelar avaliação/ }).first().click();
    const campo = page.getByLabel(/Motivo do cancelamento/);
    await campo.waitFor({ timeout: 15000 });
    await campo.fill('Registro duplicado no ciclo');
    await page.waitForTimeout(400);
  });

  await capturar(390, 900, 'mobile');
  await capturar(820, 1000, 'tablet');

  console.log(JSON.stringify(resultados, null, 2));
} finally {
  if (browser) await browser.close();
  try {
    execSync(`taskkill /pid ${servidor.pid} /T /F`, { stdio: 'ignore' });
  } catch {
    /* já encerrado */
  }
}


