module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:4173/', 'http://localhost:4173/colaboradores', 'http://localhost:4173/folha'],
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
        'categories:performance': ['error', { minScore: 0.85 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.95 }],
        'resource-summary:third-party:count': ['warn', { maxNumericValue: 10 }],
        'resource-summary:mainthread-work-breakdown:duration': ['warn', { maxNumericValue: 2000 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 1500 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.05 }],
        'total-blocking-time': ['warn', { maxNumericValue: 200 }],
        'interactive': ['warn', { maxNumericValue: 3500 }]
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
};
