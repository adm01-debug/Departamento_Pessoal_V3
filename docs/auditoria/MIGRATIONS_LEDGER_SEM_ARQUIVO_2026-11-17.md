# Migrations no ledger sem arquivo no repositório — 17/11/2026

Levantado por verificação **byte a byte** de todas as branches `claude/*` da
sessão contra a `main`: para cada branch, cada linha que ela acrescentou foi
conferida contra o conteúdo atual da `main`.

A branch `claude/chore-canoniza-8-migrations-ledger-261116-1345` apareceu com
**0 de 8 arquivos** presentes na `main`. A PR dela nunca foi mergeada.

## O que são esses 8 arquivos

Reconstruções, a partir da coluna `statements` do ledger canônico, de DDL que
**está aplicada em produção** e que o repositório não documenta. Conferido em
`frjbfeamybqsejlvmqbl`:

| versão no ledger | nome | arquivo na `main` |
|---|---|---|
| `20260912142449` | `p0_hash_trigger_search_path` | ausente |
| `20260912142506` | `p0_auth_lockout_contract` | ausente |
| `20260912142520` | `p0_payroll_upsert_contract` | ausente |
| `20260912143019` | `p0_views_revoke_public` | ausente |
| `20260912143239` | `p0_secdef_search_path` | ausente |
| `20260912143344` | `p1_function_search_path` | ausente |
| `20260912144208` | `p0_pgcrypto_routine_search_path` | ausente |
| `20261107203000` | `fix_rls_insert_configuracoes_ponto` | ausente |

## A divergência vai nos DOIS sentidos

Além do ledger ter versão sem arquivo, a `main` tem **arquivo sem versão no
ledger** — mesmo nome, carimbo diferente:

| arquivo na `main` | está no ledger? |
|---|---|
| `20260912150000_p0_secdef_search_path.sql` | sim (`20260912150000`) — e `143239` também está, com o mesmo nome |
| `20260912151000_p1_function_search_path.sql` | **não** — o ledger só tem `20260912143344` |
| `20260912152000_p0_pgcrypto_routine_search_path.sql` | **não** — o ledger só tem `20260912144208` |

Ou seja: `p0_secdef_search_path` foi registrado **duas vezes** no ledger, sob
duas versões; e dois arquivos que o repositório carrega nunca foram
registrados sob o carimbo que têm.

## Por que isto importa

`types.ts` é gerado do banco. Enquanto repositório e banco divergem, o ratchet
`audit-types-drift` só consegue medir *sintoma* (tipo sem tabela) e não
*causa* (DDL aplicada sem arquivo, ou arquivo sem DDL). É o mesmo eixo que a
branch `muri` documentou em `missing_final.txt`: 44 tabelas declaradas em
migration e ausentes do banco, das quais **42 continuam ausentes hoje**.

## Decisão que depende do dono

Trazer os 8 arquivos é **documental**: as versões já estão no ledger, então o
`apply` do `canonical-migrations.yml` as ignora (comportamento já observado:
"Nada a aplicar — lote já registrado no ledger canônico"). Nenhum DDL roda.

Mas são arquivos de migration em produção, o que cai na regra 8 do fluxo Git.
As opções:

1. **Trazer os 8 como documentação** do que está aplicado — o repositório passa
   a refletir o banco nesses 8 pontos. Risco: dois arquivos com o mesmo *nome* e
   carimbos diferentes convivendo (`p0_secdef_search_path`).
2. **Não trazer** e registrar a divergência só aqui. O repositório segue sem
   documentar 8 DDLs que estão em produção.
3. **Reconciliar de verdade**: decidir, para cada par duplicado, qual carimbo é
   o canônico, e ajustar ledger ou arquivo. Envolve escrita no ledger — e isso
   não se faz sem a sua autorização explícita.

Esta PR implementa a opção 1 e fica **aberta** para você decidir.
