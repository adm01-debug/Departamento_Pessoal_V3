# RELATÓRIO FINAL DE PRs — Departamento_Pessoal_V3

**Gerado em**: 2026-10-31  
**Main HEAD**: `49bcf8f29ee5be1a7c8c63bd7ccf1ebd80d81c25`  
**Banco canônico**: `frjbfeamybqsejlvmqbl` (Supabase)  
**Cobertura**: 6 PRs iniciais + 2 PRs de documentação = 8 analisadas

---

## Resumo Executivo

| Categoria | Qtd |
|-----------|-----|
| PRs mergeadas nesta sessão | 7 |
| PRs abertas (aguardando decisão humana) | 1 |
| PRs fechadas sem merge (Rule 8) | 2 |
| Branches sem PR investigadas | 1 (`muri`) |
| Achados confirmados e pendentes | 21 |

---

## PRs Mergeadas

| PR | Título resumido | SHA merge | CI |
|----|-----------------|-----------|-----|
| #309 | fix admissoes S-2200 + email pré-admissão | `3d2f0d5e` | ✅ |
| #313 | fix rescisao modalidades + RPC pagamento | `219c2f93` | ✅ |
| #317 | fix govbr+esocial login anônimo + XML S-2299 | `271d5b5e` | ✅ |
| #319 | docs pendências externas fora de escopo | `e1a18efd` | ✅ |
| #322 | chore código órfão + liga LanguageSelector/PDF-PDI | `7db8ba84` | ✅ |
| #330 | docs reconciliação auditorias anteriores | `199c855e` | ✅ |
| #331 | chore suplemento auditorias D-27/D-37/D-38/D-39/D-40 | `49bcf8f2` | ✅ |

---

## PR Aberta — DECISÃO HUMANA

### PR #315 — fix(security): bridge hardening, aal2 nas edges, cert via edge

- **Branch**: `devin/1793220119-security-gaps`
- **Arquivos**: 40 alterados, 1174 adições
- **Bloqueio**: `.github/workflows/gitleaks.yml` (+29) e `security.yml` (+15) — Rule 8
- **Valor**: AAL2 em 9 edge functions, external-db-bridge hardening, upload-certificado via edge
- **Dossiê completo**: `analise-prs/dossies/PR-315.md`
- **Alternativa**: separar workflows das edge functions em PR nova → merge sem bloqueio

---

## PRs Fechadas sem Merge

| PR | Branch | Motivo | Pendência |
|----|--------|--------|-----------|
| #209 | `claude/fix-rotinas-agendadas-261012-0737` | Tocava `.github/workflows/` (Rule 8) | Migration `20261012130000_rotinas_agendadas_falhando.sql` nunca aplicada → rotinas podem ainda falhar |
| #328 | `adm01-debug-patch-1` | "Create main.yml" — Rule 8 | Nenhuma; CI já funcionando via Vercel |

---

## Branch sem PR — `muri`

- 54 commits à frente / 355 atrás do main
- Feature stream: Recrutamento & Seleção + Nine-box/Desempenho
- Sem PR aberta; ~240 scripts _tmp-*.mjs + frames de animação
- **DECISÃO HUMANA**: abandonar, resgatar parcialmente, ou abrir PR com rebase completo

---

## Gaps Críticos Confirmados e Pendentes (top 5)

| ID | Arquivo | Impacto |
|----|---------|---------|
| LEV-01 | `calculoLoteService.ts:38-39` | Crash em qualquer cálculo de folha — colunas inexistentes |
| LEV-02 | `folhaPagamentoService.ts` | Impossível fechar folha — status mismatch (`calculada` vs `aberta`) |
| LEV-04 | tabelas fiscais INSS/IRRF | Cálculos incorretos — tabelas desatualizadas |
| LEV-06 | PDF holerite | URL `storage.lovable.dev` inexistente — impressão falha |
| W73 | `supabase/migrations/` | 44 migrations pendentes no ledger |

---

## Estado de Produção (confirmado via D-37, 12/10/2026)

- **Holerites emitidos**: 0
- **Eventos eSocial transmitidos**: 0
- **Folhas calculadas com sucesso**: 0
- **Score funcional**: ~0% (infra: 8.5/10; negócio: ~0%)

---

## Achados de Auditoria — Situação Final

- **CONFIRMADO E PENDENTE**: 21 (LEV-01, LEV-02, LEV-04, LEV-06, W73 entre os mais críticos)
- **CORRIGIDO E VERIFICADO**: 0 (nenhuma funcionalidade de negócio validada em produção)
- **PARCIALMENTE CORRIGIDO**: 3 (admissão S-2200, rescisão, eSocial — código corrigido, sem dados em prod)
- **SUPERADO POR MUDANÇA DE ARQUITETURA**: 2 (upload-certificado via edge — PR #315 pendente)
- **NÃO VERIFICADO**: 7 (sem ambiente de staging configurado)

---

## Arquivos de Rastreamento Produzidos

| Arquivo | Descrição |
|---------|-----------|
| `analise-prs/auditorias-anteriores.md` | Reconciliação completa D-01 a D-41 (750+ linhas) |
| `analise-prs/prs.json` | Inventário de todas as PRs com vereditos e SHAs |
| `analise-prs/progresso.json` | Estado atual do objetivo de reconciliação |
| `analise-prs/decisoes.md` | 5 decisões pendentes documentadas |
| `analise-prs/dossies/PR-315.md` | Dossiê completo da única PR aberta |
| `analise-prs/RELATORIO_PRS.md` | Este relatório |
