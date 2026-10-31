# Testes End-to-End (E2E) — Playwright

> **Versão:** V24 (Onda de Qualidade)
> **Stack:** Playwright 1.x · Chromium · Pixel 7 (mobile smoke)

## Visão geral

A suíte E2E complementa os 405 testes unitários do Vitest, validando fluxos
ponta-a-ponta (login real → navegação → módulos críticos → ações de negócio).

```text
e2e/
├── auth.setup.ts                  # Login único → grava storageState
├── .auth/user.json                # Sessão persistida (gitignored)
├── public/
│   └── login.spec.ts              # Tela de login, validação, proteção de rotas
├── authenticated/
│   ├── dashboard.spec.ts          # KPIs e navegação
│   ├── modulos-criticos.spec.ts   # Smoke de 8 módulos (folha, ponto, eSocial...)
│   └── calculadora-rescisao.spec.ts
└── mobile/
    └── ponto.spec.ts              # Viewport Pixel 7 — registro de ponto
```

## Arquitetura — projetos Playwright

| Projeto         | Depende de | StorageState                | Quando roda                      |
| --------------- | ---------- | --------------------------- | -------------------------------- |
| `setup`         | —          | grava `e2e/.auth/user.json` | sempre antes dos autenticados    |
| `public`        | —          | nenhum                      | login e rotas anônimas           |
| `authenticated` | `setup`    | `e2e/.auth/user.json`       | módulos protegidos               |
| `mobile-smoke`  | `setup`    | `e2e/.auth/user.json`       | viewport Pixel 7 (ponto, portal) |

A separação evita logar N vezes (1 login → N specs reusam a sessão).

## Execução local

```bash
# instala browsers (apenas 1ª vez)
npx playwright install --with-deps chromium

# todos os testes
npm run test:e2e

# UI interativa
npm run test:e2e:ui

# subset por projeto
npm run test:e2e:public
npm run test:e2e:auth
npm run test:e2e:mobile

# abre relatório HTML após uma execução
npm run test:e2e:report
```

## Variáveis de ambiente

| Variável            | Default                    | Uso                                           |
| ------------------- | -------------------------- | --------------------------------------------- |
| `E2E_BASE_URL`      | `http://localhost:8080`    | URL alvo (preview, staging ou local)          |
| `E2E_USER_EMAIL`    | `admin@teste.local`        | Conta usada pelo `auth.setup.ts`              |
| `E2E_USER_PASSWORD` | _(secret — não publicado)_ | Senha da conta de teste                       |
| `CI`                | (auto)                     | Liga retries (2x) e reporters `github`+`html` |

## Integração CI/CD (GitHub Actions)

Adicione um job ao workflow existente (`.github/workflows/ci.yml`):

```yaml
e2e:
  needs: [lint, test]
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: 20, cache: npm }
    - run: npm ci
    - run: npx playwright install --with-deps chromium
    - run: npm run test:e2e
      env:
        E2E_BASE_URL: ${{ secrets.E2E_BASE_URL }}
        E2E_USER_EMAIL: ${{ secrets.E2E_USER_EMAIL }}
        E2E_USER_PASSWORD: ${{ secrets.E2E_USER_PASSWORD }}
    - uses: actions/upload-artifact@v4
      if: always()
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 14
```

## Filosofia de seletores

1. **Primeira escolha:** roles ARIA + `getByLabel` / `getByRole` — testes
   acessíveis e resilientes a refactor de markup.
2. **Segunda escolha:** texto visível com regex case-insensitive.
3. **Última opção:** `data-testid` (apenas quando o texto/role é ambíguo).

> Nunca use seletores CSS frágeis (`.btn-primary > div:nth-child(2)`).

## Padrão de erros tolerados

A spec `modulos-criticos.spec.ts` falha em qualquer erro de runtime exceto:

- `ResizeObserver` (warning benigno do Chromium)
- Extensões de browser (`chrome-extension://`)
- Bloqueios por adblock (`net::ERR_BLOCKED_BY_CLIENT`)
- Favicon

Erros novos devem ser **investigados, não suprimidos**.

## Próximas ondas

- **V24.1:** E2E para fluxo de admissão digital (token público → assinatura)
- **V24.2:** E2E de cálculo de folha completo (criação → cálculo → holerite)
- **V24.3:** Visual regression (Playwright + Percy/Argos)
- **V24.4:** Acessibilidade automatizada (`@axe-core/playwright`)
