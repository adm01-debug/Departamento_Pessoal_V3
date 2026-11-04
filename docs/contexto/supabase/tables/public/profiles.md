# public.profiles

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| usada por views | public.v_audit_trail, public.v_contrato_token_timeline |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `nome` | `text` | não | `''::text` |  |  |
| 4 | `cargo` | `text` | sim | `'Usuário'::text` |  |  |
| 5 | `departamento` | `text` | sim | `''::text` |  |  |
| 6 | `telefone` | `text` | sim | `''::text` |  |  |
| 7 | `avatar_url` | `text` | sim | `''::text` |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `role_display` | `text` | sim | `'user'::text` |  |  |
| 11 | `govbr_uid` | `text` | sim |  |  |  |
| 12 | `govbr_nivel_autenticacao` | `text` | sim |  |  |  |
| 13 | `cpf_validado_govbr` | `boolean` | sim | `false` |  |  |
| 14 | `config_notificacoes` | `jsonb` | sim | `'{"push": true, "email": true, "folha_alertas": true}'::jsonb` |  |  |
| 15 | `notificacoes_push` | `boolean` | sim | `true` |  |  |
| 16 | `notificacoes_email` | `boolean` | sim | `true` |  |  |
| 17 | `gov_br_vinculado` | `boolean` | sim | `false` |  |  |
| 18 | `gov_br_nivel` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| profiles_govbr_uid_key | UNIQUE | `UNIQUE (govbr_uid)` |  |  | sim |
| profiles_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| profiles_user_id_key | UNIQUE | `UNIQUE (user_id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.solicitacoes_ajuste_ponto | solicitacoes_ajuste_ponto_aprovado_por_fkey | aprovado_por | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| profiles_govbr_uid_key | btree | govbr_uid | sim | sim |  | `CREATE UNIQUE INDEX profiles_govbr_uid_key ON public.profiles USING btree (govbr_uid)` |
| profiles_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id)` |
| profiles_user_id_key | btree | user_id | sim | sim |  | `CREATE UNIQUE INDEX profiles_user_id_key ON public.profiles USING btree (user_id)` |


## Policies (RLS)

### `Profiles are viewable by own user`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(auth.uid() = id)` |
| WITH CHECK |  |

### `Users can insert their own profile`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(auth.uid() = user_id)` |

### `Users can update their own profile`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(auth.uid() = user_id)` |
| WITH CHECK |  |

### `Users can view their own profile`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(auth.uid() = user_id)` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_profiles_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
