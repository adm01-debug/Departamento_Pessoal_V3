# public.documentos_afastamento

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `afastamento_id` | `uuid` | não |  |  |  |
| 3 | `tipo` | `character varying(50)` | não |  |  |  |
| 4 | `nome_arquivo` | `character varying(255)` | não |  |  |  |
| 5 | `url` | `text` | não |  |  |  |
| 6 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 7 | `created_by` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| documentos_afastamento_afastamento_id_fkey | FOREIGN KEY | `FOREIGN KEY (afastamento_id) REFERENCES afastamentos(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| documentos_afastamento_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| documentos_afastamento_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX documentos_afastamento_pkey ON public.documentos_afastamento USING btree (id)` |
| idx_documentos_afastamento_afastamento_id | btree | afastamento_id | não | sim |  | `CREATE INDEX idx_documentos_afastamento_afastamento_id ON public.documentos_afastamento USING btree (afastamento_id)` |


## Policies (RLS)

### `Users can manage their company docs`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(EXISTS ( SELECT 1    FROM afastamentos a   WHERE ((a.id = documentos_afastamento.afastamento_id) AND pertence_a_empresa(a.empresa_id))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM afastamentos a   WHERE ((a.id = documentos_afastamento.afastamento_id) AND pertence_a_empresa(a.empresa_id))))` |

### `tenant_documentos_afastamento`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(afastamento_id IN ( SELECT afastamentos.id    FROM afastamentos   WHERE (afastamentos.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |
| WITH CHECK | `(afastamento_id IN ( SELECT afastamentos.id    FROM afastamentos   WHERE (afastamentos.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
