module.exports = {
  ci: {
    collect: {
      // Rotas autenticadas redirecionam para /login sem credenciais —
      // audit cobre as páginas públicas do app.
      url: ['http://localhost:4173/login', 'http://localhost:4173/verificar-contrato'],
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'Local:',
      numberOfRuns: 2,
      settings: {
        preset: 'desktop',
        throttling: { cpuSlowdownMultiplier: 1 }
      }
    },
    assert: {
      assertions: {
        // Ratchet (E51-030): pisos medidos no build atual — os scores só
        // podem subir. Afrouxar exige editar este arquivo no PR.
        'categories:performance': ['error', { minScore: 0.5 }],
        'categories:accessibility': ['error', { minScore: 0.8 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        // SEO baixo é esperado: o app serve noindex de propósito.
        'categories:seo': ['error', { minScore: 0.6 }],
        'resource-summary:third-party:count': ['warn', { maxNumericValue: 10 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 10000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 10000 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 200 }],
        'interactive': ['warn', { maxNumericValue: 10000 }],
        'mainthread-work-breakdown': ['warn', { maxNumericValue: 3000 }]
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
};
