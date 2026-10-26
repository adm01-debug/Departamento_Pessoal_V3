import { chromium } from '@playwright/test';

const alvos = [1920, 1600, 1440, 1366, 1280, 1024, 768, 390];
const b = await chromium.launch();
const saida = [];
for (const width of alvos) {
  const c = await b.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width, height: 900 } });
  await c.addInitScript(() => {
    localStorage.setItem('dp-tour-completed', 'true');
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-force-motion', 'on');
  });
  const p = await c.newPage();
  await p.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1600);
  await p.getByRole('tab', { name: 'Vagas', exact: true }).click();
  await p.waitForTimeout(2400);
  const dados = await p.evaluate(() => {
    const r = (el) => (el ? el.getBoundingClientRect() : null);
    const cs = (el) => (el ? getComputedStyle(el) : null);
    return {
      docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      cards: [...document.querySelectorAll('[data-vaga-card]')].map((card) => {
        const titulo = card.querySelector('h3');
        const comp = titulo?.nextElementSibling?.nextElementSibling;
        const funil = card.querySelector('[data-vaga-funil]');
        const botao = card.querySelector('button[aria-label^="Gerenciar vaga"]');
        const atividade = card.querySelector('div.mt-auto span span');
        const labels = [...(funil?.querySelectorAll('.grid > div') ?? [])];
        return {
          id: card.getAttribute('data-vaga-card'),
          h: Math.round(r(card).height),
          w: Math.round(r(card).width),
          overflow: card.scrollWidth - card.clientWidth,
          tituloH: titulo ? Math.round(r(titulo).height) : null,
          compH: comp ? Math.round(r(comp).height) : null,
          funilTop: funil ? Math.round(r(funil).top) : null,
          funilH: funil ? Math.round(r(funil).height) : null,
          botaoTop: botao ? Math.round(r(botao).top) : null,
          botaoBottomInset: botao ? Math.round(r(card).bottom - r(botao).bottom) : null,
          labels: labels.map((l) => {
            const span = l.querySelector('span');
            return span ? { texto: span.textContent, truncado: span.scrollWidth > span.clientWidth } : null;
          }),
          cores: {
            titulo: cs(titulo)?.color,
            dept: cs(card.querySelector('.mt-1.flex'))?.color,
            temporal: cs(card.querySelector('.truncate.text-\\[10px\\]'))?.color,
            atividade: cs(atividade)?.color,
            botaoBorda: cs(botao)?.borderTopColor,
            botaoFundo: cs(botao)?.backgroundColor,
            faixa: cs(card)?.borderTopColor,
          },
        };
      }),
    };
  });
  saida.push({ width, ...dados });
  await c.close();
}
console.log(JSON.stringify(saida, null, 2));
await b.close();
