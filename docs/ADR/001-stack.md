# ADR 001: Stack Tecnológica

## Status
Aceito

## Contexto
Precisamos definir a stack tecnológica para o sistema de Departamento Pessoal.

## Decisão
- **Frontend:** React 18 + TypeScript + Vite
- **UI:** Tailwind CSS + shadcn/ui
- **State:** React Query + Context API
- **Forms:** React Hook Form + Zod
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Testes:** Vitest + Playwright

## Consequências
- Desenvolvimento rápido com componentes prontos
- Type safety com TypeScript
- Backend serverless sem necessidade de infraestrutura
- Escalabilidade com Supabase
