# public.dctfweb_declaracoes

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
| 3 | `competencia` | `text` | não |  |  |  |
| 4 | `status` | `text` | sim | `'pendente'::text` |  |  |
| 5 | `data_geracao` | `timestamp with time zone` | sim | `now()` |  |  |
| 6 | `data_transmissao` | `timestamp with time zone` | sim |  |  |  |
| 7 | `debitos` | `jsonb` | sim | `'[]'::jsonb` |  |  |
| 8 | `total_debitos` | `numeric` | sim | `0` |  |  |
| 9 | `total_remuneracao` | `numeric` | sim | `0` |  |  |
| 10 | `total_fgts` | `numeric` | sim | `0` |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| dctfweb_declaracoes_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| dctfweb_declaracoes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| dctfweb_declaracoes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX dctfweb_declaracoes_pkey ON public.dctfweb_declaracoes USING btree (id)` |
| idx_dctfweb_declaracoes_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_dctfweb_declaracoes_empresa_id ON public.dctfweb_declaracoes USING btree (empresa_id)` |


## Policies (RLS)

### `tenant_dctfweb_declaracoes`

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
