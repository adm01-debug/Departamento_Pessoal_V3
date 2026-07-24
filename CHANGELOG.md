# Changelog - Sistema Departamento Pessoal

## [18.0.1] - 2026-07-23

### Infrastructure
- Dockerfile: Node 18 → 22 LTS
- nginx.conf: fix try_files + proxy vars
- Branch protection workflow
- CODEOWNERS atualizado
- .gitignore aprimorado
- .nvmrc: 20 → 22
- .env.example sanitizado (removeu keys reais)
- LICENSE: 2026 + AtomicaBR

### Security
- CodeQL scanning ativado (security.yml)
- Dependabot alerts configurado com grupos
- **Bridge ORDER BY validation**: `isSafeOrderColumn()` previne SQL injection
- **Bridge `.single()` support**: implementado no SELECT handler

### Dependencies (18 bumps)
- @playwright/test: 1.60.0 → 1.61.1
- vite: ^8.0.14 → ^8.1.4
- recharts: ^2.10.4 → ^3.9.2
- react-day-picker: ^9.6.0 → ^10.0.1
- @radix-ui/react-tabs: ^1.0.4 → ^1.1.14
- @radix-ui/react-avatar: 1.1.12
- react-hook-form: ^7.79.0
- dompurify: 3.4.7 → 3.4.12
- @types/node: ^26.1.1
- @sentry/react: 10.53.1 → 10.67.0
- framer-motion: 12.36.0 → 12.42.2
- tailwind-merge: ^2.2.1 → ^3.6.0
- uuid: 14.0.0 → 14.0.1
- globals: 17.6.0 → 17.7.0
- lovable-tagger: 1.3.0 → 1.3.3
- vite-imagetools: 10.0.0 → 10.0.1
- react/react-dom: 19.2.4 → 19.2.8
- vitest: ^1.2.2 → ^4.1.10

### Types
- **19 `any` removidos** (PR #49):
  - FinancialSummaryCards.tsx: 7 any → interfaces
  - PontoAdjustmentRequests.tsx: 12 any → interfaces

### CI/CD
- All Dependabot PRs resolved
- Stale PRs closed
- 0 open issues/PRs

## [21.0.0] - 2026-01-20
...(rest unchanged)