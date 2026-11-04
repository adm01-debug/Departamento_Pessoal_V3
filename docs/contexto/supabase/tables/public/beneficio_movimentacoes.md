# public.beneficio_movimentacoes

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
| 2 | `colaborador_id` | `uuid` | sim |  |  |  |
| 3 | `beneficio_id` | `uuid` | sim |  |  |  |
| 4 | `tipo_movimentacao` | `text` | não |  |  |  |
| 5 | `data_movimentacao` | `date` | sim | `CURRENT_DATE` |  |  |
| 6 | `motivo` | `text` | sim |  |  |  |
| 7 | `usuario_id` | `uuid` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `timezone('utc'::text, now())` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| beneficio_movimentacoes_beneficio_id_fkey | FOREIGN KEY | `FOREIGN KEY (beneficio_id) REFERENCES beneficios(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| beneficio_movimentacoes_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| beneficio_movimentacoes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| beneficio_movimentacoes_tipo_movimentacao_check | CHECK | `CHECK (tipo_movimentacao = ANY (ARRAY['adesao'::text, 'exclusao'::text, 'alteracao'::text]))` |  |  | sim |
| beneficio_movimentacoes_usuario_id_fkey | FOREIGN KEY | `FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| beneficio_movimentacoes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX beneficio_movimentacoes_pkey ON public.beneficio_movimentacoes USING btree (id)` |
| idx_beneficio_movimentacoes_beneficio_id | btree | beneficio_id | não | sim |  | `CREATE INDEX idx_beneficio_movimentacoes_beneficio_id ON public.beneficio_movimentacoes USING btree (beneficio_id)` |
| idx_beneficio_movimentacoes_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_beneficio_movimentacoes_colaborador_id ON public.beneficio_movimentacoes USING btree (colaborador_id)` |
| idx_beneficio_movimentacoes_usuario_id | btree | usuario_id | não | sim |  | `CREATE INDEX idx_beneficio_movimentacoes_usuario_id ON public.beneficio_movimentacoes USING btree (usuario_id)` |


## Policies (RLS)

### `Movimentações acessíveis por empresa`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(EXISTS ( SELECT 1    FROM colaboradores c   WHERE ((c.id = beneficio_movimentacoes.colaborador_id) AND pertence_a_empresa(c.empresa_id))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM colaboradores c   WHERE ((c.id = beneficio_movimentacoes.colaborador_id) AND pertence_a_empresa(c.empresa_id))))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
