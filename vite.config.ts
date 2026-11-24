import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { createRequire } from 'node:module';
import { imagetools } from 'vite-imagetools';
import { componentTagger } from 'lovable-tagger';
import { VitePWA } from 'vite-plugin-pwa';
import { sentryVitePlugin } from '@sentry/vite-plugin';

// Origem que o allowlist das edge functions aceita (`_shared/contract.ts` e
// `_shared/csrf.ts`). Usada só no proxy do dev server — ver comentário abaixo.
const ALLOWED_FUNCTION_ORIGIN = 'https://sistema-dp.lovable.app';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const supabaseUrl = env.VITE_SUPABASE_URL;

  return {
    server: {
      host: '::',
      port: 8080,
      strictPort: true, // se 8080 estiver ocupada, falha em vez de escolher outra porta em silêncio
      // Edge Functions via proxy do dev server (mesma origem → sem CORS).
      //
      // O gateway do Supabase Cloud responde `Access-Control-Allow-Origin:
      // https://sistema-dp.lovable.app` para qualquer origem localhost (o
      // allowlist do `_shared/contract.ts` só libera localhost quando a env
      // EXTRA_ALLOWED_LOCAL_PORTS está setada no projeto). O preflight do
      // `auth-login` era barrado pelo navegador e o fetch estourava antes de
      // sair — a UI de login exibia "Email ou senha inválidos" para o que na
      // verdade era um bloqueio de CORS.
      //
      // Roteando por `/functions/v1` o navegador vê uma chamada same-origin e
      // não aplica CORS.
      //
      // No caminho do proxy os headers `Origin`/`Referer` são reescritos para uma
      // origem do allowlist. Não basta removê-los: `_shared/csrf.ts` é fail-closed
      // e responde 403 "CSRF: missing Origin/Referer header" quando não há
      // nenhum dos dois — o que quebraria todas as funções protegidas
      // (consultarCEP, metricas, external-db-bridge, ...). Reescrever satisfaz
      // tanto `verifyCsrf()` quanto `enforceOrigin()`.
      //
      // Isso vale apenas para o dev server, na máquina do desenvolvedor: nada
      // muda no build de produção nem no CORS do projeto Supabase.
      ...(supabaseUrl
        ? {
            proxy: {
              '/functions/v1': {
                target: supabaseUrl,
                changeOrigin: true,
                secure: true,
                headers: {
                  origin: ALLOWED_FUNCTION_ORIGIN,
                  referer: `${ALLOWED_FUNCTION_ORIGIN}/`,
                },
              },
            },
          }
        : {}),
    },
    plugins: [
      // P1-022: Babel-based plugin required for React Compiler
      react({
        compiler: reactCompilerAtivo(),
      }),
      imagetools(),
      mode === 'development' && componentTagger(),
      // P3-053: source maps upload automático para Sentry em builds de prod
      mode === 'production' &&
        Boolean(process.env.VITE_SENTRY_DSN) &&
        sentryVitePlugin({
          org: process.env.VITE_SENTRY_ORG ?? 'dp-team',
          project: process.env.VITE_SENTRY_PROJECT ?? 'departamento-pessoal-v2',
          authToken: process.env.SENTRY_AUTH_TOKEN,
          // Associação de commits e registro de deploy no Sentry (intenção original, que
          // estava no nível errado e era ignorada pelo plugin v5). Opt-in: com
          // SENTRY_RELEASE_TRACKING=1 o build cria release/deploy no Sentry e, por padrão,
          // FALHA se o Sentry falhar — validar num deploy de preview antes de ligar.
          // (A chave original `telemetries: 'debug'` não existe no plugin; a opção
          // válida é `telemetry: boolean` — mantido o padrão.)
          ...(process.env.SENTRY_RELEASE_TRACKING === '1'
            ? { release: { setCommits: { auto: true }, deploy: { env: mode } } }
            : {}),
        }),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
        manifest: {
          name: 'Lovable RH Expert',
          short_name: 'LovableRH',
          description: 'Gestão Inteligente de RH e Departamento Pessoal',
          theme_color: '#3b82f6',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        },
        workbox: {
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // <== 365 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'image-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // <== 30 days
                },
              },
            },
          ],
        },
      }),
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      /**
       * Camadas do Radix PRECISAM ser módulos únicos.
       *
       * O `node_modules` tem duas cópias de cada uma: a raiz (puxada por
       * `@radix-ui/react-dialog`) e uma aninhada em `@radix-ui/react-popover`
       * (idem `react-menu`, `react-select`). Três delas guardam estado de MÓDULO:
       *
       *   • `react-focus-scope`     → `focusScopesStack` (pausar a armadilha de
       *     foco da camada anterior);
       *   • `react-dismissable-layer` → `layers` (quem é a camada do topo, que
       *     recebe Esc e clique-fora);
       *   • `react-focus-guards`    → contador usado para esconder o resto da
       *     página do leitor de tela.
       *
       * Com duas cópias existem duas pilhas independentes: o `Popover` do seletor
       * de cor (portal) não pausa a armadilha do `Dialog` e não é reconhecido como
       * camada superior. Sintomas medidos no navegador: clicar na paleta e
       * arrastar a área funcionava (ponteiro), mas o campo hexadecimal e os
       * sliders não conseguiam receber foco (o diálogo roubava de volta), e Esc
       * fechava o MODAL inteiro em vez de só o painel de cor.
       *
       * As versões divergem só no helper `__name` do build (`1.1.12` × `1.1.16`),
       * então unificar na cópia da raiz é seguro. Isso conserta, de tabela, todo
       * `Popover` dentro de `Dialog` do sistema — o `DatePicker` dos formulários
       * em modal sofria do mesmo roubo de foco.
       */
      dedupe: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@radix-ui/react-focus-scope',
        '@radix-ui/react-dismissable-layer',
        '@radix-ui/react-focus-guards',
      ],
    },
    optimizeDeps: {
      // force: true foi removido — forçar re-otimização a cada dev start prejudica a DX
      //
      // `include` abaixo é necessário (não redundante com o scan automático do
      // Vite): com 100+ rotas lazy, várias delas usadas raramente em dev (ex.:
      // ColaboradorFormPage), o scanner nem sempre descobre essas deps no
      // cold start. Quando uma rota lazy é a PRIMEIRA a puxar `zod`/
      // `@hookform/resolvers/zod`, o Vite re-otimiza on-demand e invalida
      // requisições já em voo com "504 (Outdated Optimize Dep)" — o
      // `import() dinâmico daquela rota rejeita com "Failed to fetch
      // dynamically imported module", que o React.lazy() cacheia (não há
      // como reexecutar sem full reload). Pré-declarar aqui garante que
      // essas libs (usadas por praticamente todo *FormPage.tsx) já estejam
      // otimizadas ANTES de qualquer rota ser visitada.
      //
      // `@base-ui-components/react/tabs` é importado só por
      // DashboardExecutivoPage.tsx (nenhuma outra rota) — exatamente o
      // cenário acima ("rota lazy que é a PRIMEIRA a puxar" uma dep nova):
      // reproduzia o mesmo "Failed to fetch dynamically imported module"
      // só nessa página, mesmo depois de reload, porque a otimização
      // on-demand invalidava o próprio import() dela em voo.
      include: ['zod', '@hookform/resolvers/zod', 'react-hook-form', '@base-ui-components/react/tabs'],
    },
    build: {
      // P3-053: source maps para Sentry — upload via @sentry/vite-plugin em CI
      sourcemap: !!process.env.VITE_SENTRY_DSN,
      // P2-038: minificação oxc (padrão do Vite 8). ATENÇÃO: a forma de objeto
      // `minify: { type: 'oxc', compress: { dropConsole: [...] } }` não existe
      // no Vite 8 — ele só aceita boolean | 'oxc' | 'terser' | 'esbuild' e, com
      // um objeto, caía em `output.minify = false`: o bundle de produção saía
      // SEM minificação (1,7 MB / 45 mil linhas no maior chunk, medido 12/11).
      // console.log/debug/info/trace saem via `manualPureFunctions` (chamada
      // pura sem uso é removida no tree-shaking). console.error/warn são
      // MANTIDOS para integração com Sentry (P3-053). Obs.: o `dropConsole`
      // do oxc é só boolean e removeria também error/warn.
      minify: 'oxc',
      rollupOptions: {
        treeshake: {
          manualPureFunctions: ['console.log', 'console.debug', 'console.info', 'console.trace'],
        },
        output: {
          // Forma de função exigida pelo Vite 8 (rolldown). A forma de objeto
          // dispara "manualChunks is not a function" durante o build.
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return undefined;
            if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/.test(id))
              return 'vendor-react';
            if (/[\\/]node_modules[\\/]@radix-ui[\\/]/.test(id)) return 'vendor-ui';
            if (/[\\/]node_modules[\\/]@tanstack[\\/]/.test(id)) return 'vendor-query';
            if (/[\\/]node_modules[\\/]recharts[\\/]/.test(id)) return 'vendor-charts';
            if (/[\\/]node_modules[\\/]@supabase[\\/]/.test(id)) return 'vendor-supabase';
            if (/[\\/]node_modules[\\/]framer-motion[\\/]/.test(id)) return 'vendor-motion';
            if (/[\\/]node_modules[\\/](react-hook-form|@hookform[\\/]resolvers|zod)[\\/]/.test(id))
              return 'vendor-forms';
            // jspdf, jspdf-autotable, xlsx são carregados sob demanda via import dinâmico
            return undefined;
          },
        },
      },
    },
  };
});
