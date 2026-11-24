# ADR-001: Arquitetura V18

## Status
Aceito

## Contexto
Sistema de Departamento Pessoal precisa de arquitetura escalavel e mantenivel.

## Decisao
- **Frontend**: React + TypeScript + Vite
- **State**: React Query + Zustand
- **UI**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Testes**: Vitest + Cypress

## Consequencias
### Positivas
- Type safety com TypeScript
- Performance com Vite
- UI consistente com shadcn
- Backend serverless

### Negativas
- Curva aprendizado shadcn
- Dependencia Supabase

## Data
2026-01-20
