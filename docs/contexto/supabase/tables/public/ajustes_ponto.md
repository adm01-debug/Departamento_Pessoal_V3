# public.ajustes_ponto

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
| 2 | `registro_ponto_id` | `uuid` | não |  |  |  |
| 3 | `colaborador_id` | `uuid` | não |  |  |  |
| 4 | `campo_alterado` | `character varying(50)` | não |  |  |  |
| 5 | `valor_anterior` | `text` | sim |  |  |  |
| 6 | `valor_novo` | `text` | sim |  |  |  |
| 7 | `motivo` | `text` | não |  |  |  |
| 8 | `status` | `character varying(20)` | sim | `'pendente'::character varying` |  |  |
| 9 | `aprovado_por` | `uuid` | sim |  |  |  |
| 10 | `aprovado_em` | `timestamp with time zone` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `created_by` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ajustes_ponto_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| ajustes_ponto_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| ajustes_ponto_registro_ponto_id_fkey | FOREIGN KEY | `FOREIGN KEY (registro_ponto_id) REFERENCES registros_ponto(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| ajustes_ponto_status_check | CHECK | `CHECK (status::text = ANY (ARRAY['pendente'::character varying::text, 'aprovado'::character varying::text, 'rejeitado'::character varying::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| ajustes_ponto_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ajustes_ponto_pkey ON public.ajustes_ponto USING btree (id)` |
| idx_ajustes_ponto_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_ajustes_ponto_colaborador_id ON public.ajustes_ponto USING btree (colaborador_id)` |
| idx_ajustes_ponto_registro_ponto_id | btree | registro_ponto_id | não | sim |  | `CREATE INDEX idx_ajustes_ponto_registro_ponto_id ON public.ajustes_ponto USING btree (registro_ponto_id)` |


## Policies (RLS)

### `tenant_ajustes_ponto`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(colaborador_id IN ( SELECT colaboradores.id    FROM colaboradores   WHERE (colaboradores.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |
| WITH CHECK | `(colaborador_id IN ( SELECT colaboradores.id    FROM colaboradores   WHERE (colaboradores.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
