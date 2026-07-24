# Programação Anual de Férias

Página `/ferias/programacao` — planejamento anual via Kanban por mês com workflow gestor → RH → conversão em solicitação formal.

## Fluxo

```
[Gestor cria] → sugerido_gestor
     ↓ aprovar (gestor)
   aprovado_gestor
     ↓ aprovar (RH/admin)
   aprovado_rh
     ↓ converter (RH/admin) → cria linha em `ferias` (pendente)
   convertido
```

Ações paralelas: `rejeitar` (com motivo) e `mover` (drag-and-drop entre meses).

## Regras de negócio

| Regra | Onde | Comportamento |
|-------|------|---------------|
| Escopo de empresa (multi-tenant) | RLS + RPCs | `user_belongs_to_empresa` obrigatório |
| Apenas gestor/RH/admin altera | RLS + RPCs | `has_role` |
| Só RH/admin converte em férias | RPC `programacao_ferias_converter` | Erro `42501` senão |
| Unicidade | `uq_fprog_unico_ativo` | `(colaborador, ano, período aquisitivo)` exceto cancelados |
| Art. 137 CLT (dobra) | RPC `programacao_ferias_mover` + UI | Retorna `aviso` e card com borda vermelha se mês > `data_limite_concessao` |
| Alerta de concentração | UI (`KanbanMes`) | Coluna do mês com >30% do time fica em amarelo |
| Auditoria | Todas as RPCs | Insere em `audit_log_unified` (`entity='ferias_programacao'`) |

## RPCs

- `programacao_ferias_aprovar_gestor(id)`
- `programacao_ferias_aprovar_rh(id)`
- `programacao_ferias_rejeitar(id, motivo)`
- `programacao_ferias_mover(id, novo_mes, nova_data_inicio?)` → `{ programacao, aviso }`
- `programacao_ferias_converter(id)` → cria linha em `public.ferias` (`status='pendente'`) e marca a programação como `convertido`.

Todas `SECURITY DEFINER` com `search_path=public`, `REVOKE` de `anon` e `EXECUTE` apenas para `authenticated`. As validações de permissão acontecem dentro da função (defesa em profundidade sobre a RLS).

## Frontend

- Hook `useProgramacaoFerias(ano, filtros)` — React Query, agrupamento client-side por mês.
- Hook `useProgramacaoMutations(ano)` — cria/aprova/rejeita/converte + `mover` com optimistic update e rollback.
- `KanbanMes.tsx` — 12 colunas droppables via `@dnd-kit/core`.
- `CardProgramacao.tsx` — draggable, badge de status, badge "Dobra" quando aplicável, menu de ações filtrado por role.
- `NovaProgramacaoDialog.tsx` — seleciona colaborador, mês, dias, período aquisitivo (auto-selecionado no mais antigo em aberto).
- `RejeitarDialog.tsx` — captura motivo obrigatório.

## Após conversão

A linha criada em `public.ferias` entra no fluxo padrão da FeriasPage: cálculo CLT (Art. 130/133/134/145), assinatura eletrônica do Aviso e integração com folha.
