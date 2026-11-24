// V15-448
//
// Ordem importa: `@tailwindcss/postcss` gera as utilities e o
// `postcss-escala-rem` (logo depois) converte para `rem` as que foram escritas
// com `px` absoluto — é assim que a base rem do `src/index.css` governa TODA a
// densidade do sistema, sem editar classe por classe. Ver o cabeçalho do
// plugin para o que ele toca e o que ele deixa intacto.
import tailwindcss from '@tailwindcss/postcss';
import escalaRemArbitraria from './scripts/postcss-escala-rem.mjs';

export default {
  plugins: [tailwindcss(), escalaRemArbitraria()],
};
