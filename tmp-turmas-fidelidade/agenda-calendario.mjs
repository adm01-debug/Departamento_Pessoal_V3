/**
 * TEMPORÁRIO — valida o rodapé “Ver calendário completo” e o modal mensal.
 */
import { chromium } from '@playwright/test';

const larguras = process.argv.slice(2).map(Number);
const alvos = larguras.length ? larguras : [1600, 1280, 1024, 768, 390];
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
  await p.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1800);
  await p.getByRole('tab', { name: 'Turmas' }).click();
  await p.waitForTimeout(2200);

  const painel = await p.evaluate(() => {
    const r = (el) => (el ? el.getBoundingClientRect() : null);
    const section = document.querySelector('[data-turmas-agenda]');
    const header = section?.querySelector('header');
    const lista = section?.querySelector('[data-agenda-lista]');
    const dias = [...(section?.querySelectorAll('[data-agenda-dia]') ?? [])];
    const botao = [...(section?.querySelectorAll('button') ?? [])].find((b) =>
      /ver calendário completo/i.test(b.textContent ?? '')
    );
    const wrap = botao?.parentElement;
    const style = section ? getComputedStyle(section) : null;
    const pRect = r(section);
    const bRect = r(botao);
    const padL = parseFloat(style?.paddingLeft ?? '0');
    const padR = parseFloat(style?.paddingRight ?? '0');
    const padB = parseFloat(style?.paddingBottom ?? '0');
    const listaRect = r(lista);
    const ultimoDia = dias.length ? r(dias[dias.length - 1]) : null;
    return {
      painel: pRect && { x: Math.round(pRect.x), y: Math.round(pRect.y), w: Math.round(pRect.width), h: Math.round(pRect.height) },
      headerH: header ? Math.round(r(header).height) : null,
      lista: listaRect && { h: Math.round(listaRect.height), bottom: Math.round(listaRect.bottom) },
      dias: dias.map((d) => Math.round(r(d).height)),
      botao: bRect && { x: Math.round(bRect.x), w: Math.round(bRect.width), h: Math.round(bRect.height), bottom: Math.round(bRect.bottom) },
      botaoLarguraConteudo: bRect ? Math.round(pRect.width - padL - padR) : null,
      gapUltimoDia: botao && ultimoDia && wrap ? Math.round(r(wrap).top - ultimoDia.bottom) : null,
      botaoDentroDoPainel: bRect && pRect ? bRect.bottom <= pRect.bottom - padB + 1 && bRect.top >= pRect.top : null,
      scrollPainel: section ? section.scrollHeight - section.clientHeight : null,
      scrollLista: lista ? lista.scrollHeight - lista.clientHeight : null,
      overflowDoc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      colunas: [...document.querySelectorAll('[data-turmas-coluna]')].map((col) => Math.round(col.getBoundingClientRect().height)),
      linhaGrid: section?.parentElement ? Math.round(section.parentElement.getBoundingClientRect().height) : null,
    };
  });

  await p.locator('[data-turmas-agenda]').screenshot({ path: `tmp-turmas-fidelidade/agenda-${width}.png` });

  let modal = null;
  if (width === 1600 || width === 1024 || width === 390) {
    await p.getByRole('button', { name: /ver calendário completo/i }).click();
    await p.waitForTimeout(1700);
    modal = await p.evaluate(() => {
      const dialogs = [...document.querySelectorAll('[role="dialog"]')];
      const d = dialogs[0];
      const r = d?.getBoundingClientRect();
      const dias = d?.querySelectorAll('[data-calendario-dia]') ?? [];
      const eventos = d?.querySelectorAll('[data-calendario-turma]') ?? [];
      const primeiraCelula = dias[0];
      const cRect = primeiraCelula?.getBoundingClientRect();
      const grade = d?.querySelector('[data-calendario-dia]')?.parentElement;
      return {
        dialogs: dialogs.length,
        titulo: d?.querySelector('h2')?.textContent?.trim() ?? null,
        mes: d?.querySelector('[data-calendario-mes]')?.textContent?.trim() ?? null,
        dias: dias.length,
        eventos: eventos.length,
        listaMes: !!d?.querySelector('[data-calendario-lista-mes]'),
        celula: {
          h: cRect ? Math.round(cRect.height) : null,
          minH: primeiraCelula ? getComputedStyle(primeiraCelula).minHeight : null,
        },
        gradeH: grade ? Math.round(grade.getBoundingClientRect().height) : null,
        rect: r && { top: Math.round(r.top), bottom: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) },
        scroll: d ? d.scrollHeight - d.clientHeight : null,
        dentroViewport: r ? r.top >= -1 && r.bottom <= window.innerHeight + 1 : null,
        textoVisivel: !!d?.innerText?.includes('Calendário de turmas'),
      };
    });
    await p.screenshot({ path: `tmp-turmas-fidelidade/calendario-${width}.png`, fullPage: true });

    if (width === 1600) {
      await p.locator('[data-calendario-turma]').first().click();
      await p.waitForTimeout(1700);
      modal.detalhe = await p.evaluate(() => {
        const dialogs = [...document.querySelectorAll('[role="dialog"]')];
        return { dialogs: dialogs.length, texto: dialogs.at(-1)?.innerText.split('\n').slice(0, 4) };
      });
      await p.screenshot({ path: 'tmp-turmas-fidelidade/calendario-detalhe-1600.png', fullPage: true });
      await p.keyboard.press('Escape');
      await p.waitForTimeout(1900);
      modal.aposFecharDetalhe = await p.evaluate(() => document.querySelectorAll('[role="dialog"]').length);
      await p.keyboard.press('Escape');
      await p.waitForTimeout(1900);
      modal.aposFecharCalendario = await p.evaluate(() => document.querySelectorAll('[role="dialog"]').length);
    }
  }

  saida.push({ width, painel, modal });
  await c.close();
}

console.log(JSON.stringify(saida, null, 2));
await b.close();
