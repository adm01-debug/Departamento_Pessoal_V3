import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const iniciarMonitor = () => {
  const s = { min: 1, max: 0, amostras: 0, primeiroResetEm: null, t0: performance.now() };
  window.__mon = s;
  const loop = (t) => {
    const linha = document.querySelector('table tbody tr');
    if (linha) {
      const o = Number(getComputedStyle(linha).opacity);
      s.amostras += 1;
      s.min = Math.min(s.min, o);
      s.max = Math.max(s.max, o);
      if (o < 0.99 && s.primeiroResetEm == null) s.primeiroResetEm = Math.round(t - s.t0);
    }
    if (t - s.t0 < 1700) requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
};

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1440, height: 900 },
});
await context.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-force-motion', 'on');
});
const page = await context.newPage();
page.setDefaultTimeout(60000);
const erros = [];
page.on('pageerror', (e) => erros.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') erros.push(m.text());
});

await page.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
await page.getByRole('tab', { name: 'Candidatos', exact: true }).click();
await page.locator('table tbody tr').first().waitFor({ state: 'attached' });
await page.waitForTimeout(1800);

const resultados = [];
async function medir(nome, acao, esperaReanimar) {
  await page.evaluate(iniciarMonitor);
  await acao();
  await page.waitForTimeout(1850);
  const m = await page.evaluate(() => window.__mon);
  resultados.push({
    nome,
    esperaReanimar,
    minOpacidade: Number(m.min.toFixed(3)),
    maxOpacidade: Number(m.max.toFixed(3)),
    reanimou: m.min < 0.9,
    amostras: m.amostras,
  });
}

const nomesAntes = await page.locator('table tbody tr td:nth-child(2)').allInnerTexts();
const linha0 = page.locator('table tbody tr').first();

await medir('hover na linha', () => linha0.hover(), false);
await medir('checkbox da linha', () => linha0.getByRole('checkbox').click(), false);
await medir('abrir menu de ações', () => linha0.getByRole('button', { name: /Ações de/ }).click(), false);
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
await medir('abrir perfil', () => linha0.getByRole('button', { name: /Ver perfil de/ }).click(), false);
const dialogoAberto = await page.getByRole('dialog').isVisible().catch(() => false);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
const dialogoFechado = !(await page.getByRole('dialog').isVisible().catch(() => false));
await medir('retorno do perfil', async () => {}, false);

await medir('filtro Contratados', () => page.getByRole('button', { name: /Contratados/ }).click(), true);
await page.waitForTimeout(700);
await medir('filtro Todos', () => page.getByRole('button', { name: /Todos\s*12/ }).click(), true);
await page.waitForTimeout(700);

await medir('paginação próxima', () => page.getByRole('button', { name: 'Próxima página' }).click(), true);
await page.waitForTimeout(700);
await medir('paginação anterior', () => page.getByRole('button', { name: 'Página anterior' }).click(), true);
await page.waitForTimeout(700);

await page.getByRole('tab', { name: 'Pipeline', exact: true }).click();
await page.waitForTimeout(500);
await medir('retorno à aba Candidatos', () => page.getByRole('tab', { name: 'Candidatos', exact: true }).click(), true);

const nomesDepois = await page.locator('table tbody tr td:nth-child(2)').allInnerTexts();
const cabecalho = await page.evaluate(() => {
  const th = document.querySelector('table thead tr');
  const cs = getComputedStyle(th);
  return { opacidade: Number(cs.opacity), transform: cs.transform };
});

const resumo = {
  resultados,
  dialogoAberto,
  dialogoFechado,
  ordemPreservada: JSON.stringify(nomesAntes) === JSON.stringify(nomesDepois),
  cabecalho,
  semErro: !erros.some((e) => /Instabilidade Detectada|Failed to fetch dynamically imported module/i.test(e)),
  errosRelevantes: erros.filter((e) => /Instabilidade|Failed to fetch dynamically|Outdated Optimize/i.test(e)),
};
writeFileSync('tmp-anim-candidatos/interacoes.json', JSON.stringify(resumo, null, 2), 'utf8');
console.log(JSON.stringify(resumo, null, 2));
await browser.close();
