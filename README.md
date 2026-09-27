# Sistema Departamento Pessoal

MIT License — Copyright (c) 2026 AtomicaBR / Promo Brindes

[![CI](https://github.com/adm01-debug/Departamento_Pessoal_V3/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/adm01-debug/Departamento_Pessoal_V3/actions/workflows/ci.yml)
[![Security](https://github.com/adm01-debug/Departamento_Pessoal_V3/actions/workflows/security.yml/badge.svg?branch=main)](https://github.com/adm01-debug/Departamento_Pessoal_V3/actions/workflows/security.yml)
[![E2E](https://github.com/adm01-debug/Departamento_Pessoal_V3/actions/workflows/e2e.yml/badge.svg?branch=main)](https://github.com/adm01-debug/Departamento_Pessoal_V3/actions/workflows/e2e.yml)
[![Healthcheck](https://github.com/adm01-debug/Departamento_Pessoal_V3/actions/workflows/healthcheck.yml/badge.svg)](https://github.com/adm01-debug/Departamento_Pessoal_V3/actions/workflows/healthcheck.yml)

## Status Atual

| Item | Status |
|------|--------|
| **Última atualização** | 27/09/2026 |
| **Open Issues/PRs** | ver badges acima |
| **CI Pipeline** | Active (typecheck + lint + test + e2e) |
| **Dependabot** | Weekly npm/actions/docker |
| **Node** | 22 LTS (Docker) |
| **Deploy** | Vercel (preview + production) |

## Stack

React 19.2 · TypeScript 6.0 · Vite 8.1 · Bun · Tailwind 4 · Supabase 2.x · Radix UI · TanStack Query · Recharts · Vitest · Playwright · PWA

## Quick Start

```bash
git clone https://github.com/adm01-debug/departamento-pessoal-v2.git
cd departamento-pessoal-v2
bun install
cp .env.example .env.local
bun run dev
```

Veja [ARCHITECTURE.md](./ARCHITECTURE.md) para detalhes da arquitetura.
