/**
 * PROBE TEMPORÁRIO (apagar no fim).
 * Compila `src/index.css` com o MESMO pipeline do app (`@tailwindcss/postcss`,
 * Tailwind v4 + `@config ../tailwind.config.js`) para conferir, no CSS real,
 * quais utilitários do novo fundo dos cards foram de fato gerados.
 */
import fs from 'node:fs';
import postcss from 'postcss';
import * as tailwindMod from '@tailwindcss/postcss';

const from = 'src/index.css';
const css = fs.readFileSync(from, 'utf8');
const raw = tailwindMod.default ?? tailwindMod;
const plugin = typeof raw === 'function' ? raw() : raw;

const result = await postcss([plugin]).process(css, { from });
fs.writeFileSync('tmp-tailwind-probe.css', result.css);
console.log('CSS gerado:', result.css.length, 'bytes');
