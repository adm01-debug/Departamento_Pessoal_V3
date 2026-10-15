/** TEMPORÁRIO — reabrir um dia recolhido cascateia SÓ os eventos dele. */
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1600, height: 1000 },
});
const page = await context.newPage();
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
await page.goto('http://localhost:8080/avaliacao', { waitUntil: 'domcontentloaded' });
await page.locator('[role="tablist"]').first().waitFor({ timeout: 25000 });
await page.getByRole('tab', { name: /Auditoria/i }).first().click();
await page.waitForTimeout(7000); // deixa a cascata inicial terminar

const opacidades = () =>
  page.evaluate(() => ({
    cabecalhos: [...document.querySelectorAll('[data-cascata-cabecalho]')].map((el) => ({
      g: el.getAttribute('data-cascata-cabecalho'),
      o: +(+getComputedStyle(el).opacity).toFixed(2),
    })),
    eventos: [...document.querySelectorAll('[data-cascata-evento]')].map((el) => ({
      g: el.getAttribute('data-cascata-evento'),
      o: +(+getComputedStyle(el).opacity).toFixed(2),
    })),
  }));

const depoisDaCascata = await opacidades();

// Recolhe "Ontem" (dia 1) e reabre.
const cabecalhoOntem = page.locator('[data-cascata-cabecalho="1"]');
await cabecalhoOntem.click();
await page.waitForTimeout(400);
const recolhido = await opacidades();
await cabecalhoOntem.click();
await page.waitForTimeout(250);
const reabertoInicio = await opacidades();
await page.waitForTimeout(1200);
const reabertoFim = await opacidades();

console.log(
  JSON.stringify(
    {
      todosVisiveisAntes: [...depoisDaCascata.cabecalhos, ...depoisDaCascata.eventos].every((x) => x.o === 1),
      recolhido_eventosDoDia1: recolhido.eventos.filter((e) => e.g === '1').length,
      reabertoInicio: {
        eventosDia1: reabertoInicio.eventos.filter((e) => e.g === '1').map((e) => e.o),
        outrosCabecalhos: reabertoInicio.cabecalhos.filter((c) => c.g !== '1').map((c) => c.o),
        outrosEventos: reabertoInicio.eventos.filter((e) => e.g !== '1').map((e) => e.o),
      },
      reabertoFim: {
        eventosDia1: reabertoFim.eventos.filter((e) => e.g === '1').map((e) => e.o),
      },
    },
    null,
    2
  )
);
await browser.close();
