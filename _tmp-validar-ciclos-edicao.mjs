/**
 * Matriz de CICLOS (Todos os ciclos cadastrados): a lista mostra SOMENTE
 * "Editar feedback"; a fila mostra Ver/Devolver/Aprovar + prévia e mantém
 * altura compacta. Capturas por ciclo em tmp-feedbacks-edicao/ciclos/.
 * Uso: node _tmp-validar-ciclos-edicao.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'tmp-feedbacks-edicao/ciclos';
mkdirSync(OUT, { recursive: true });
const EMAIL = process.env.E2E_USER_EMAIL ?? 'admin@teste.local';
const SENHA = process.env.E2E_USER_PASSWORD ?? 'Admin@2026!';

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();

await page.route('**/rest/v1/rpc/get_user_roles', (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(['admin', 'gestor']) })
);

await page.goto('http://localhost:8080/login');
await page.evaluate(() => localStorage.setItem('dp-tour-completed', 'true'));
await page.getByLabel(/e-?mail/i).first().fill(EMAIL);
await page.getByLabel(/senha|password/i).first().fill(SENHA);
await page.getByRole('button', { name: /entrar|login|acessar/i }).first().click();
await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 });

await page.goto('http://localhost:8080/avaliacao');
await page.getByRole('tab', { name: /Feedbacks/i }).click();
await page.getByText('Avaliado por').first().waitFor({ timeout: 30000 });
await page.waitForTimeout(2600);

const grupo = () => page.getByRole('group', { name: 'Segmentar por tipo de feedback' });
const ciclo = () => page.getByRole('combobox').first();

async function ler() {
  return page.evaluate(() => {
    const texto = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
    const candidatos = Array.from(document.querySelectorAll('div.rounded-xl')).filter((d) =>
      Array.from(d.querySelectorAll('p')).some((p) => texto(p) === 'Avaliado por')
    );
    const raizes = candidatos.filter((d) => !candidatos.some((o) => o !== d && d.contains(o)));
    return raizes.map((card) => ({
      colaborador: texto(card.querySelector('h3')),
      altura: Math.round(card.getBoundingClientRect().height),
      acoes: Array.from(card.querySelectorAll('button')).map(texto).filter(Boolean),
      previa: Array.from(card.querySelectorAll('p')).some((p) => texto(p).startsWith('Fortes:')),
    }));
  });
}

// Abre o seletor de ciclo para descobrir os nomes disponíveis.
await ciclo().click();
const nomes = (await page.getByRole('option').allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim());
await page.keyboard.press('Escape');

const rel = { quando: new Date().toISOString(), ciclos: {} };
for (const nome of nomes) {
  const chave = nome.split(/\s{2,}|\d{2}\/\d{2}\/\d{4}/)[0].trim() || nome;
  await ciclo().click();
  await page.getByRole('option', { name: new RegExp(`^${chave.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }).first().click();
  await page.waitForTimeout(1500);

  await grupo().getByRole('button', { name: /^Todos/ }).click();
  await page.waitForTimeout(900);
  const lista = await ler();

  await grupo().getByRole('button', { name: /Aguardando gestor/ }).click();
  await page.waitForTimeout(1300);
  const fila = await ler();

  rel.ciclos[chave] = {
    listaCards: lista.length,
    listaAcoes: [...new Set(lista.flatMap((c) => c.acoes))],
    listaSoEdicao: lista.every((c) => c.acoes.length === 1 && c.acoes[0] === 'Editar feedback'),
    filaCards: fila.length,
    filaAcoes: [...new Set(fila.flatMap((c) => c.acoes))],
    filaTemEdicao: fila.some((c) => c.acoes.includes('Editar feedback')),
    filaAlturas: fila.map((c) => c.altura),
    filaComPrevia: fila.filter((c) => c.previa).length,
  };

  const seguro = chave.replace(/[^a-zA-Z0-9-]/g, '_');
  await page.screenshot({ path: `${OUT}/${seguro}-fila.png`, fullPage: true });
  await grupo().getByRole('button', { name: /^Todos/ }).click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${seguro}-lista.png`, fullPage: true });
}

writeFileSync(`${OUT}/matriz.json`, `${JSON.stringify(rel, null, 2)}\n`);
console.log(JSON.stringify(rel, null, 1));
await browser.close();
