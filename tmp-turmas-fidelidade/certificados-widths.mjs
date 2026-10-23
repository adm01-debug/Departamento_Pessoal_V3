import { chromium } from '@playwright/test';
const b = await chromium.launch();
const c = await b.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1280, height: 900 } });
const p = await c.newPage();
await p.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1800);
await p.getByRole('tab', { name: 'Certificados' }).click();
await p.waitForTimeout(2000);
const dados = await p.evaluate(() => {
  const larguraTexto = (el) => {
    if (!el) return null;
    const range = document.createRange();
    range.selectNodeContents(el);
    return Math.ceil(range.getBoundingClientRect().width);
  };
  return [...document.querySelectorAll('[data-certificado-card]')].map((card) => {
    const dl = card.querySelector('[data-certificado-metadados]');
    const emissao = dl.querySelector('[data-meta="emissao"] dd');
    const val = dl.querySelector('[data-meta="validade"] dd span');
    const det = dl.querySelector('[data-validade-detalhe]');
    const cod = dl.querySelector('[data-meta="codigo"] dd span');
    const copy = dl.querySelector('[data-meta="codigo"] button');
    const col = (nome) => dl.querySelector(`[data-meta="${nome}"]`).getBoundingClientRect().width;
    return {
      id: card.getAttribute('data-certificado-card'),
      dlW: dl.clientWidth,
      cols: [col('emissao'), col('validade'), col('codigo')].map((n) => Math.round(n * 10) / 10),
      emissao: { cliente: emissao.clientWidth, texto: larguraTexto(emissao), label: emissao.textContent },
      validade: { cliente: val.clientWidth, texto: larguraTexto(val), label: val.textContent },
      detalhe: det ? { cliente: det.clientWidth, texto: larguraTexto(det), label: det.textContent } : null,
      code: { cliente: cod.clientWidth, texto: larguraTexto(cod), label: cod.textContent },
      copyW: copy ? Math.round(copy.getBoundingClientRect().width) : null,
    };
  });
});
console.log(JSON.stringify(dados, null, 2));
await b.close();
