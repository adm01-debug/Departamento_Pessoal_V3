# public.colaborador_lotacoes

> Relacionamento colaborador <-> lotacao (M:N). Uma lotacao pode servir varios colaboradores; um colaborador pode ter mais de uma lotacao, com no maximo uma marcada principal = true (ver indice unico parcial abaixo). UI atual (aba Profissional) so gerencia a lotacao principal.

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
| 3 | `colaborador_id` | `uuid` | não |  |  |  |
| 4 | `lotacao_id` | `uuid` | não |  |  |  |
| 5 | `principal` | `boolean` | não | `false` |  |  |
| 6 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 7 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| colaborador_lotacoes_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| colaborador_lotacoes_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| colaborador_lotacoes_lotacao_id_fkey | FOREIGN KEY | `FOREIGN KEY (lotacao_id) REFERENCES lotacoes(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| colaborador_lotacoes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| colaborador_lotacoes_vinculo_unico | UNIQUE | `UNIQUE (colaborador_id, lotacao_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| colaborador_lotacoes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX colaborador_lotacoes_pkey ON public.colaborador_lotacoes USING btree (id)` |
| colaborador_lotacoes_principal_unica | btree | colaborador_id | sim | sim | `(principal = true)` | `CREATE UNIQUE INDEX colaborador_lotacoes_principal_unica ON public.colaborador_lotacoes USING btree (colaborador_id) WHERE (principal = true)` |
| colaborador_lotacoes_vinculo_unico | btree | colaborador_id, lotacao_id | sim | sim |  | `CREATE UNIQUE INDEX colaborador_lotacoes_vinculo_unico ON public.colaborador_lotacoes USING btree (colaborador_id, lotacao_id)` |
| idx_colaborador_lotacoes_colaborador | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_colaborador_lotacoes_colaborador ON public.colaborador_lotacoes USING btree (colaborador_id)` |
| idx_colaborador_lotacoes_empresa | btree | empresa_id | não | sim |  | `CREATE INDEX idx_colaborador_lotacoes_empresa ON public.colaborador_lotacoes USING btree (empresa_id)` |
| idx_colaborador_lotacoes_lotacao | btree | lotacao_id | não | sim |  | `CREATE INDEX idx_colaborador_lotacoes_lotacao ON public.colaborador_lotacoes USING btree (lotacao_id)` |


## Policies (RLS)

### `colaborador_lotacoes_tenant`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `rls_tenant_or_admin(empresa_id)` |
| WITH CHECK | `rls_tenant_or_admin(empresa_id)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_colaborador_lotacoes_valida_tenant | BEFORE | INSERT OR UPDATE | ROW | enabled | public.colaborador_lotacoes_valida_tenant |


## Grants

| role | privilégios |
|---|---|
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
