import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const log = (...args) => console.error('[navegacao]', ...args);
const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1440, height: 900 },
});
await context.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
});

const page = await context.newPage();
page.setDefaultTimeout(60000);
const erros = [];

page.on('console', (msg) => {
  if (msg.type() === 'error') erros.push({ tipo: 'console', texto: msg.text(), url: page.url() });
});
page.on('pageerror', (e) => erros.push({ tipo: 'pageerror', texto: e.message, url: page.url() }));
page.on('response', (res) => {
  if (res.status() >= 400 && (res.url().includes('/src/') || res.url().includes('/node_modules/.vite/'))) {
    erros.push({ tipo: 'http', status: res.status(), texto: res.url(), url: page.url() });
  }
});

const etapas = [];
async function registrar(nome) {
  await page.waitForTimeout(1800);
  const estado = await page.evaluate(() => ({
    url: location.href,
    instabilidade: document.body.innerText.includes('Instabilidade Detectada'),
    titulo: document.title,
  }));
  // Interações reais na tabela/cards no mobile são cobertas pelo teste de tabela;
  // aqui o alvo é o carregamento de módulos e a navegação SPA.
  etapas.push({ nome, ...estado });
  log(nome, estado.url, estado.instabilidade ? 'FALHA' : 'ok');
}

log('goto dashboard');
await page.goto('http://localhost:8080/dashboard', { waitUntil: 'domcontentloaded', timeout: 60000 });
await registrar('dashboard');

const links = [
  ['Premiações', '/premiacoes'],
  ['Treinamentos', '/treinamentos'],
  ['Recrutamento', '/recrutamento'],
  ['Avaliação & Performance', '/avaliacao'],
  ['Colaboradores', '/colaboradores'],
];
for (const [nome, path] of links) {
  log('click', nome);
  await page.locator(`a[href="${path}"]`).first().click();
  await registrar(nome);
  if (!page.url().includes(path)) {
    log('AVISO: URL final', page.url(), 'esperado', path);
  }
}

log('voltar para Premiações');
await page.locator('a[href="/premiacoes"]').first().click();
await registrar('premiacoes-retorno');

log('F5 em /premiacoes');
await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
await registrar('premiacoes-f5');

// Segunda navegação direta para a mesma rota (simula novo acesso).
await page.goto('http://localhost:8080/premiacoes', { waitUntil: 'domcontentloaded', timeout: 60000 });
await registrar('premiacoes-direto');

const relevantes = erros.filter((e) =>
  /Failed to fetch|Outdated Optimize Dep|instabilidade|504|500|Failed to load resource/i.test(
    `${e.texto} ${e.status ?? ''}`
  )
);

const resultado = {
  etapas,
  totalErros: erros.length,
  errosRelevantes: relevantes,
  sucesso:
    etapas.every((e) => !e.instabilidade) &&
    relevantes.every((e) => !/dynamically imported module|Outdated Optimize Dep/i.test(e.texto)),
};
writeFileSync('tmp-auditoria/navegacao.json', JSON.stringify(resultado, null, 2), 'utf8');
await page.screenshot({ path: 'tmp-auditoria/navegacao-final.png' });
log(JSON.stringify(resultado, null, 2));

await context.close();
await browser.close();
