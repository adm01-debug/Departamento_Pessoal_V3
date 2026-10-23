import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const SAIDA = path.join(process.cwd(), 'tmp-animacao-modais');
mkdirSync(SAIDA, { recursive: true });
const state = JSON.parse(readFileSync('e2e/.auth/user.json', 'utf8'));
const browser = await chromium.launch();
const context = await browser.newContext({ storageState: state, viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
await page.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
await page.getByRole('tab', { name: 'Treinamentos' }).waitFor({ timeout: 30_000 });
await page.waitForTimeout(2000);

const resultados = [];
const falhas = [];

const irPara = async (aba) => {
  await page.getByRole('tab', { name: aba }).click();
  await page.waitForTimeout(650);
};

async function medirAnimacao(role = 'dialog') {
  const alvo = page.locator(`[role="${role}"]`).first();
  await alvo.waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForTimeout(80);
  const entrada = await page.evaluate((r) => {
    const el = document.querySelector(`[role="${r}"]`);
    if (!el) return null;
    const s = getComputedStyle(el);
    const overlay = [...document.querySelectorAll('div')].find(
      (d) => String(d.className).includes('fixed inset-0 z-50') && String(d.className).includes('backdrop-blur-sm')
    );
    return {
      transform: s.transform,
      opacity: s.opacity,
      overlayOpacidade: overlay ? getComputedStyle(overlay).opacity : null,
      overlayBlur: overlay ? getComputedStyle(overlay).backdropFilter : null,
    };
  }, role);
  await page.waitForTimeout(1000);
  const final = await page.evaluate((r) => {
    const el = document.querySelector(`[role="${r}"]`);
    if (!el) return null;
    const s = getComputedStyle(el);
    return { transform: s.transform, opacity: s.opacity };
  }, role);
  return { entrada, final };
}

async function fechar(role = 'dialog', via = 'escape') {
  if (via === 'escape') {
    await page.keyboard.press('Escape');
  } else {
    await page.getByRole('button', { name: via, exact: true }).click();
  }
  await page.waitForTimeout(40);
  const imediato = await page.locator(`[role="${role}"]`).count();
  await page.waitForTimeout(role === 'alertdialog' ? 1300 : 1800);
  const depois = await page.locator(`[role="${role}"]`).count();
  return { imediato, depois };
}

async function testar({ nome, abrir, role = 'dialog', via = 'escape', slug }) {
  try {
    await abrir();
    const anim = await medirAnimacao(role);
    await page.screenshot({ path: path.join(SAIDA, `${slug}.png`) });
    const fechamento = await fechar(role, via);
    const passou = !!anim?.entrada && !!anim?.final && fechamento.imediato === 1 && fechamento.depois === 0;
    resultados.push({ nome, role, ...anim, fechamento, passou });
    if (!passou) falhas.push(nome);
    await page.waitForTimeout(250);
  } catch (erro) {
    falhas.push(`${nome}: ${erro.message}`);
    resultados.push({ nome, erro: erro.message });
  }
}

await testar({
  nome: 'Novo Treinamento',
  slug: 'novo-treinamento',
  abrir: () => page.getByRole('button', { name: 'Novo Treinamento' }).first().click(),
});

await irPara('Catálogo');
await testar({
  nome: 'Novo Curso',
  slug: 'novo-curso',
  abrir: () => page.getByRole('button', { name: 'Novo Curso' }).click(),
});
await testar({
  nome: 'Detalhes do Curso',
  slug: 'detalhes-curso',
  abrir: () => page.getByRole('button', { name: /Ver curso / }).first().click(),
});
await page.getByRole('button', { name: /Ações do curso / }).first().click();
await page.getByRole('menuitem', { name: 'Excluir curso' }).click();
await page.waitForTimeout(80);
{
  const anim = await medirAnimacao('alertdialog');
  await page.screenshot({ path: path.join(SAIDA, 'confirmar-curso.png') });
  const fechamento = await fechar('alertdialog', 'Cancelar');
  const passou = !!anim?.entrada && fechamento.imediato === 1 && fechamento.depois === 0;
  resultados.push({ nome: 'Confirmar exclusão de curso', role: 'alertdialog', ...anim, fechamento, passou });
  if (!passou) falhas.push('Confirmar exclusão de curso');
}

await irPara('Trilhas');
await testar({
  nome: 'Nova Trilha',
  slug: 'nova-trilha',
  abrir: () => page.getByRole('button', { name: 'Nova Trilha' }).click(),
});
await testar({
  nome: 'Detalhes da Trilha',
  slug: 'detalhes-trilha',
  abrir: () => page.getByRole('button', { name: 'Explorar trilha' }).first().click(),
});
await page.getByRole('button', { name: 'Explorar trilha' }).first().click();
await page.waitForTimeout(1000);
await testar({
  nome: 'Adicionar Curso à Trilha',
  slug: 'adicionar-curso-trilha',
  abrir: () => page.getByRole('button', { name: 'Adicionar Curso' }).click(),
});
await page.keyboard.press('Escape');
await page.waitForTimeout(1200);
await page.getByRole('button', { name: /Ações de / }).first().click();
await page.getByRole('menuitem', { name: 'Excluir trilha' }).click();
await page.waitForTimeout(80);
{
  const anim = await medirAnimacao('alertdialog');
  await page.screenshot({ path: path.join(SAIDA, 'confirmar-trilha.png') });
  const fechamento = await fechar('alertdialog', 'Cancelar');
  const passou = !!anim?.entrada && fechamento.imediato === 1 && fechamento.depois === 0;
  resultados.push({ nome: 'Confirmar exclusão de trilha', role: 'alertdialog', ...anim, fechamento, passou });
  if (!passou) falhas.push('Confirmar exclusão de trilha');
}

await irPara('Inscrições');
await testar({
  nome: 'Nova Inscrição',
  slug: 'nova-inscricao',
  abrir: () => page.getByRole('button', { name: 'Nova Inscrição' }).click(),
});
await testar({
  nome: 'Prévia de Certificado (Inscrições)',
  slug: 'certificado-inscricoes',
  abrir: () => page.getByRole('button', { name: /^Certificado$/ }).first().click(),
});

await irPara('Turmas / Instâncias');
await testar({
  nome: 'Nova Turma',
  slug: 'nova-turma',
  abrir: () => page.getByRole('button', { name: 'Nova Turma' }).first().click(),
});
await testar({
  nome: 'Detalhes da Turma',
  slug: 'detalhes-turma',
  abrir: () => page.getByRole('button', { name: /Ver turma / }).first().click(),
});

await irPara('Certificados');
await testar({
  nome: 'Prévia de Certificado',
  slug: 'certificado',
  abrir: () => page.getByRole('button', { name: /Visualizar certificado/ }).first().click(),
});

await irPara('Treinamentos');
await page.getByRole('button', { name: /Ações de / }).first().click();
await page.getByRole('menuitem', { name: 'Excluir treinamento' }).click();
await page.waitForTimeout(80);
{
  const anim = await medirAnimacao('alertdialog');
  await page.screenshot({ path: path.join(SAIDA, 'confirmar-treinamento.png') });
  const fechamento = await fechar('alertdialog', 'Cancelar');
  const passou = !!anim?.entrada && fechamento.imediato === 1 && fechamento.depois === 0;
  resultados.push({ nome: 'Confirmar exclusão de treinamento', role: 'alertdialog', ...anim, fechamento, passou });
  if (!passou) falhas.push('Confirmar exclusão de treinamento');
}

console.log(JSON.stringify({ resultados, falhas }, null, 2));
await context.close();
await browser.close();
