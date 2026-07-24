# Férias — Matriz de Conformidade CLT (v31)

## Regras Legais Implementadas no Banco

| Artigo CLT | Regra | Implementação |
|---|---|---|
| **Art. 130** | Proporcionalidade por faltas (0-5→30, 6-14→24, 15-23→18, 24-32→12, >32→0) | `fn calcular_dias_direito_ferias(int)` + trigger `trg_periodos_aquisitivos_recalc_dias` |
| **Art. 133** | Perda do direito (>32 faltas ou afastamento >30d) | Colunas `perdeu_direito` / `motivo_perda` + trigger automático |
| **Art. 134 §1º** | Fracionamento: máx 3, um ≥14, demais ≥5 | `fn validar_split_ferias(...)` + trigger `trg_ferias_validar_split` (erro `FERIAS_SPLIT_INVALIDO`) |
| **Art. 134 §3º** | Não iniciar em DSR/feriado nem 2 dias antes | `fn eh_dia_valido_inicio_ferias(empresa, data)` + trigger `trg_ferias_validar_inicio` (erro `FERIAS_INICIO_INVALIDO`) |
| **Art. 137** | Dobra por vencimento do concessivo | Colunas `em_dobra` + `data_limite_concessao` + trigger + view `v_ferias_alertas_criticos` |
| **Art. 143** | Abono pecuniário limitado a 10 dias | Schema Zod + limite duplo no motor de cálculo |
| **Art. 145** | Pagamento até 2 dias úteis antes | Detectado em `v_ferias_alertas_criticos` (severidade `PAGAMENTO_ATRASADO_ART_145`) |

## Cálculo (motor canônico `src/calculators/beneficios.ts`)

```
Valor Férias  = (Salário / 30) * Dias
Terço Férias  = Valor Férias / 3
Valor Abono   = (Salário / 30) * DiasAbono (máx 10)
Terço Abono   = Valor Abono / 3
Bruto         = Valor Férias + Terço Férias + Valor Abono + Terço Abono
INSS          = tabela progressiva sobre (Valor Férias + Terço)
IRRF          = tabela sobre (Valor Férias + Terço - INSS - deduções por dependente)
Líquido       = Bruto - INSS - IRRF
```

Abono e seu terço **não sofrem** INSS/IRRF.

## Integração com Folha

Ao aprovar RH (`status='aprovada' AND enviado_contabilidade=true`), o trigger
`trg_ferias_gerar_rubricas` chama `fn gerar_rubricas_ferias(uuid)` que insere
em `eventos_variaveis` os códigos **1050** (férias), **1051** (1/3), **1052**
(abono), **1053** (1/3 abono), **1054** (INSS), **1055** (IRRF).

Idempotência garantida via índice único parcial
`uq_eventos_variaveis_ferias_rubrica(origem_ferias_id, rubrica_id)`.

## Alertas Críticos

View `public.v_ferias_alertas_criticos` (invoker, respeita RLS):

- `DOBRA_IMINENTE_60` — 31–60 dias para o limite
- `DOBRA_IMINENTE_30` — 1–30 dias
- `DOBRA_VENCIDA` — em dobra ativa
- `PAGAMENTO_ATRASADO_ART_145` — férias pagas com < 2 dias de antecedência

Recálculo automático via cron `ferias-recalcular-dobra-diario` (03:15 UTC).

## Códigos de Erro (frontend)

Traduzir via `safeErrorMessage`:

- `FERIAS_SPLIT_INVALIDO` — parcelamento fora da regra do Art. 134 §1º
- `FERIAS_INICIO_INVALIDO` — data de início inválida (Art. 134 §3º)
- `FERIAS_AQUISITIVO_INVALIDO` — aquisitivo perdido, com zero dias ou pertence a outro colaborador

## Frontend

- `src/schemas/ferias.ts` — Zod com `superRefine` espelhando triggers (bloqueia domingo, coerência de datas).
- `src/hooks/useCalculoFeriasPreview.ts` — preview em tempo real no formulário.
- `src/utils/calculoFerias.ts` — wrapper do motor canônico.

## Cron Jobs

| Nome | Schedule | Função |
|---|---|---|
| `ferias-recalcular-dobra-diario` | `15 3 * * *` | `fn_recalcular_dobra_e_alertas()` |
| `ferias-atualizar-status-diario` | `30 3 * * *` | `fn_update_ferias_status_by_date()` |

## Pendências para próxima onda

- **2.6** Aviso de Férias PDF (MTE) com assinatura eletrônica.
- **2.7** Programação Anual de Férias (Kanban gestor→RH).
- **2.10** Comunicados MTE + sindicato para férias coletivas.
- **3.13** Portal do Colaborador — solicitação self-service.

Requerem componentes UI + storage privado; a fundação de banco/regras já está pronta para ancorá-los.
