import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'build',
      '.next',
      'out',
      'coverage',
      '.nyc_output',
      'cypress',
      'e2e',
      '**/*.test.{ts,tsx,js,jsx}',
      '**/*.spec.{ts,tsx,js,jsx}',
      '**/__tests__/**',
      '**/__mocks__/**',
      '**/tests/**',
      '**/test/**',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': 'off',
      // Dívida medida, não permitida por padrão. scripts/ratchet-any.mjs
      // mantém um orçamento por diretório que só pode diminuir (E51-025);
      // "warn" (não "error") porque lint:ci já impõe o teto via
      // --max-warnings, e o ratchet reprova qualquer diretório que suba.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-empty-object-type': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      // Regras do React Compiler (eslint-plugin-react-hooks v6+): sinalizam padrões
      // que o compiler não consegue otimizar com segurança. Tratamos como aviso
      // (adoção incremental) — visíveis como dívida técnica sem bloquear o CI,
      // no mesmo espírito de exhaustive-deps/only-export-components acima.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      // Guard anti-regressão do bug de timezone (turno anterior). O padrão
      // `new Date().toISOString().split('T')[0]` grava a data em UTC — usuários
      // em UTC-3 registrando à noite salvam o dia seguinte no banco. Sempre use
      // `todayLocalISO()` / `formatDateLocalISO()` de `@/utils/dateLocal`.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.object.callee.property.name='toISOString'][callee.property.name=/^(split|substring|substr|slice)$/]",
          message:
            "Não use `.toISOString().split('T')[0]` para gerar data local — causa off-by-one em fusos negativos. Use `todayLocalISO()` ou `formatDateLocalISO()` de `@/utils/dateLocal`.",
        },
        {
          // Bloqueia `supabase.rpc('foo' as never, ...)` e `.from('bar' as never)`.
          // Se o TypeScript não conhece a RPC/tabela, é sinal de que os tipos
          // precisam ser regenerados — não de suprimir o erro com `as never`.
          selector:
            "CallExpression[callee.property.name=/^(rpc|from)$/] > TSAsExpression[typeAnnotation.type='TSNeverKeyword']",
          message:
            'Não use `as never` em supabase.rpc()/.from() — anula o type-check do argumento. Regenere `src/integrations/supabase/types.ts` (as RPCs/tabelas já estão tipadas).',
        },
      ],
    },
  },
  {
    // O próprio utilitário canônico e as edge functions (Deno, server-side em UTC)
    // podem usar `toISOString()` livremente — não representam o bug de fuso local.
    files: ['src/utils/dateLocal.ts', 'supabase/functions/**/*.ts'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },

  {
    // `no-explicit-any` (E51-025) tem orçamento e gate (scripts/ratchet-any.mjs)
    // apenas para src/**. `lint:edge` roda com --max-warnings=0 sobre
    // supabase/functions e não tem ratchet equivalente ainda (E51-029, etapa
    // separada); sem este override, ligar a regra globalmente reprovaria
    // lint:edge nos ~52 `any` pré-existentes ali, fora do escopo desta etapa.
    files: ['supabase/functions/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  {
    // Componentes de UI "vendored" (shadcn/ui) usam @ts-nocheck e ficam fora do
    // typecheck (excluídos no tsconfig). Permitimos diretivas ts-comment aqui.
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
    },
  },
  {
    // Áreas portadas da branch `muri`: Avaliação/NineBox (W1) e UI de
    // treinamentos (W2). O código original da muri era escrito sem o ratchet
    // `no-explicit-any`; manter a regra aqui importaria ~108 + ~23 warnings
    // novos e quebraria `lint:ci` (orçamento 1). A dívida fica medida:
    // `scripts/ratchet-any.mjs` segue vigente para `components` e `pages` e
    // reprova qualquer subida fora destes arquivos.
    files: [
      'src/components/avaliacao/**/*.{ts,tsx}',
      'src/components/animate-ui/**/*.{ts,tsx}',
      'src/components/treinamentos/**/*.{ts,tsx}',
      'src/pages/AvaliacaoPage.tsx',
      'src/pages/TreinamentosPage.tsx',
      'src/services/avaliacaoService.ts',
      'src/mocks/colaboradoresMock.ts',
      'src/mocks/treinamentosMock.ts',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    // Primitivos `animate-ui` vendidos da muri (W1). `set-state-in-effect` e
    // `only-export-components` refletem o padrão interno da lib (efeitos que
    // sincronizam altura/medidas com ResizeObserver); a regra de primeira
    // renderização serve ao userland React, não ao primitive vendido.
    files: ['src/components/animate-ui/**/*.{ts,tsx}'],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      'react-refresh/only-export-components': 'off',
    },
  }
);
