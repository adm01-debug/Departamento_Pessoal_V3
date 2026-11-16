# Rollbacks das migrations

Cada arquivo aqui desfaz **uma** migration de `supabase/migrations/`, com o mesmo
carimbo de versão no nome. São scripts de emergência: **nenhum roda
automaticamente**. O `canonical-migrations.yml` não enxerga esta pasta.

## Como usar

1. Confirme que a migration correspondente está no ledger
   (`supabase_migrations.schema_migrations`) e que o problema é dela.
2. Leia o cabeçalho do arquivo: ele diz exatamente o que reverte e o que **não**
   toca. Nenhum destes scripts apaga dado de negócio.
3. A execução é decisão do dono — DDL em produção é item da regra 8 do fluxo Git
   descrito em `AGENTS.md`.
4. Depois de executar, remova a versão do ledger, senão o `apply` seguinte vai
   pular a migration achando que ela já está aplicada.

## Cobertura atual

| rollback                                                              | migration que desfaz                                                      |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `20261015090000_..._finalizacao_e_potencial.rollback-operacional.sql` | `20261015090000_ninebox_finalizacao_e_potencial.sql` (parte operacional)  |
| `20261015090000_..._finalizacao_e_potencial.rollback-seguranca.sql`   | `20261015090000_ninebox_finalizacao_e_potencial.sql` (parte de segurança) |
| `20261016090000_revoga_insert_direto_rollback.sql`                    | `20261016090000_ninebox_revoga_insert_direto.sql`                         |
| `20261017090000_ninebox_aprovacao_gestor_rollback.sql`                | `20261017090000_ninebox_aprovacao_gestor.sql`                             |
| `20261020090000_ninebox_edicao_feedback_rollback.sql`                 | `20261020090000_ninebox_edicao_feedback.sql`                              |
| `20261021090000_ninebox_aprovacao_confirmada_rollback.sql`            | `20261021090000_ninebox_aprovacao_confirmada.sql`                         |
| `20261022090000_ninebox_conclusao_feedback_autorizada_rollback.sql`   | `20261022090000_ninebox_conclusao_feedback_autorizada.sql`                |
| `20261025090000_ninebox_aprovacao_autoria_rollback.sql`               | `20261025090000_ninebox_aprovacao_autoria.sql`                            |
| `20261027090000_ninebox_reconciliacao_incremental_rollback.sql`       | `20261027090000_ninebox_reconciliacao_incremental.sql`                    |
| `20261028090000_ninebox_justificativa_historico_rollback.sql`         | `20261028090000_ninebox_justificativa_historico.sql`                      |

As dez migrations acima estão aplicadas no projeto canônico `frjbfeamybqsejlvmqbl`.
