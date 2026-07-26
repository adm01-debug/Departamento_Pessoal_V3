/**
 * P5-079: Capacitor Configuration
 *
 * Projeto: departamento-pessoal v18.0.1
 * Plataforma: Android (iOS pode ser adicionado via `npx cap add ios`)
 *
 * Pré-requisitos:
 *   npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/haptics @capacitor/status-bar
 *   npx cap init "DP Folhas" "br.com.empresa.departamento-pessoal" --web-dir=dist
 *   npx cap add android
 *
 * Build:
 *   npm run build:mobile   # build + sync capacitor
 *   npm run build:mobile:android  # build + sync + APK
 *
 * Para verificar Android SDK:
 *   echo $ANDROID_HOME (Linux/Mac) ou echo %ANDROID_HOME% (Windows)
 *   npx cap doctor
 */

import type { CapacitorConfig } from '@capacitor/cli';

const capacitorConfig: CapacitorConfig = {
  appId: 'br.com.empresa.departamento-pessoal',
  appName: 'DP Folhas',
  webDir: 'dist',

  // ── Plataforma Android ──────────────────────────────────────
  android: {
    backgroundColor: '#ffffff',
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false, // true apenas em DEV
    // MinSdkVersion: a partir do build.gradle (mudar lá)
  },

  // ── Plugins Core ────────────────────────────────────────────
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'LIGHT',   // barra de status com ícones claros
      backgroundColor: '#0f172a', // --color-primary-foreground
    },
  },

  // ── Build options ──────────────────────────────────────────
  buildMetrics: true, // coleta métricas de build (bundle size, etc.)
  // Logging via @capacitor/logging (não console.log em produção)
  loggingBehavior: 'production',

  // ── Server config (desenvolvimento local) ───────────────────
  server: {
    // Para development: aponta para o dev server local
    // androidScheme: 'https',
    // url: 'http://192.168.1.100:5173',
  },
};

export default capacitorConfig;
