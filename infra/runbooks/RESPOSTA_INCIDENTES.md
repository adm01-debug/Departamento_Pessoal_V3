# Runbook E-084 — Resposta a incidentes de segurança

> Procedimento operacional para incidentes de segurança neste projeto.
> Complementa `BREAK_GLASS.md` (acesso) e `ROTACAO_SEGREDOS.md` (credenciais).

## 1. Severidades

| Nível | Definição | Exemplos | Resposta |
|---|---|---|---|
| **S1 — Crítico** | Exposição ativa de PII/DB, credencial vazada, escrita cross-tenant | views legíveis por `anon`; service_role em log | Imediata, plantão |
| **S2 — Alto** | Controle de segurança quebrado sem evidência de abuso | verify_jwt desligado por engano; rate limit fora | ≤ 4h úteis |
| **S3 — Médio** | Fraqueza latente, sem exploração conhecida | policy permissiva em tabela vazia | ≤ 3 dias |

## 2. Fluxo (contenção → erradicação → recuperação → aprendizado)

### 2.1 Detectar e declarar
- Fontes: alertas (lockout, PII_ACCESS_ANOMALY, audit_policies), reporte
  externo, revisão de log, gate de CI.
- Declarar incidente: abrir issue com label `security-incident`, nível,
  horário de detecção e declarante.

### 2.2 Contenção (primeira hora)
- **Credencial exposta**: rotacionar imediatamente (ROTACAO_SEGREDOS.md §2) —
  não esperar análise.
- **Endpoint/função vulnerável**: desligar ou restringir (verify_jwt, deny-all
  temporário no gateway) antes de corrigir.
- **Vazamento de dados**: identificar janela de exposição (logs de acesso,
  `pii_access_logs`, `audit_log_unified`) e escopo (quem acessou o quê).
- Se o caminho normal estiver indisponível → `BREAK_GLASS.md`.

### 2.3 Erradicação
- Correção via PR com migration/código + teste de regressão que falharia sem
  a correção (o CI tem gates: `audit-rls-pii`, `audit-secdef-authz`, etc.).
- Verificar variantes do mesmo defeito (outras views/policies/funções).

### 2.4 Recuperação
- Reativar o que foi contido, com verificação (queries de `PROMOCAO_BANCO_PRODUCAO.md` §5).
- Monitorar 48h: alertas, telemetria do bridge (`severity = error/very_slow`).

### 2.5 Aprendizado (≤ 5 dias)
- Post-incident escrito: linha do tempo, causa raiz, o que funcionou/falhou.
- Ação preventiva entra no backlog com prioridade ≥ P1.
- Se PII de titulares foi exposta: avaliar **notificação à ANPD e aos
  titulares** (LGPD art. 48) com jurídico — prazo "tempo razoável", registrar
  a decisão mesmo se for "não notificar".

## 3. Contatos e responsáveis

| Papel | Responsável | Quando acionar |
|---|---|---|
| Declarante | qualquer pessoa | ao detectar |
| Líder técnico do incidente | maintainer de plantão | S1/S2 |
| DPO / jurídico LGPD | (designar) | exposição de PII |
| Comunicação a clientes | PO | S1 com impacto a tenant |

## 4. Checklist rápido S1

1. [ ] Incidente declarado (issue + label)
2. [ ] Credencial exposta rotacionada / endpoint contido
3. [ ] Escopo de exposição estimado (logs)
4. [ ] Correção mergeada com teste de regressão
5. [ ] Verificação pós-correção executada
6. [ ] ANPD/titulares avaliados (se PII)
7. [ ] Post-incident agendado
