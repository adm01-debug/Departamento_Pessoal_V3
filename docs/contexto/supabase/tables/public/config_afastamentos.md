# public.config_afastamentos

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
| 2 | `tipo` | `tipo_afastamento` | não |  |  |  |
| 3 | `dias_empresa_maximo` | `integer` | sim | `15` |  |  |
| 4 | `dias_minimos` | `integer` | sim | `1` |  |  |
| 5 | `dias_maximos` | `integer` | sim |  |  |  |
| 6 | `pago_empresa` | `boolean` | sim | `true` |  |  |
| 7 | `pago_inss` | `boolean` | sim | `false` |  |  |
| 8 | `descricao` | `text` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `exige_cid` | `boolean` | sim | `true` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| config_afastamentos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| config_afastamentos_tipo_key | UNIQUE | `UNIQUE (tipo)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| config_afastamentos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX config_afastamentos_pkey ON public.config_afastamentos USING btree (id)` |
| config_afastamentos_tipo_key | btree | tipo | sim | sim |  | `CREATE UNIQUE INDEX config_afastamentos_tipo_key ON public.config_afastamentos USING btree (tipo)` |


## Policies (RLS)

### `Authenticated users can view config_afastamentos`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
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
