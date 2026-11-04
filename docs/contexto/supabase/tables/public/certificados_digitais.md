# public.certificados_digitais

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
| 2 | `empresa_id` | `uuid` | sim |  |  |  |
| 3 | `subject` | `text` | sim |  |  |  |
| 4 | `issuer` | `text` | sim |  |  |  |
| 5 | `valid_from` | `timestamp with time zone` | sim |  |  |  |
| 6 | `valid_to` | `timestamp with time zone` | sim |  |  |  |
| 7 | `thumbprint` | `text` | sim |  |  |  |
| 8 | `ativo` | `boolean` | sim | `true` |  |  |
| 9 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 10 | `arquivo_base64` | `text` | sim |  |  |  |
| 11 | `senha_encriptada` | `text` | sim |  |  |  |
| 12 | `cnpj_cpf` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| certificados_digitais_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| certificados_digitais_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.configuracoes_esocial | configuracoes_esocial_certificado_id_fkey | certificado_id | SET NULL |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| certificados_digitais_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX certificados_digitais_pkey ON public.certificados_digitais USING btree (id)` |
| idx_certificados_digitais_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_certificados_digitais_empresa_id ON public.certificados_digitais USING btree (empresa_id)` |


## Policies (RLS)

### `Certificados scoped by empresa`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
