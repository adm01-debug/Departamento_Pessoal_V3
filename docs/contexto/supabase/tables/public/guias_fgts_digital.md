# public.guias_fgts_digital

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
| 2 | `empresa_id` | `uuid` | não |  |  |  |
| 3 | `competencia` | `text` | não |  |  |  |
| 4 | `tipo` | `text` | não |  |  |  |
| 5 | `valor_total` | `numeric(15,2)` | não |  |  |  |
| 6 | `vencimento` | `date` | não |  |  |  |
| 7 | `status` | `text` | sim | `'pendente'::text` |  |  |
| 8 | `gfd_protocolo` | `text` | sim |  |  |  |
| 9 | `gfd_data_geracao` | `timestamp with time zone` | sim |  |  |  |
| 10 | `pdf_url` | `text` | sim |  |  |  |
| 11 | `qr_code_pix` | `text` | sim |  |  |  |
| 12 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 13 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| guias_fgts_digital_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.fgts_digital_logs | fgts_digital_logs_guia_id_fkey | guia_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| guias_fgts_digital_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX guias_fgts_digital_pkey ON public.guias_fgts_digital USING btree (id)` |


## Policies (RLS)

### `Gestores e RH veem guias FGTS`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(auth.uid() IN ( SELECT user_roles.user_id    FROM user_roles   WHERE (user_roles.role = ANY (ARRAY['admin'::app_role, 'gestor'::app_role, 'rh'::app_role]))))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
