# public.contas_bancarias

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
| usada por views | public.contas_bancarias_decrypted |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `colaborador_id` | `uuid` | não |  |  |  |
| 3 | `empresa_id` | `uuid` | sim |  |  |  |
| 4 | `banco_nome` | `text` | sim |  |  |  |
| 5 | `banco_codigo` | `text` | sim |  |  |  |
| 6 | `agencia` | `text` | sim |  |  |  |
| 7 | `conta` | `text` | sim |  |  |  |
| 8 | `digito` | `text` | sim |  |  |  |
| 9 | `tipo_conta` | `text` | sim | `'corrente'::text` |  |  |
| 10 | `pix_chave` | `text` | sim |  |  |  |
| 11 | `pix_tipo` | `text` | sim |  |  |  |
| 12 | `modalidade` | `text` | sim | `'PF'::text` |  |  |
| 13 | `principal` | `boolean` | sim | `false` |  |  |
| 14 | `ativo` | `boolean` | sim | `true` |  |  |
| 15 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 16 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 17 | `agencia_digito` | `text` | sim |  |  |  |
| 18 | `agencia_encrypted` | `text` | sim |  |  |  |
| 19 | `conta_encrypted` | `text` | sim |  |  |  |
| 20 | `digito_encrypted` | `text` | sim |  |  |  |
| 21 | `pix_chave_encrypted` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| contas_bancarias_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| contas_bancarias_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| contas_bancarias_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| contas_bancarias_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX contas_bancarias_pkey ON public.contas_bancarias USING btree (id)` |
| idx_contas_bancarias_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_contas_bancarias_colaborador_id ON public.contas_bancarias USING btree (colaborador_id)` |
| idx_contas_bancarias_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_contas_bancarias_empresa_id ON public.contas_bancarias USING btree (empresa_id)` |


## Policies (RLS)

### `contas_bancarias_rh_manage`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(pode_gerir_rh(empresa_id) OR is_admin(auth.uid()))` |
| WITH CHECK | `pode_gerir_rh(empresa_id)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_contas_bancarias_encrypt | BEFORE | INSERT OR UPDATE | ROW | enabled | public.encrypt_contas_bancarias_fields |
| update_contas_bancarias_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
