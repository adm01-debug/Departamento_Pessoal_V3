# public.afdt_divergencias

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 1 |
| realtime (publication) | sim |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `importacao_id` | `uuid` | não |  |  |  |
| 3 | `empresa_id` | `uuid` | não |  |  |  |
| 4 | `registro_raw_id` | `uuid` | sim |  |  |  |
| 5 | `colaborador_id` | `uuid` | sim |  |  |  |
| 6 | `batida_id` | `uuid` | sim |  |  |  |
| 7 | `pis` | `text` | sim |  |  |  |
| 8 | `data_hora_afdt` | `timestamp with time zone` | sim |  |  |  |
| 9 | `tipo` | `text` | não |  |  |  |
| 10 | `delta_segundos` | `integer` | sim |  |  |  |
| 11 | `resolvido` | `boolean` | não | `false` |  |  |
| 12 | `observacao` | `text` | sim |  |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| afdt_divergencias_importacao_id_fkey | FOREIGN KEY | `FOREIGN KEY (importacao_id) REFERENCES afdt_importacoes(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| afdt_divergencias_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| afdt_divergencias_registro_raw_id_fkey | FOREIGN KEY | `FOREIGN KEY (registro_raw_id) REFERENCES afdt_registros_raw(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| afdt_divergencias_tipo_check | CHECK | `CHECK (tipo = ANY (ARRAY['ok'::text, 'sem_colaborador'::text, 'sem_batida'::text, 'duplicado'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| afdt_divergencias_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX afdt_divergencias_pkey ON public.afdt_divergencias USING btree (id)` |
| idx_afdt_div_emp_tipo | btree | empresa_id, tipo | não | sim | `(resolvido = false)` | `CREATE INDEX idx_afdt_div_emp_tipo ON public.afdt_divergencias USING btree (empresa_id, tipo) WHERE (resolvido = false)` |
| idx_afdt_div_imp | btree | importacao_id | não | sim |  | `CREATE INDEX idx_afdt_div_imp ON public.afdt_divergencias USING btree (importacao_id)` |
| idx_afdt_div_pis_unresolved | btree | empresa_id, pis | não | sim | `((resolvido = false) AND (colaborador_id IS NULL))` | `CREATE INDEX idx_afdt_div_pis_unresolved ON public.afdt_divergencias USING btree (empresa_id, pis) WHERE ((resolvido = false) AND (colaborador_id IS NULL))` |
| idx_afdt_diverg_registro_raw_id | btree | registro_raw_id | não | sim |  | `CREATE INDEX idx_afdt_diverg_registro_raw_id ON public.afdt_divergencias USING btree (registro_raw_id)` |


## Policies (RLS)

### `afdt_div_tenant_all`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT ue.empresa_id    FROM user_empresas ue   WHERE (ue.user_id = auth.uid())))` |
| WITH CHECK | `(empresa_id IN ( SELECT ue.empresa_id    FROM user_empresas ue   WHERE (ue.user_id = auth.uid())))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
