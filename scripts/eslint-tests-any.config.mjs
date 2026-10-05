/**
 * Config mínima do ratchet de `any` em TESTES (E51-029).
 *
 * O eslint.config.js ignora **\/*.test.* e __tests__/** globalmente — esses
 * ~2.3k `any` ficam invisíveis ao lint:ci. Esta config roda APENAS a regra
 * no-explicit-any sobre os globs de teste, para scripts/ratchet-any-tests.mjs
 * medir a dívida sem reabilitar o resto do ruleset em testes.
 */
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist', 'build', 'coverage', 'e2e'],
  },
  {
    extends: [tseslint.configs.base],
    // noInlineConfig: um `eslint-disable` dentro do teste não pode esconder
    // `any` do ratchet — sem isso a contagem era burlável com um comentário.
    linterOptions: { noInlineConfig: true },
    files: [
      'src/**/*.test.{ts,tsx}',
      'src/**/*.spec.{ts,tsx}',
      'src/**/__tests__/**/*.{ts,tsx}',
      'src/**/__mocks__/**/*.{ts,tsx}',
      // Helpers/fixtures fora dos padrões *.test/__tests__ — antes uma zona
      // cega onde `any` crescia invisível (src/test/, src/tests/).
      'src/test/**/*.{ts,tsx}',
      'src/tests/**/*.{ts,tsx}',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  }
);
