# BACKLOG — 2 Itens Restantes

**Última atualização:** 2026-08-28
**Total implementado:** 86/88 ✅
**Restantes:** 2 🔄
**Dependência:** Design de UX + credenciais de terceiros

---

## 🔴 Prioridade

| Iten | Descrição | Dependência | Esforço |
|---|---|---|---|
| **P5-083** | Workflow editor (BPMN) | UX design + design system | ~3 dias |
| **P5-084** | Integração contábil (Domínio/Alterdata) | Credenciais API + acesso sandbox | ~2 dias |

> **P5-086 (Metabase embed)** foi coberto pelo commit `feat(bi): Metabase embed com fallback recharts + validators` — implementável com credenciais reais quando disponível.

---

## 🟠 P5-083 — Workflow Editor BPMN (3 dias)

**Escopo:** `src/components/workflows/WorkflowDesigner.tsx` (já criado em commit)

### O que falta
1. **UX design**: definição visual dos approval flows (níveis, roles, SLAs)
2. **Persistência**: salvar/editar workflows em `workflow_definicoes` via bridge
3. **Execução**: `workflowService` precisa de método `executarWorkflow(workflowId, contexto)`
4. **Testes E2E**: Playwright cobrindo 5 cenários (save, delete, cycle detection, etc.)

### Critério de aceite
- [ ] UX design aprovado (Figma → implementação)
- [ ] CRUD completo de workflows via API
- [ ] Ciclo A→B→A detectado e bloqueado com toast warning
- [ ] 5 testes Playwright passando

---

## 🟠 P5-084 — Integração Contábil (2 dias)

**Escopo:** `src/services/dominioAlterdataService.ts` (já criado em commit)

### O que falta
1. **Credenciais reais**: API keys de produção para Domínio e Alterdata
2. **Sandbox testing**: ambiente de teste com dados fictícios
3. **Webhook de callback**: receber confirmação de processamento do Domínio
4. **Mapeamento de rubricas**: alinhar códigos do DP com plano de contas contábil

### Critério de aceite
- [ ] Keys de sandbox obtidas com equipe contábil
- [ ] Teste de integração com `syncLancamentos` passando
- [ ] Mapeamento de 20 rubricas mais comuns documentado
- [ ] Error handling graceful (retry + fallback manual)

---

## ✅ Implementados no batch 27-28/08/2026

| Item | Commit | Descrição |
|---|---|---|
| P1-015 | `7305885e9` | ORDER BY + RPC error details |
| P1-017 | `7305885e9` | Sanitização CPF/CNPJ + categorização SQLSTATE |
| P2-043 | `3b7b7eb56` | 18 `as any` eliminados nos top-5 services |
| P2-045 | `22220684f` | useActionStateHelper com testes |
| P3-058 | `64508d39f` | Prometheus metrics + scrape config |
| P4-072 | `2608c2373` | 5 materialized views + bugs corrigidos |
| P5-081 | `e4b5b26c7` | Alertas preditivos edge function |
| P5-086 | `07406bf39` | Metabase embed com fallback recharts |

