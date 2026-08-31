# Baseline canônico — 31/08/2026

Snapshot lógico **sem dados** do projeto Supabase `frjbfeamybqsejlvmqbl`,
PostgreSQL 17.6. Este diretório é candidato de squash/DR e fica fora de
`supabase/migrations/` deliberadamente: ele não pode ser executado em produção
como migration incremental.

## Conteúdo

- `canonical_roles.sql`: roles e parâmetros; não contém passwords. A senha de
  `dp_mcp_user` precisa ser provisionada pelo cofre depois do restore.
- `canonical_schema.sql`: schema físico canônico exportado pela CLI oficial.
- `canonical_auth_schema.sql`: referência do schema gerenciado de Auth.
- `canonical_storage_schema.sql`: schema gerenciado de Storage, incluindo as
  10 policies tenant que o dump principal não transporta.
- `canonical_cron_schema.sql` e `canonical_cron_data.sql`: pg_cron; no corte,
  o canônico tinha zero jobs.
- `local_storage_compat.sql`: compatibilidade exclusiva para staging local cuja
  imagem de Storage esteja atrás da versão hospedada; não substitui o restore
  completo do schema/policies de Storage.
- `post_restore_auth.sql`: quatro índices Auth presentes no canônico e ausentes
  na imagem local usada no teste.
- `post_restore_acl.sql`: corrige default privileges introduzidos pelo bootstrap
  local em três objetos PII.
- `verify.sql`: gate estrutural mínimo, sem leitura/exibição de dados.
- `manifest.sha256`: integridade dos artefatos versionados.

O dump de dados, que inclui Auth, `public` e Storage e contém PII/segredos de
sessão, **não é versionado**. O artefato da auditoria está preservado em
`.local-backups/frjbfeamybqsejlvmqbl/20260831/`, ignorado pelo Git, com
permissões `0700/0600` e hash documentado no relatório de drift. Ele ainda deve
ser copiado para um cofre externo criptografado antes de qualquer promoção.

## Ordem de restauração validada

1. Subir um Supabase local descartável com PostgreSQL 17.
2. Restaurar `canonical_roles.sql` como `postgres`.
3. Restaurar `canonical_schema.sql` como `postgres`.
4. Em destino descartável, recriar `storage` com
   `canonical_storage_schema.sql` como `supabase_admin`; em plataforma
   gerenciada, comparar versões e usar o mecanismo oficial de restore.
5. Aplicar `post_restore_auth.sql` como `supabase_admin`.
6. Restaurar o dump de dados protegido como `supabase_admin`.
7. Aplicar `post_restore_acl.sql` como `postgres`.
8. Executar `verify.sql`, o inventário e os gates de segurança.

O restore de 31/08/2026 carregou exatamente 390 blocos `COPY`; as contagens
por tabela do dump e do banco restaurado tiveram diff zero. O inventário do
schema restaurado, após os revokes, teve o mesmo multiconjunto de linhas SQL do
dump canônico.

## Bloqueio para promoção

Este baseline representa fielmente o canônico, inclusive seus débitos. Os
cinco gates de segurança do repositório estão vermelhos; por isso ele ainda
não deve substituir o histórico ativo nem ser marcado no ledger remoto. Veja
`docs/auditoria/drift/20260831-relatorio-drift.md`.
