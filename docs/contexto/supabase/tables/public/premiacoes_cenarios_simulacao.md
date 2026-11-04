# public.premiacoes_cenarios_simulacao

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
| 2 | `nome` | `text` | não |  |  |  |
| 3 | `configuracoes` | `jsonb` | não |  |  |  |
| 4 | `criado_por` | `uuid` | sim |  |  |  |
| 5 | `empresa_id` | `uuid` | sim |  |  |  |
| 6 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| premiacoes_cenarios_simulacao_criado_por_fkey | FOREIGN KEY | `FOREIGN KEY (criado_por) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| premiacoes_cenarios_simulacao_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| premiacoes_cenarios_simulacao_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_premiacoes_cenarios_simulacao_criado_por | btree | criado_por | não | sim |  | `CREATE INDEX idx_premiacoes_cenarios_simulacao_criado_por ON public.premiacoes_cenarios_simulacao USING btree (criado_por)` |
| idx_premiacoes_cenarios_simulacao_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_premiacoes_cenarios_simulacao_empresa_id ON public.premiacoes_cenarios_simulacao USING btree (empresa_id)` |
| premiacoes_cenarios_simulacao_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX premiacoes_cenarios_simulacao_pkey ON public.premiacoes_cenarios_simulacao USING btree (id)` |


## Policies (RLS)

### `Usuários podem ver seus próprios cenários de simulação`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(auth.uid() = criado_por)` |
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
