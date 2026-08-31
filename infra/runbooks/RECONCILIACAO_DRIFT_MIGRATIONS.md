# Runbook — reconciliação segura de drift de migrations

## Regras invioláveis

1. Confirmar `project_id = frjbfeamybqsejlvmqbl` e PostgreSQL 17.x.
2. Nunca usar o MCP legado/divergente para DDL ou ledger.
3. Nunca executar `db push` enquanto existir migration remota sem fonte,
   versão duplicada, replay vermelho ou diff físico não explicado.
4. Nunca usar `migration repair` para tornar a lista visualmente verde.
5. Dados de backup ficam fora do Git, com `0700/0600` e cópia em cofre externo.

## Gate A — backup restaurável

Exportar schema, dados e roles pela CLI oficial vinculada. Exportar Storage e
cron explicitamente. Registrar tamanho e SHA-256. Restaurar em PostgreSQL da
mesma versão principal e comparar contagens por tabela.

Critérios de aprovação:

- roles e schema restauram com `ON_ERROR_STOP`;
- todos os blocos `COPY` restauram;
- contagens por tabela são idênticas;
- inventário do schema tem diff semântico zero;
- Auth, Storage, RLS, funções e triggers são testados;
- backup é copiado para armazenamento durável e criptografado.

## Gate B — replay histórico

Executar as migrations sem edição em stack descartável. Registrar ordinal,
arquivo, SQLSTATE e statement da primeira falha. Não “corrigir para continuar”
na mesma execução: isso destruiria a prova do histórico real.

Gerar classificação reproduzível:

```bash
node scripts/db/classify-migration-drift.mjs \
  --migrations supabase/migrations \
  --ledger-json /caminho/migration-list.json \
  --last-successful-ordinal 528 \
  --failed-file 20260724100000_p3_054_mv_telemetry_dashboard.sql \
  --output migration-classification.csv \
  --summary migration-classification.summary.json
```

## Gate C — diff físico

Gerar o inventário de ambos os bancos com:

```bash
psql -At -v ON_ERROR_STOP=1 -f scripts/db/schema-inventory.sql > inventory.txt
```

Comparar por categoria. Todo item ausente/extra precisa ser resolvido ou
formalmente aceito; contagem semelhante não significa schema igual.

## Gate D — baseline/squash

O candidato atual está em `supabase/baseline/20260831_canonical/`. Ele não é
uma migration incremental. Validar primeiro em projeto hospedado de staging.

Estratégia de ativação, somente após todos os gates verdes:

1. arquivar os 644 arquivos legados fora de `supabase/migrations/`;
2. criar placeholders documentais/no-op para as 33 versões que já existem no
   ledger remoto, preservando a história sem reexecutar DDL desconhecido;
3. copiar o schema canônico validado como uma única migration de squash com
   timestamp novo;
4. provar que um projeto vazio sobe apenas com placeholders + squash +
   migrations posteriores;
5. provar upgrade do staging com dados mascarados;
6. marcar apenas o timestamp do squash como `applied` no canônico;
7. conferir `migration list`, schema inventory e smokes novamente.

Não remover/reverter as 33 linhas históricas do ledger sem evidência documental.

## Gate E — segurança e função

Exigir código zero real (não “banco inacessível”) em:

- `audit-db-search-path.mjs`;
- `audit-rls-tenant-open.mjs`;
- `audit-rls-pii.mjs`;
- `audit-rls-least-privilege.mjs`;
- `audit-secdef-authz.mjs`.

Depois executar login/MFA, isolamento tenant A/B, folha, férias, ponto,
rescisão, uploads/downloads de cada bucket, Edge Functions, bridge, jobs e
restauração de um objeto do Storage.

## Condição atual

Em 31/08/2026, Gate A estrutural passou localmente; Gates B, C e E reprovaram.
O projeto hospedado de staging ainda não foi fornecido. Portanto qualquer
`migration repair` ou ativação do squash continua bloqueado.
