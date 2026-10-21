/**
 * TEMPORÁRIO — validação do redesenho do Simulador ROI.
 *
 * Confere estrutura, cálculos em tempo real, carga de cenário salvo,
 * comparação (1 e 2 cenários), estado vazio, salvamento no modo demo,
 * gráfico (2 barras + rótulos) e responsividade.
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:8080';
const OUT = 'tmp-simulador-roi';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--disable-frame-rate-limit', '--disable-gpu-vsync'] });
const context = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1600, height: 1000 } });
await context.route('**/rest/v1/rpc/get_user_roles*', (rota) =>
  rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(['admin', 'gestor']) })
);
await context.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
const page = await context.newPage();

const abrirSimulador = async () => {
  await page.goto(`${BASE}/premiacoes`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30000 });
  await page.getByRole('tab', { name: /Simulador ROI/ }).click();
  await page.getByText('1. Configure seu cenário').waitFor({ timeout: 15000 });
  await page.waitForTimeout(1500);
};

await abrirSimulador();
await page.screenshot({ path: `${OUT}/desktop-1600.png` });
await page.getByText('Cenários salvos').scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/desktop-1600-cenarios-salvos.png` });
await page.getByText('1. Configure seu cenário').scrollIntoViewIfNeeded();
await page.waitForTimeout(400);

const estrutura = await page.evaluate(() => {
  const h2 = [...document.querySelectorAll('h2')].find((h) => /Configure seu cenário/.test(h.textContent || ''));
  const secao1 = h2?.closest('section');
  const grid = secao1?.parentElement;
  const secoes = grid ? [...grid.children] : [];
  const largura = (el) => (el ? Math.round(el.getBoundingClientRect().width) : 0);
  return {
    secoes: secoes.length,
    esquerda: largura(secoes[0]),
    direita: largura(secoes[1]),
    proporcao: secoes[0] && secoes[1] ? Number((largura(secoes[0]) / largura(secoes[1])).toFixed(2)) : null,
    textos: [...document.querySelectorAll('h2')].map((h) => (h.textContent || '').trim()),
    barras: document.querySelectorAll('.recharts-rectangle').length,
    rotulosBarras: [...document.querySelectorAll('.recharts-label-list text')].map((t) => (t.textContent || '').trim()),
    eixos: [...document.querySelectorAll('.recharts-cartesian-axis-tick-value')].map((t) => (t.textContent || '').trim()),
    linhasTabela: document.querySelectorAll('tbody tr').length,
  };
});
console.log('ESTRUTURA', JSON.stringify(estrutura));

const sliderColaboradores = page.getByRole('slider', { name: 'Colaboradores' });
await sliderColaboradores.focus();
for (let i = 0; i < 3; i += 1) await page.keyboard.press('ArrowRight');
await page.waitForTimeout(700);
console.log(
  'SLIDER',
  JSON.stringify({
    valor: await sliderColaboradores.getAttribute('aria-valuenow'),
    rodape: await page
      .locator('section')
      .filter({ hasText: 'Resultados da simulação' })
      .first()
      .locator('footer')
      .innerText(),
  })
);

await page.getByRole('combobox', { name: /Cenário de simulação/ }).click();
await page.getByRole('option', { name: /Expansão Comercial/ }).click();
await page.waitForTimeout(900);
console.log(
  'CENARIO',
  JSON.stringify({
    colaboradores: await page.getByRole('slider', { name: 'Colaboradores' }).getAttribute('aria-valuenow'),
    salario: await page.getByRole('slider', { name: 'Salário médio' }).getAttribute('aria-valuenow'),
  })
);
await page.screenshot({ path: `${OUT}/desktop-1600-cenario-carregado.png` });

// Comparação: seleção padrão (1), depois desmarca e seleciona 2
const botaoComparar = page.getByRole('button', { name: /Selecionar cenários/ });
console.log(
  'COMPARACAO_INICIAL',
  JSON.stringify({ rotulo: (await botaoComparar.textContent())?.trim(), linhas: await page.locator('tbody tr').count() })
);
await botaoComparar.click();
await page.getByRole('menuitem', { name: /Cenário 1/ }).click();
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
console.log(
  'SEM_SELECAO',
  JSON.stringify({
    rotulo: (await botaoComparar.textContent())?.trim(),
    vazio: await page.getByText('Nenhum cenário selecionado').count(),
  })
);
await botaoComparar.click();
await page.getByRole('menuitem', { name: /Expansão Comercial/ }).click();
await page.waitForTimeout(300);
await page.getByRole('menuitem', { name: /Liderança Premium/ }).click();
await page.keyboard.press('Escape');
await page.waitForTimeout(600);
console.log(
  'DOIS_CENARIOS',
  JSON.stringify({
    rotulo: (await botaoComparar.textContent())?.trim(),
    linhas: await page.locator('tbody tr').count(),
    colunas: await page.locator('thead th').count(),
    tabela: await page.evaluate(() => {
      const t = document.querySelector('table');
      const c = t?.parentElement;
      return t && c
        ? {
            larguraTabela: Math.round(t.getBoundingClientRect().width),
            larguraContainer: Math.round(c.getBoundingClientRect().width),
            precisaScroll: t.scrollWidth > c.clientWidth + 1,
          }
        : null;
    }),
  })
);
await page.waitForTimeout(4200);
await page.screenshot({ path: `${OUT}/desktop-1600-comparacao.png` });

// Salvamento (modo demo: não grava, avisa)
await page.getByRole('button', { name: /Salvar cenário/ }).click();
await page.waitForTimeout(700);
console.log(
  'SALVAR',
  JSON.stringify({ toast: await page.getByText(/Modo demonstração/).first().textContent().catch(() => null) })
);

// Responsividade
for (const [nome, largura, altura] of [
  ['1280', 1280, 900],
  ['1024', 1024, 900],
  ['768', 768, 900],
  ['390', 390, 844],
]) {
  await page.setViewportSize({ width: largura, height: altura });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(900);
  const medidas = await page.evaluate(() => {
    const h2 = [...document.querySelectorAll('h2')].find((h) => /Configure seu cenário/.test(h.textContent || ''));
    const secao1 = h2?.closest('section');
    const grid = secao1?.parentElement;
    const secoes = grid ? [...grid.children] : [];
    const largura = (el) => (el ? Math.round(el.getBoundingClientRect().width) : 0);
    const estouro = [...document.querySelectorAll('section')].some((s) => s.scrollWidth > s.clientWidth + 1);
    return {
      esquerda: largura(secoes[0]),
      direita: largura(secoes[1]),
      larguraViewport: window.innerWidth,
      estouroInterno: estouro,
    };
  });
  console.log(`VIEWPORT ${nome}`, JSON.stringify(medidas));
  await page.screenshot({ path: `${OUT}/viewport-${nome}.png`, fullPage: false });
}

await context.close();
await browser.close();

