# Regras de Negócio — Departamento_Pessoal_V3

Extraídas de: auditorias D-01 a D-41, schema, testes E2E, código e histórico de PRs.  
Gerado em: 2026-10-31 | Main SHA: `49bcf8f29ee5be1a7c8c63bd7ccf1ebd80d81c25`

---

## RN-001 — Banco Canônico

**Projeto Supabase**: `frjbfeamybqsejlvmqbl`  
Toda migration deve ser aplicada neste projeto. Qualquer referência a `bwwbeyolnnzppeuhgkcd` é erro de conector de sessão anterior.  
**Fonte**: D-13, D-15, D-38; `.env`

---

## RN-002 — Isolamento Multi-Tenant por Empresa

Toda tabela de dados de RH possui coluna `empresa_id`. Todas as queries e RLS policies devem filtrar por `empresa_id` do usuário autenticado.  
**Fonte**: D-06, D-23, schema

---

## RN-003 — Status de Folha de Pagamento

Ciclo de vida da folha: `aberta` → `calculada` → `fechada` → `paga`.  
O código em `folhaPagamentoService.ts` verifica status `aberta` para fechar, mas o banco armazena `calculada` após o cálculo — gap LEV-02 confirmado.  
**Fonte**: D-37 (LEV-02), código `folhaPagamentoService.ts`

---

## RN-004 — Cálculo de Lote de Folha

O cálculo de lote em `calculoLoteService.ts` depende de:
- `dependentes.tipo` (coluna não existe no schema atual)
- `eventos_variaveis.codigo`, `eventos_variaveis.descricao`, `eventos_variaveis.tipo` (colunas não existem)

Resultado: crash runtime em qualquer tentativa de calcular folha — gap LEV-01.  
**Fonte**: D-37 (LEV-01), `calculoLoteService.ts:38-39`

---

## RN-005 — eSocial: Obrigatoriedade de Eventos

Eventos obrigatórios para transmissão:
- S-2200: Admissão (corrigido em PR #309)
- S-2299: Desligamento / rescisão (corrigido em PR #317)
- S-1200: Remuneração mensal (não verificado)
- S-2306: Trabalhador sem vínculo (não verificado)

Nenhum evento foi transmitido em produção até 12/10/2026.  
**Fonte**: D-37, PR #309, PR #317

---

## RN-006 — Tabelas Fiscais INSS/IRRF

As tabelas de cálculo de INSS e IRRF devem ser atualizadas anualmente. As tabelas atuais no banco estão desatualizadas (LEV-04) — resultado: cálculos incorretos mesmo quando a engine funcionar.  
**Fonte**: D-37 (LEV-04)

---

## RN-007 — Holerite: Impressão e Armazenamento

PDFs de holerite são gerados e armazenados no Supabase Storage. A URL atual no código aponta para `storage.lovable.dev` que não existe (LEV-06) — impressão sempre falha.  
**Fonte**: D-37 (LEV-06)

---

## RN-008 — Autenticação AAL2 (MFA)

Operações sensíveis (fechamento de folha, exportação, pagamento PIX, eSocial, backup, criptografia) devem exigir AAL2 (segundo fator de autenticação MFA).  
Status atual: **NÃO IMPLEMENTADO** — aguarda merge de PR #315 (DECISÃO HUMANA).  
**Fonte**: D-41, PR #315, D-18/D-19

---

## RN-009 — External DB Bridge: Whitelist de Tabelas

O bridge para banco externo só pode consultar tabelas explicitamente whitelistadas. O `tableCatalog.ts` da PR #315 implementa esta whitelist — aguarda merge.  
**Fonte**: D-41, PR #315

---

## RN-010 — Rescisão: Modalidades e Cálculo Final

A rescisão suporta múltiplas modalidades (sem justa causa, com justa causa, acordo, pedido de demissão). O RPC de cálculo de pagamento final foi corrigido em PR #313.  
**Fonte**: PR #313

---

## RN-011 — Rotinas Agendadas

O sistema executa 4 rotinas agendadas diariamente (via `pg_cron` ou similar). Todas falhavam desde antes de 12/10/2026. A migration corretiva `20261012130000_rotinas_agendadas_falhando.sql` nunca foi aplicada ao banco canônico.  
**Fonte**: PR #209 (fechada), D-37

---

## RN-012 — Gov.BR: Login e Autenticação

O módulo Gov.BR não deve permitir login anônimo. Fix aplicado em PR #317.  
**Fonte**: PR #317

---

## RN-013 — Migrations: Apenas Aditivas

Migrations aplicadas ao banco de produção devem ser estritamente aditivas e idempotentes. Proibidas: DROP, RENAME, ALTER TYPE, DELETE em massa, UPDATE sem WHERE específico.  
**Fonte**: Objetivo de reconciliação, ledger D-39

---

## RN-014 — Workflows CI/CD: Aprovação Humana

Qualquer PR que altere `.github/workflows/` requer revisão humana antes do merge. Não pode ser mergeada automaticamente por agentes.  
**Fonte**: Regra 8 do Fluxo Git; PRs #209, #315, #328 bloqueadas por esta regra
