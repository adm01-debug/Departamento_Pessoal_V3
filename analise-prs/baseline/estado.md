# Baseline CI — Departamento_Pessoal_V3

**SHA de referência**: `49bcf8f29ee5be1a7c8c63bd7ccf1ebd80d81c25` (main após PR #331)  
**Data**: 2026-10-31  
**Fonte dos dados**: Resultados reais de CI das PRs #330, #331, #332 (todas mergeadas nesta sessão)

> NOTA: O checkout local está stale (branch `fix/e51-026-lote2`, 18 arquivos não commitados). Baseline baseado em CI real do GitHub Actions, não em execução local.

---

## Build / Deploy

| Check | Status | Detalhe |
|-------|--------|---------|
| Build (Vite) | ✅ SUCCESS | Vercel CI verde em todas as PRs |
| Vercel Deploy | ✅ SUCCESS | Deploy confirmado em prod após cada merge |
| Manual & Preview Deploy | ✅ SUCCESS | Build job passou |

---

## Type Check

| Check | Status | Detalhe |
|-------|--------|---------|
| Type Check (tsc) | ✅ SUCCESS | Confirmado em PR #332 CI |
| Mudanças de caminho (paths-filter) | ✅ SUCCESS | Rota de CI OK |

---

## Lint

| Check | Status | Detalhe |
|-------|--------|---------|
| Lint (ESLint) | ✅ SUCCESS | Confirmado em PR #332 CI |

---

## Testes

| Check | Status | Detalhe |
|-------|--------|---------|
| Unit Tests | ✅ SUCCESS | Confirmado em PR #332 CI |
| Playwright E2E (público) | ✅ SUCCESS | Confirmado em PR #332 CI |
| Playwright E2E (autenticado) | ⏭ SKIPPED | Só roda pós-merge ou em branches específicas |
| RLS live (pós-merge) | ⏭ SKIPPED | Não bloqueante |

---

## Segurança e Qualidade

| Check | Status | Detalhe |
|-------|--------|---------|
| CodeQL & Audit | ✅ SUCCESS | Confirmado em PR #332 CI |
| OSSF Scorecard | ✅ SUCCESS |  |
| Config de segurança (E-077, estático) | ✅ SUCCESS |  |
| npm audit (produção) | ✅ SUCCESS |  |
| Revisão de dependências (PR) | ✅ SUCCESS |  |
| Integridade do banco canônico (live) | ✅ SUCCESS |  |

---

## Falhas de Negócio (NÃO VERIFICADO por CI — requer execução real)

Estas falhas existem em produção mas não aparecem no CI (não há testes de negócio ponta-a-ponta):

| Gap | Arquivo | Impacto |
|-----|---------|---------|
| LEV-01 | `src/services/calculoLoteService.ts:38-39` | Crash — colunas `dependentes.tipo`, `eventos_variaveis.codigo/descricao/tipo` inexistentes |
| LEV-02 | `src/services/folhaPagamentoService.ts` | Impossível fechar folha — status `calculada` vs `aberta` |
| LEV-04 | tabelas INSS/IRRF no banco | Cálculos fiscais incorretos |
| LEV-06 | PDF holerite — URL `storage.lovable.dev` | Impressão sempre falha |

---

## Versões Inferidas (package.json no main)

| Pacote | Versão |
|--------|--------|
| React | 19.x |
| TypeScript | 5.x |
| Vite | 6.x |
| Supabase JS | 2.x |
| Playwright | 1.x |

> Versões exatas: NÃO VERIFICADO — leitura do package.json não realizada nesta sessão.
