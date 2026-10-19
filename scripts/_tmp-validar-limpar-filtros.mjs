/**
 * TEMPORÁRIO — valida o botão "Limpar filtros" da aba Pagamentos:
 * posição/altura na barra, estado habilitado/desabilitado, limpeza de TODOS os
 * filtros (busca, etapa do fluxo, campanha, status), volta para a página 1,
 * preservação da ordenação e das 6 linhas, tooltip do DS e responsividade.
 * Uso: node scripts/_tmp-validar-limpar-filtros.mjs
 */
import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';

const SAIDA = 'tmp-limpar-filtros';
mkdirSync(SAIDA, { recursive: true });

const ESTADO = () => {
  const texto = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const botao = document.querySelector('[aria-label="Limpar filtros"]');
  const busca = document.querySelector('input[aria-label="Buscar pagamentos"]');
  const barra = botao?.parentElement?.parentElement;
  const controles = Array.from(barra?.children ?? []).map((el) => {
    const r = el.getBoundingClientRect();
    return { top: Math.round(r.top), altura: Math.round(r.height), largura: Math.round(r.width) };
  });
  return {
    botaoDesabilitado: botao?.disabled ?? null,
    botaoBox: botao ? { w: Math.round(botao.getBoundingClientRect().width), h: Math.round(botao.getBoundingClientRect().height) } : null,
    botaoRaio: botao ? getComputedStyle(botao).borderRadius : null,
    botaoFundo: botao ? getComputedStyle(botao).backgroundColor : null,
    alturaDaBarra: barra ? Math.round(barra.getBoundingClientRect().height) : null,
    controlesNaBarra: controles,
    numaUnicaLinha: controles.length > 0 && new Set(controles.map((c) => c.top)).size === 1,
    busca: busca?.value ?? null,
    etapa: texto(document.querySelector('[aria-label="Etapa do fluxo"]')),
    campanha: texto(document.querySelector('[aria-label="Campanha"]')),
    status: texto(document.querySelector('[aria-label="Status"]')),
    ordenacao: texto(document.querySelector('[aria-label="Ordenar por"]')),
    paginaAtiva: texto(document.querySelector('[aria-current="page"]')),
    seletorLinhas: texto(document.querySelector('[aria-label="Linhas por página"]')),
    linhasVisiveis: document.querySelectorAll('tbody tr').length,
    etapasDoFluxoMarcadas: Array.from(document.querySelectorAll('button[aria-pressed="true"]')).map((b) => texto(b).slice(0, 22)),
    estouroHorizontal: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
};

const browser = await chromium.launch();
const contexto = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1512, height: 1200 } });
const page = await contexto.newPage();
const erros = [];
page.on('pageerror', (e) => erros.push(String(e.message).slice(0, 140)));
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
await page.goto('http://localhost:8080/premiacoes', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30_000 });
await page.getByRole('tab', { name: /Pagamentos/ }).click();
await page.waitForTimeout(4500);

const resultados = { semFiltros: await page.evaluate(ESTADO) };
await page.screenshot({ path: `${SAIDA}/desktop-sem-filtros.png`, fullPage: true });

// Ordenação para um valor NÃO padrão (deve sobreviver à limpeza)
await page.getByLabel('Ordenar por').click();
await page.waitForTimeout(400);
resultados.opcoesDeOrdenacao = await page.getByRole('option').allTextContents();
await page.getByRole('option').nth(1).click();
await page.waitForTimeout(700);

// Vários filtros ao mesmo tempo + etapa escolhida no Fluxo de Pagamento
await page.getByLabel('Buscar pagamentos').fill('Juliana');
await page.getByLabel('Etapa do fluxo').click();
await page.waitForTimeout(400);
await page.getByRole('option').nth(1).click();
await page.waitForTimeout(600);
await page.getByLabel('Campanha').click();
await page.waitForTimeout(400);
await page.getByRole('option').nth(1).click();
await page.waitForTimeout(600);
await page.getByLabel('Status').click();
await page.waitForTimeout(400);
await page.getByRole('option').nth(1).click();
await page.waitForTimeout(600);
await page.locator('button[aria-pressed]').nth(1).click();
await page.waitForTimeout(700);

resultados.comFiltros = await page.evaluate(ESTADO);
await page.screenshot({ path: `${SAIDA}/desktop-com-filtros.png`, fullPage: true });

// Tooltip padrão do sistema (estado HABILITADO — no desabilitado o DS usa
// `disabled:pointer-events-none`, então não há hover, por definição)
await page.getByLabel('Limpar filtros').hover();
await page.waitForTimeout(900);
resultados.tooltip = await page.getByRole('tooltip').textContent().catch(() => null);
const caixaBotao = await page.getByLabel('Limpar filtros').boundingBox();
await page.screenshot({
  path: `${SAIDA}/tooltip.png`,
  clip: { x: Math.max(0, caixaBotao.x - 120), y: Math.max(0, caixaBotao.y - 90), width: 260, height: 140 },
});

// Limpar
await page.getByLabel('Limpar filtros').click();
await page.waitForTimeout(900);
resultados.aposLimpar = await page.evaluate(ESTADO);
await page.screenshot({ path: `${SAIDA}/desktop-limpo.png`, fullPage: true });

// Mobile
await page.setViewportSize({ width: 390, height: 900 });
await page.waitForTimeout(800);
resultados.mobile = await page.evaluate(ESTADO);
await page.screenshot({ path: `${SAIDA}/mobile-390.png`, fullPage: true });

resultados.erros = erros;
writeFileSync(`${SAIDA}/relatorio.json`, JSON.stringify(resultados, null, 2));
console.log(JSON.stringify(resultados, null, 2));
await contexto.close();
await browser.close();
