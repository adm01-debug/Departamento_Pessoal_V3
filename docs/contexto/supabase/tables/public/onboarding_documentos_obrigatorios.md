# public.onboarding_documentos_obrigatorios

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
| 3 | `onboarding_id` | `uuid` | não |  |  |  |
| 4 | `nome_documento` | `text` | não |  |  |  |
| 5 | `entregue` | `boolean` | sim | `false` |  |  |
| 6 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 7 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| onboarding_documentos_obrigatorios_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| onboarding_documentos_obrigatorios_onboarding_id_fkey | FOREIGN KEY | `FOREIGN KEY (onboarding_id) REFERENCES onboarding_colaborador(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| onboarding_documentos_obrigatorios_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_onboarding_documentos_obrigatorios_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_onboarding_documentos_obrigatorios_empresa_id ON public.onboarding_documentos_obrigatorios USING btree (empresa_id)` |
| idx_onboarding_documentos_obrigatorios_onboarding_id | btree | onboarding_id | não | sim |  | `CREATE INDEX idx_onboarding_documentos_obrigatorios_onboarding_id ON public.onboarding_documentos_obrigatorios USING btree (onboarding_id)` |
| onboarding_documentos_obrigatorios_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX onboarding_documentos_obrigatorios_pkey ON public.onboarding_documentos_obrigatorios USING btree (id)` |


## Policies (RLS)

### `empresa_isolation_onboarding_documentos_obrigatorios`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id = get_auth_empresa_id())` |
| WITH CHECK | `(empresa_id = get_auth_empresa_id())` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_updated_at_onboarding_documentos_obrigatorios | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
