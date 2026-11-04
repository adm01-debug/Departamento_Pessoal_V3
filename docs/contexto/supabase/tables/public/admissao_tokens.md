# public.admissao_tokens

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 1 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `admissao_id` | `uuid` | não |  |  |  |
| 3 | `token` | `text` | não | `encode(extensions.gen_random_bytes(32), 'hex'::text)` |  |  |
| 4 | `email_candidato` | `text` | sim |  |  |  |
| 5 | `telefone_candidato` | `text` | sim |  |  |  |
| 6 | `data_expiracao` | `timestamp with time zone` | não | `(now() + '7 days'::interval)` |  |  |
| 7 | `dados_preenchidos` | `boolean` | sim | `false` |  |  |
| 8 | `documentos_enviados` | `boolean` | sim | `false` |  |  |
| 9 | `contrato_gerado` | `boolean` | sim | `false` |  |  |
| 10 | `contrato_assinado` | `boolean` | sim | `false` |  |  |
| 11 | `assinatura_base64` | `text` | sim |  |  |  |
| 12 | `assinado_em` | `timestamp with time zone` | sim |  |  |  |
| 13 | `ip_assinatura` | `text` | sim |  |  |  |
| 14 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 16 | `assinatura_url` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| admissao_tokens_admissao_id_fkey | FOREIGN KEY | `FOREIGN KEY (admissao_id) REFERENCES admissoes(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| admissao_tokens_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| admissao_tokens_token_key | UNIQUE | `UNIQUE (token)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| admissao_tokens_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX admissao_tokens_pkey ON public.admissao_tokens USING btree (id)` |
| admissao_tokens_token_key | btree | token | sim | sim |  | `CREATE UNIQUE INDEX admissao_tokens_token_key ON public.admissao_tokens USING btree (token)` |
| idx_admissao_tokens_admissao_id | btree | admissao_id | não | sim |  | `CREATE INDEX idx_admissao_tokens_admissao_id ON public.admissao_tokens USING btree (admissao_id)` |


## Policies (RLS)

### `Tenant scoped admissao_tokens`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(admissao_id IN ( SELECT admissoes.id    FROM admissoes   WHERE (admissoes.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |
| WITH CHECK | `(admissao_id IN ( SELECT admissoes.id    FROM admissoes   WHERE (admissoes.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_admissao_tokens_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |
| update_admissao_tokens_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
