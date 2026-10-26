/**
 * TEMPORÁRIO — valida os 3 ajustes visuais de Vagas: fundo navy uniforme nos
 * cards, espaçamento TabList→filtros→cards e remoção do glow do Nova Vaga.
 */
import { chromium } from '@playwright/test';

const b = await chromium.launch();
const c = await b.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1600, height: 1000 } });
await c.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-force-motion', 'on');
});
const p = await c.newPage();
const erros = [];
p.on('pageerror', (e) => erros.push(e.message));
await p.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1800);
await p.getByRole('tab', { name: 'Vagas', exact: true }).click();
await p.waitForTimeout(1800);

const dados = await p.evaluate(() => {
  const cards = [...document.querySelectorAll('[data-vaga-card]')];
  const toolbar = document.querySelector('[aria-label="Filtrar vagas por status"]').parentElement;
  const group = document.querySelector('[aria-label="Filtrar vagas por status"]');
  const grid = document.querySelector('[data-vagas-grid]');
  const tablist = document.querySelector('[role="tablist"]');
  const r = (el) => (el ? el.getBoundingClientRect() : null);
  const bordaDoCard = (card) => {
    const cs = getComputedStyle(card);
    return {
      bg: cs.backgroundColor,
      bgImage: cs.backgroundImage,
      borderColor: cs.borderTopColor,
      shadow: cs.boxShadow,
    };
  };
  return {
    tablistBottom: Math.round(r(tablist).bottom),
    toolbarTop: Math.round(r(toolbar).top),
    gapTablistFiltros: Math.round(r(toolbar).top - r(tablist).bottom),
    toolbarBottom: Math.round(r(toolbar).bottom),
    gridTop: Math.round(r(grid).top),
    gapFiltrosCards: Math.round(r(grid).top - r(toolbar).bottom),
    grupo: { x: Math.round(r(group).x), right: Math.round(r(group).right), h: Math.round(r(group).height) },
    dropdowns: ['Departamento', 'Modalidade', 'Status', 'Ordenar por'].map((nome) => {
      const el = document.querySelector(`[aria-label="${nome}"]`);
      return { nome, y: Math.round(r(el).y + r(el).height / 2) };
    }),
    chipY: [...group.querySelectorAll('button')].map((el) => Math.round(r(el).y + r(el).height / 2)),
    cards: cards.map((card) => ({
      id: card.getAttribute('data-vaga-card'),
      ...bordaDoCard(card),
      iconeCor: getComputedStyle(card.querySelector('span[aria-hidden]')).color,
      iconeBg: getComputedStyle(card.querySelector('span[aria-hidden]')).backgroundColor,
      badgeBg: getComputedStyle(card.querySelector('span.inline-flex')).backgroundColor,
      funilCores: [...card.querySelectorAll('[data-vaga-funil] .flex > span')].map(
        (s) => getComputedStyle(s).backgroundColor
      ),
    })),
  };
});

// Botão Nova Vaga — normal, hover e foco.
const botao = p.getByRole('button', { name: /Nova Vaga/i });
const medirBotao = () =>
  botao.evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      bg: cs.backgroundColor,
      color: cs.color,
      shadow: cs.boxShadow,
      filter: cs.filter,
      textShadow: cs.textShadow,
      h: Math.round(el.getBoundingClientRect().height),
      raio: cs.borderRadius,
      outline: cs.outlineStyle,
      outlineWidth: cs.outlineWidth,
      ring: cs.getPropertyValue('--tw-ring-shadow'),
    };
  });
const normal = await medirBotao();
await botao.hover();
await p.waitForTimeout(350);
const hover = await medirBotao();
await p.mouse.move(0, 0);
await p.waitForTimeout(200);
await botao.focus();
await p.waitForTimeout(250);
const foco = await medirBotao();

await p.screenshot({ path: 'tmp-turmas-fidelidade/vagas-neutro-1600.png', fullPage: false });
await p.locator('[data-vaga-card]').first().screenshot({ path: 'tmp-turmas-fidelidade/vagas-neutro-card.png' });
await p.screenshot({ path: 'tmp-turmas-fidelidade/vagas-neutro-botao.png', clip: { x: 1300, y: 0, width: 300, height: 140 } });

console.log(JSON.stringify({ dados, botao: { normal, hover, foco }, erros }, null, 2));
await b.close();
