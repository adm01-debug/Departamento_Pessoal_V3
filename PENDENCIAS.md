# PENDENCIAS.md — Itens que dependem do Joaquim ou de ação externa

Data: 2026-10-27 · Contexto: correção dos workflows em falha na main

## Dependências já endereçadas por código (aguardando apenas execução)

| Item                                                 | O que falta                                                               | Como concluir                                                                                                                                        |
| ---------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gate `Integridade do banco canônico (live)` (ci.yml) | Aplicar a migration `20261027000000_revoke_orphan_secdef.sql` no canônico | Mergear o PR `fix/ci-workflows` e rodar Actions → `canonical-migrations.yml` → `mode=apply`, `confirm_project_ref=frjbfeamybqsejlvmqbl`              |
| E2E autenticado (e2e.yml)                            | Aplicar `EXTRA_ALLOWED_ORIGINS` nas edges de produção                     | Após o merge, dispatch de `canonical-edge-functions.yml` (o novo passo configura o secret automaticamente); o próximo run do E2E na main deve passar |

## Dependências que só o Joaquim executa

| Item                                                                | Motivo                                                                                                                  | Ação necessária                                                                                                              |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Rotacionar token do Supabase                                        | Um token foi colado no chat em sessão anterior (já salvo como secret, mas convém rotacionar)                            | Gerar um novo access token no dashboard do Supabase e atualizar o secret `SUPABASE_ACCESS_TOKEN` do environment `production` |
| Vincular `admin@teste.local` a uma empresa                          | Sem empresa vinculada, todos os writes no E2E retornam 403 — o caminho de escrita de ponta a ponta não pôde ser provado | No app, vincular a conta de teste a uma empresa (role admin/rh)                                                              |
| Chaves Turnstile, pen test, 2º CODEOWNER, env de produção na Vercel | Itens administrativos fora do alcance do repositório                                                                    | Conforme combinado nas sessões anteriores                                                                                    |

## Nota

Nenhum workflow ficou sem tratamento: todos os que falhavam na main têm correção em código (este PR) ou correção de configuração já aplicada (ruleset, permissão de PR do Actions), exceto os dois itens acima que dependem apenas da execução dos deploys após o merge.
