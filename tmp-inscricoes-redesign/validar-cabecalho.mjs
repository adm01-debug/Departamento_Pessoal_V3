import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const state = JSON.parse(readFileSync('e2e/.auth/user.json', 'utf8'));
const browser = await chromium.launch();
const context = await browser.newContext({ storageState: state, viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
await page.addInitScript(() => localStorage.setItem('ui-theme', 'dark'));
await page.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
await page.getByRole('tab', { name: 'Inscrições' }).waitFor({ timeout: 30_000 });
await page.waitForTimeout(1800);

const botoes = () => page.getByRole('button').evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()).filter(Boolean));
const resultado = {};
resultado.treinamentos = {
  novaInscricao: await page.getByRole('button', { name: 'Nova Inscrição' }).count(),
  novoTreinamento: await page.getByRole('button', { name: 'Novo Treinamento' }).count(),
};

await page.getByRole('tab', { name: 'Inscrições' }).click();
await page.waitForTimeout(1300);
resultado.inscricoes = {
  novaInscricao: await page.getByRole('button', { name: 'Nova Inscrição' }).count(),
  novoTreinamento: await page.getByRole('button', { name: 'Novo Treinamento' }).count(),
};

resultado.geometria = await page.evaluate(() => {
  const r = (el) => { const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), bottom: Math.round(b.bottom) }; };
  const botao = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('Nova Inscrição'));
  const filtros = document.querySelector('[aria-label="Buscar inscrições por colaborador ou curso"]');
  const tablist = document.querySelector('[data-treinamentos-tablist]');
  const main = document.querySelector('main');
  return {
    botao: r(botao),
    filtros: r(filtros),
    tablist: r(tablist),
    gapTabFiltro: Math.round(filtros.getBoundingClientRect().top - tablist.getBoundingClientRect().bottom),
    botaoNoPainel: !!document.querySelector('[aria-label="Buscar inscrições por colaborador ou curso"]')?.parentElement?.previousElementSibling?.querySelector('button'),
    docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    mainOverflow: main.scrollWidth - main.clientWidth,
  };
});

await page.getByRole('button', { name: 'Nova Inscrição' }).click();
await page.waitForTimeout(500);
resultado.modal = {
  aberto: await page.getByRole('dialog').count(),
  titulo: await page.getByRole('dialog').getByText('Inscrever Colaborador').count(),
  campos: await page.getByRole('dialog').getByRole('combobox').count(),
  botaoInscrever: await page.getByRole('dialog').getByRole('button', { name: 'Inscrever' }).count(),
};
await page.screenshot({ path: 'tmp-inscricoes-redesign/nova-inscricao-cabecalho-1440.png' });
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
resultado.modal.fechouComEsc = (await page.getByRole('dialog').count()) === 0;
resultado.totalBotoes = await botoes();

const trocar = async (aba) => {
  await page.getByRole('tab', { name: aba }).click();
  await page.waitForTimeout(500);
  return {
    novaInscricao: await page.getByRole('button', { name: 'Nova Inscrição' }).count(),
    novoTreinamento: await page.getByRole('button', { name: 'Novo Treinamento' }).count(),
    novaTrilha: await page.getByRole('button', { name: 'Nova Trilha' }).count(),
    novoCurso: await page.getByRole('button', { name: 'Novo Curso' }).count(),
  };
};
resultado.porAba = {
  Treinamentos: await trocar('Treinamentos'),
  Catálogo: await trocar('Catálogo'),
  Trilhas: await trocar('Trilhas'),
  'Turmas / Instâncias': await trocar('Turmas / Instâncias'),
  Certificados: await trocar('Certificados'),
};

await page.getByRole('tab', { name: 'Inscrições' }).click();
await page.waitForTimeout(900);
await page.screenshot({ path: 'tmp-inscricoes-redesign/inscricoes-cabecalho-1440.png' });
resultado.botoesFinal = await botoes();
console.log(JSON.stringify(resultado, null, 2));

// Mobile: cabeçalho e um único botão.
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(900);
await page.evaluate(() => { window.scrollTo(0, 0); document.querySelector('main')?.scrollTo(0, 0); });
resultado.mobile = await page.evaluate(() => {
  const r = (el) => { const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
  const botao = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('Nova Inscrição'));
  return { botao: r(botao), docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
});
resultado.mobile.novaInscricao = await page.getByRole('button', { name: 'Nova Inscrição' }).count();
await page.screenshot({ path: 'tmp-inscricoes-redesign/inscricoes-cabecalho-390.png' });

await context.close();
await browser.close();
