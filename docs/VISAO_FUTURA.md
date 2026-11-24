# Visão futura — E-100

> Documento de direção técnica de longo prazo (12–18 meses), derivado dos
> achados da auditoria de 2026-08. Revisto a cada trimestre (E-097).

## 1. De protótipo grande para produto operável

O diagnóstico de 16/08/2026: 176 mil linhas de código, 60 edge functions,
359 tabelas — e nenhuma feature com prova de uso real. A prioridade dos
próximos ciclos não é "mais funcionalidade", é **operabilidade do que existe**:

1. **Ambiente reconstruível**: ledger de migrations reconciliado (E-026),
   seeds reais, `supabase start` → app funcional sem passos manuais ocultos.
2. **CI como contrato**: gates de segurança (RLS, secdef, search_path, gitleaks)
   sempre verdes em `main`; branch protection ligada exigindo-os.
3. **Observabilidade de verdade**: telemetria do bridge com SLO, alertas com
   runbook, dashboards alimentados por dados reais.

## 2. Arquitetura alvo

```
Frontend (React) ──► Edge Functions (authz + validação) ──► Postgres (RLS)
                          │
                          └─ external-db-bridge aposentado por domínio:
                             cada domínio (ponto, folha, férias…) ganha RPCs
                             privilégias específicas e o bridge restringe-se
                             a leitura de catálogos.
```

- **Bridge por domínio, não genérico**: o proxy genérico foi a contenção
  correta de 2026; o alvo é RPCs específicas com schema de entrada explícito
  (expand-contract, E-022/E-023 documentam o caminho).
- **Cálculo no servidor**: folha/rescisão/férias calculam hoje no cliente;
  migrar para funções com trilha de auditoria e hash de integridade (E-016
  aponta o padrão para rescisão).
- **Storage sempre privado** com URL assinada curta (E-028 como linha de base).

## 3. Segurança contínua

- Pentest anual (E-074) + revisão pós-mudança estrutural (E-080).
- Drills trimestrais de incidente (E-083) usando RESPOSTA_INCIDENTES.md.
- Inventário de PII automatizado (E-068) alimentando o ROPA LGPD.
- Revisão trimestral de RPCs públicas e grants (GRANTS_REVOGADOS.md).

## 4. Integrações governamentais reais

eSocial, FGTS Digital, DCTFWeb, PIX e CNAB hoje simulam. Critério de entrada
em produção por integração: credencial oficial + ambiente de testes do órgão
+ evidência de transmissão aceita + reconciliação automática.

## 5. Indicadores (E-098)

| Indicador | Medição | Meta |
|---|---|---|
| Migrations aplicadas = repo | `schema_migrations` ∩ repo | 100% |
| Gates de segurança verdes em main | CI | 100% das semanas |
| PII em cache de SW/logs | auditoria trimestral | 0 ocorrências |
| Tempo de contenção de incidente S1 | drill/pós-incidente | ≤ 1h |
