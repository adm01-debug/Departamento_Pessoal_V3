# public.banco_horas

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
| usada por views | public.vw_alertas_compensacao, public.vw_banco_horas_saldo |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `colaborador_id` | `uuid` | não |  |  |  |
| 3 | `data` | `date` | não |  |  |  |
| 4 | `tipo` | `character varying(10)` | não |  |  |  |
| 5 | `horas` | `interval` | não |  |  |  |
| 6 | `motivo` | `text` | sim |  |  |  |
| 7 | `registro_ponto_id` | `uuid` | sim |  |  |  |
| 8 | `saldo_anterior` | `interval` | sim | `'00:00:00'::interval` |  |  |
| 9 | `saldo_atual` | `interval` | sim | `'00:00:00'::interval` |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `created_by` | `uuid` | sim |  |  |  |
| 12 | `empresa_id` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| banco_horas_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| banco_horas_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| banco_horas_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| banco_horas_registro_ponto_id_fkey | FOREIGN KEY | `FOREIGN KEY (registro_ponto_id) REFERENCES registros_ponto(id)` | NO ACTION | NO ACTION | sim |
| banco_horas_tipo_check | CHECK | `CHECK (tipo::text = ANY (ARRAY['credito'::character varying::text, 'debito'::character varying::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| banco_horas_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX banco_horas_pkey ON public.banco_horas USING btree (id)` |
| idx_banco_horas_colaborador_data | btree | colaborador_id, data | não | sim |  | `CREATE INDEX idx_banco_horas_colaborador_data ON public.banco_horas USING btree (colaborador_id, data)` |
| idx_banco_horas_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_banco_horas_colaborador_id ON public.banco_horas USING btree (colaborador_id)` |
| idx_banco_horas_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_banco_horas_empresa_id ON public.banco_horas USING btree (empresa_id)` |
| idx_banco_horas_registro_ponto_id | btree | registro_ponto_id | não | sim |  | `CREATE INDEX idx_banco_horas_registro_ponto_id ON public.banco_horas USING btree (registro_ponto_id)` |


## Policies (RLS)

### `banco_horas_tenant_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)) OR is_admin(auth.uid()))` |
| WITH CHECK |  |

### `empresa_banco_horas`

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
