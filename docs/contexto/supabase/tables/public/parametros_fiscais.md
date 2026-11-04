# public.parametros_fiscais

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
| 2 | `tipo` | `text` | não |  |  |  |
| 3 | `vigencia_inicio` | `date` | não |  |  |  |
| 4 | `vigencia_fim` | `date` | sim |  |  |  |
| 5 | `faixa` | `integer` | sim |  |  |  |
| 6 | `valor_inicial` | `numeric(12,2)` | sim |  |  |  |
| 7 | `valor_final` | `numeric(12,2)` | sim |  |  |  |
| 8 | `aliquota` | `numeric(6,4)` | sim |  |  |  |
| 9 | `deducao` | `numeric(12,2)` | sim |  |  |  |
| 10 | `valor_fixo` | `numeric(12,2)` | sim |  |  |  |
| 11 | `ativo` | `boolean` | sim | `true` |  |  |
| 12 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| parametros_fiscais_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| parametros_fiscais_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX parametros_fiscais_pkey ON public.parametros_fiscais USING btree (id)` |


## Policies (RLS)

### `Authenticated users can view parametros`

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
