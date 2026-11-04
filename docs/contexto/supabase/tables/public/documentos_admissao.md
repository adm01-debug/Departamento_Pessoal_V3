# public.documentos_admissao

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
| 2 | `admissao_id` | `uuid` | não |  |  |  |
| 3 | `tipo` | `text` | não |  |  |  |
| 4 | `nome_arquivo` | `text` | não |  |  |  |
| 5 | `url` | `text` | não |  |  |  |
| 6 | `tamanho_bytes` | `integer` | sim |  |  |  |
| 7 | `validado` | `boolean` | sim | `false` |  |  |
| 8 | `validado_por` | `uuid` | sim |  |  |  |
| 9 | `validado_em` | `timestamp with time zone` | sim |  |  |  |
| 10 | `observacoes` | `text` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| documentos_admissao_admissao_id_fkey | FOREIGN KEY | `FOREIGN KEY (admissao_id) REFERENCES admissoes(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| documentos_admissao_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| documentos_admissao_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX documentos_admissao_pkey ON public.documentos_admissao USING btree (id)` |
| idx_documentos_admissao_admissao_id | btree | admissao_id | não | sim |  | `CREATE INDEX idx_documentos_admissao_admissao_id ON public.documentos_admissao USING btree (admissao_id)` |


## Policies (RLS)

### `Gestores veem documentos de admissão`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(auth.uid() IN ( SELECT user_roles.user_id    FROM user_roles   WHERE (user_roles.role = ANY (ARRAY['admin'::app_role, 'rh'::app_role, 'gestor'::app_role]))))` |
| WITH CHECK |  |

### `Tenant scoped documentos_admissao`

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
| tr_update_admissao_checklist | AFTER | UPDATE | ROW | enabled | public.fn_update_admissao_checklist |
| update_documentos_admissao_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
