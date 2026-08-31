import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { imagetools } from 'vite-imagetools';
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      // Dev local: encaminha chamadas de edge functions para o Supabase remoto.
      // O gate estrito (allowlist *.lovable.app) rejeita Origin localhost — o
      // proxy reescreve Origin/Referer para um host da allowlist (somente dev).
      "/functions/v1": {
        target: "https://frjbfeamybqsejlvmqbl.supabase.co",
        changeOrigin: true,
        secure: true,
        configure(proxy) {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.setHeader("origin", "https://unified-harmony-hub.lovable.app");
            proxyReq.setHeader("referer", "https://unified-harmony-hub.lovable.app/");
          });
        },
      },
    },
  },
  plugins: [
    // P1-022: Babel-based plugin required for React Compiler
    react({
      // React Compiler: compila automaticamente components/hooks com dependências
      // estáveis — elimina useMemo/useCallback redundantes automaticamente.
      // babel-plugin-react-compiler@^1.0.0. Experimental — ativar com:
      //   VITE_REACT_COMPILER=1 npm run build
      babel: {
        plugins: process.env.VITE_REACT_COMPILER === '1'
          ? [['babel-plugin-react-compiler', { target: '19' }]]
          : [],
      },
    }),
    imagetools(),
    mode === 'development' && componentTagger(),
    // P3-053: source maps upload automático para Sentry em builds de prod
    mode === 'production' && process.env.VITE_SENTRY_DSN && sentryVitePlugin({
      org: process.env.VITE_SENTRY_ORG ?? 'dp-team',
      project: process.env.VITE_SENTRY_PROJECT ?? 'departamento-pessoal-v2',
      authToken: process.env.SENTRY_AUTH_TOKEN,
      telemetries: 'debug',
      setCommits: { auto: true },
      deploy: { env: mode },
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
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
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
                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // <== 30 days
              }
            }
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  optimizeDeps: {
    // force: true foi removido — forçar re-otimização a cada dev start prejudica a DX
  },
  build: {
    // P3-053: source maps para Sentry — upload via @sentry/vite-plugin em CI
    sourcemap: !!process.env.VITE_SENTRY_DSN,
    // P2-038: Vite 8 usa minifier oxc (mais rápido que terser). esbuild.drop
    // da config antiga era ignorado pelo Vite 8. oxc tem opção própria:
    // `minify: { compress: { drop_console: true } }` — habilitada abaixo.
    // console.error/warn são MANTIDOS para integração com Sentry (P3-053).
    // Forma de objeto: além de selecionar o minifier oxc, remove chamadas de
    // console.log/debug/info do bundle de produção (a string 'oxc' sozinha
    // não aplica nenhum `compress`). console.error/warn permanecem para o Sentry.
    minify: {
      type: 'oxc',
      compress: {
        dropConsole: ['log', 'debug', 'info', 'trace'],
      },
    },
    rollupOptions: {
      output: {
        // Forma de função exigida pelo Vite 8 (rolldown). A forma de objeto
        // dispara "manualChunks is not a function" durante o build.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/.test(id)) return 'vendor-react';
          if (/[\\/]node_modules[\\/]@radix-ui[\\/]/.test(id)) return 'vendor-ui';
          if (/[\\/]node_modules[\\/]@tanstack[\\/]/.test(id)) return 'vendor-query';
          if (/[\\/]node_modules[\\/]recharts[\\/]/.test(id)) return 'vendor-charts';
          if (/[\\/]node_modules[\\/]@supabase[\\/]/.test(id)) return 'vendor-supabase';
          if (/[\\/]node_modules[\\/]framer-motion[\\/]/.test(id)) return 'vendor-motion';
          if (/[\\/]node_modules[\\/](react-hook-form|@hookform[\\/]resolvers|zod)[\\/]/.test(id)) return 'vendor-forms';
          // jspdf, jspdf-autotable, xlsx são carregados sob demanda via import dinâmico
          return undefined;
        },
      },
    },
  },
}));
