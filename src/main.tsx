import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import * as Sentry from "@sentry/react";
import { QueryProvider, ThemeProvider, ToastProvider } from '@/providers';
import { AuthProvider, NotificationProvider, EmpresaProvider } from '@/contexts';
import { ErrorBoundary } from '@/errors';
import { loggerService } from '@/services/loggerService';
import App from './App';
import './index.css';

if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    // P3-053: release tracking + source maps upload
    release: import.meta.env.VITE_SENTRY_RELEASE ?? 'dp-v2@unknown',
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    // P3-053: beforeSend — filtra erros de bots e browsers de teste antes do capture
    beforeSend(event) {
      // Erros de bots, scrapers e browsers headless que enviam eventos falsos
      if (typeof navigator !== 'undefined' && navigator.userAgent === '') return null;
      // Erros conhecidos de extensões/chrome-devtools (ruído)
      const chromeExtPatterns = [
        'chrome-extension://',
        'moz-extension://',
        'safari-extension://',
        'webkit-masked-url',
      ];
      const reqUrl = event.request?.url ?? '';
      if (chromeExtPatterns.some((p: string) => reqUrl.includes(p))) return null;
      // Eventos sem exception values (podem ser eventos de rede ou custom)
      if (!event.exception?.values?.length) return event;
      // Erros de extensões Chrome/Firefox/Safari: filtra via frames
      // Exception.stack não existe no tipo — o caminho correto é stacktrace.frames
      const firstExc = event.exception.values[0];
      const extFrames = firstExc?.stacktrace?.frames?.filter((f) =>
        f?.filename?.includes('extensions/') ||
        f?.filename?.includes('chrome-extension') ||
        f?.filename?.includes('moz-extension')
      );
      if (extFrames?.length) return null;
      return event;
    },
    // Tags globais para filtragem no dashboard Sentry
    initialScope: {
      tags: {
        component: 'frontend',
        app: 'departamento-pessoal-v2',
        tenant_isolation: 'enforced',
      },
    },
    // Filtra erros esperados de bots/scanners
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'NetworkError when attempting to fetch resource',
      'Failed to fetch',
      'No unique DOM nodes matched',
      'net::ERR_NAME_NOT_RESOLVED',
      'net::ERR_INTERNET_DISCONNECTED',
    ],
  });
}

if (import.meta.env.PROD) {
  const noop = () => {};
  console.log = noop;
  console.debug = noop;
  console.info = noop;
  console.warn = noop;
  console.table = noop;
  console.trace = noop;
}

// Clickjacking defense-in-depth: break out of foreign frames
const isInIframe = (() => {
  try { return window.self !== window.top; } catch (e) { return true; }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (isInIframe && !isPreviewHost) {
  document.body.innerHTML = '';
  if (window.top) window.top.location.href = window.self.location.href;
}

// CSP violation monitoring — detect and report policy breaches client-side
if (import.meta.env.PROD) {
  document.addEventListener('securitypolicyviolation', (e) => {
    const payload = {
      directive: e.violatedDirective,
      blocked: e.blockedURI,
      source: e.sourceFile ? `${e.sourceFile}:${e.lineNumber}` : undefined,
    };
    if (typeof Sentry !== 'undefined' && Sentry.captureMessage) {
      Sentry.captureMessage(`CSP violation: ${e.violatedDirective}`, { level: 'warning', extra: payload });
    }
  });
}

// PWA Service Worker Registration
if (!isInIframe && !isPreviewHost && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw-custom.js')
      .then(reg => { if (import.meta.env.DEV) loggerService.info('Service Worker registrado', { scope: reg.scope }); })
      .catch(err => loggerService.error('Falha ao registrar Service Worker', {}, err instanceof Error ? err : new Error(String(err))));
  });
}

// Env-var guard fail-fast: se VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY
// não vieram no build, o client.ts cai em fallback embutido — nesse caso
// mostramos um banner bloqueante ao invés de deixar o app rodar contra config
// silenciosamente incorreta.
(() => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (url && key) return;
  const banner = document.createElement('div');
  banner.setAttribute('role', 'alert');
  banner.style.cssText =
    'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;' +
    'justify-content:center;background:rgba(220,38,38,0.95);color:#fff;' +
    'font-family:system-ui,sans-serif;padding:2rem;text-align:center;';
  banner.innerHTML =
    '<div style="max-width:640px;">' +
    '<h1 style="font-size:1.5rem;font-weight:800;margin-bottom:.5rem;">Configuração inválida</h1>' +
    '<p style="margin-bottom:1rem;">As variáveis <code>VITE_SUPABASE_URL</code> e/ou ' +
    '<code>VITE_SUPABASE_PUBLISHABLE_KEY</code> não foram encontradas no build. ' +
    'O app não pode iniciar em segurança. Restaure o <code>.env</code> e recompile.</p>' +
    '<small>ref: <code>src/integrations/supabase/client.ts</code></small></div>';
  document.body.appendChild(banner);
  throw new Error('[BOOT] Variáveis Supabase ausentes — inicialização abortada.');
})();


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <QueryProvider>
          <BrowserRouter>
            <ThemeProvider>
              <ToastProvider>
                <AuthProvider>
                  <NotificationProvider>
                    <EmpresaProvider>
                      <App />
                    </EmpresaProvider>
                  </NotificationProvider>
                </AuthProvider>
              </ToastProvider>
            </ThemeProvider>
          </BrowserRouter>
        </QueryProvider>
      </HelmetProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
