# public.lgpd_consentimentos

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
| 2 | `colaborador_id` | `uuid` | não |  |  |  |
| 3 | `tipo` | `text` | não |  |  |  |
| 4 | `aceito` | `boolean` | sim | `false` |  |  |
| 5 | `versao` | `text` | sim | `'1.0'::text` |  |  |
| 6 | `ip_address` | `text` | sim |  |  |  |
| 7 | `aceito_em` | `timestamp with time zone` | sim |  |  |  |
| 8 | `revogado_em` | `timestamp with time zone` | sim |  |  |  |
| 9 | `empresa_id` | `uuid` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| lgpd_consentimentos_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id)` | NO ACTION | NO ACTION | sim |
| lgpd_consentimentos_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| lgpd_consentimentos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_lgpd_consentimentos_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_lgpd_consentimentos_colaborador_id ON public.lgpd_consentimentos USING btree (colaborador_id)` |
| idx_lgpd_consentimentos_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_lgpd_consentimentos_empresa_id ON public.lgpd_consentimentos USING btree (empresa_id)` |
| lgpd_consentimentos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX lgpd_consentimentos_pkey ON public.lgpd_consentimentos USING btree (id)` |


## Policies (RLS)

### `empresa_lgpd_consentimentos`

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
