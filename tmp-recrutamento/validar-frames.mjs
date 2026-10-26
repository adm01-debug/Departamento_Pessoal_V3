import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const PASTA = 'tmp-recrutamento/animacoes';
const b64 = (nome) => `data:image/jpeg;base64,${readFileSync(`${PASTA}/${nome}`).toString('base64')}`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<canvas id="c" width="1200" height="800"></canvas>');

const diff = async (a, b) => {
  const da = b64(a);
  const db = b64(b);
  return page.evaluate(
    async ({ da, db }) => {
      const carregar = (src) =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });
      const canvas = document.getElementById('c');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const [ia, ib] = await Promise.all([carregar(da), carregar(db)]);
      canvas.width = ia.width;
      canvas.height = ia.height;
      ctx.drawImage(ia, 0, 0);
      const pa = ctx.getImageData(0, 0, ia.width, ia.height).data;
      ctx.drawImage(ib, 0, 0);
      const pb = ctx.getImageData(0, 0, ia.width, ia.height).data;
      let soma = 0;
      let naoPreto = 0;
      for (let i = 0; i < pa.length; i += 4) {
        soma += Math.abs(pa[i] - pb[i]) + Math.abs(pa[i + 1] - pb[i + 1]) + Math.abs(pa[i + 2] - pb[i + 2]);
        if (pa[i] + pa[i + 1] + pa[i + 2] > 40) naoPreto += 1;
      }
      const pixels = pa.length / 4;
      return { diffMedio: +(soma / pixels / 3).toFixed(2), cobertura: +((naoPreto / pixels) * 100).toFixed(1) };
    },
    { da, db }
  );
};

console.log('ADM t0→final', await diff('admissao-t0.jpg', 'admissao-final.jpg'));
console.log('REC t0→final', await diff('recrutamento-t0.jpg', 'recrutamento-final.jpg'));
console.log('ADM t0→t2', await diff('admissao-t0.jpg', 'admissao-t2.jpg'));
console.log('REC t0→t2', await diff('recrutamento-t0.jpg', 'recrutamento-t2.jpg'));
console.log('t0 ADM×REC', await diff('admissao-t0.jpg', 'recrutamento-t0.jpg'));
console.log('final ADM×REC', await diff('admissao-final.jpg', 'recrutamento-final.jpg'));

await browser.close();
