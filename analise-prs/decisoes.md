# Decisões Pendentes — Departamento_Pessoal_V3

Gerado em: 2026-10-31  
Main SHA: `49bcf8f29ee5be1a7c8c63bd7ccf1ebd80d81c25`

---

## D-001 · PR #315 — Revisão humana obrigatória

**Estado**: ABERTA — aguardando decisão humana  
**Branch**: `devin/1793220119-security-gaps`  
**Head SHA**: `36414849e6508c4ef7ba7523da095892a9c10ec4`  
**Motivo do bloqueio**: Toca `.github/workflows/gitleaks.yml` (+29/-0) e `.github/workflows/security.yml` (+15/-0) — Regra 8 do Fluxo Git.

### Conteúdo de alto valor (bloqueado junto):
- `supabase/functions/_shared/aal2.ts` (+53/-0): novo helper AAL2 enforcement aplicado a auth-login, backup, cnab-remessa, criptografia, enviar-esocial, exportacao, fechar-folha, pix-lote, reabrir-folha
- `supabase/functions/external-db-bridge/tableCatalog.ts` (+100/-0): catálogo de tabelas permitidas para bridge externo
- `supabase/functions/external-db-bridge/validation.ts` (+136/-0): validação de queries do bridge
- `nginx.conf` (+17/-0): hardening do servidor
- `supabase/functions/upload-certificado/`: migração para edge function segura

### Opções:
1. **Mergear PR #315 inteira** — requer revisão humana dos dois arquivos de workflow antes.
2. **Separar**: criar PR sem os arquivos `.github/workflows/` contendo apenas as edge functions e o nginx.conf — permite merge sem revisão humana.
3. **Fechar** — perder o trabalho de segurança (não recomendado).

---

## D-002 · Branch `muri` — Feature stream sem PR

**Estado**: 54 commits à frente do main, 355 atrás — sem PR aberta  
**Primeiro commit**: "Layout Recrutamento e Seleção - Pipeline e Candidatos"  
**Conteúdo identificado**:
- Feature de Recrutamento & Seleção (Pipeline de candidatos)
- Feature Nine-box / Desempenho
- ~240 scripts `_tmp-*.mjs` (diagnóstico e validação)
- Frames de animação `anim-out/*.png`
- E2E tests para fluxos autenticados

**Decisão necessária**:
1. **Abandonar** — branch fica como histórico, sem merge
2. **Resgatar parcialmente** — identificar commits de src/ com lógica de negócio e cherry-pick
3. **Abrir PR** — rebase em main (complexo: 355 commits atrás) e análise completa de conflitos

**Risco de merge direto**: ALTO — 355 commits atrás + conflitos massivos esperados.

---

## D-003 · Migration de rotinas agendadas (PR #209 fechada)

**Estado**: Nunca aplicada ao main  
**Arquivo**: `supabase/migrations/20261012130000_rotinas_agendadas_falhando.sql`  
**Origem**: PR #209 fechada sem merge em 29/10/2026 (Rule 8 — tocava workflows)

**Impacto**: Quatro rotinas agendadas potencialmente ainda falhando em produção desde 12/10/2026.

**Ação recomendada**: Criar nova PR contendo SOMENTE a migration, sem modificar `.github/workflows/`.

---

## D-004 · LEV-01 — Crash em calculoLoteService (colunas inexistentes)

**Estado**: CONFIRMADO E PENDENTE  
**Arquivo**: `src/services/calculoLoteService.ts` linhas 38-39  
**Problema**: Queries `dependentes.tipo` e `eventos_variaveis.codigo/descricao/tipo` — colunas que não existem no schema atual  
**Efeito**: Crash runtime em qualquer cálculo de lote de folha de pagamento  
**Ação necessária**: Migration aditiva para adicionar colunas ou corrigir query para usar colunas existentes

---

## D-005 · LEV-02 — Status mismatch folha de pagamento

**Estado**: CONFIRMADO E PENDENTE  
**Arquivo**: `src/services/folhaPagamentoService.ts`  
**Problema**: Código fecha folha verificando status `aberta`, mas banco armazena `calculada`  
**Efeito**: Impossível fechar folha de pagamento em produção  
**Ação necessária**: Alinhar enum/check no código com o valor real armazenado no banco

