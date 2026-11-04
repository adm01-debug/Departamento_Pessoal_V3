# public.escalas

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `nome` | `text` | não |  |  |  |
| 3 | `tipo` | `text` | sim | `'padrao'::text` |  |  |
| 4 | `empresa_id` | `uuid` | sim |  |  |  |
| 5 | `dias_trabalho` | `integer` | sim | `5` |  |  |
| 6 | `dias_folga` | `integer` | sim | `2` |  |  |
| 7 | `horario_entrada` | `text` | sim |  |  |  |
| 8 | `horario_saida` | `text` | sim |  |  |  |
| 9 | `intervalo_minutos` | `integer` | sim | `60` |  |  |
| 10 | `ativo` | `boolean` | sim | `true` |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| escalas_ciclo_valido | CHECK | `CHECK ((dias_trabalho IS NULL OR dias_trabalho >= 1 AND dias_trabalho <= 7) AND COALESCE(dias_folga, 0) >= 0 AND COALESCE(dias_folga, 0) <= 6 AND COALESCE(intervalo_minutos, 0) >= 0)` |  |  | sim |
| escalas_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| escalas_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| escalas_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX escalas_pkey ON public.escalas USING btree (id)` |
| idx_escalas_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_escalas_empresa_id ON public.escalas USING btree (empresa_id)` |


## Policies (RLS)

### `escalas_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK |  |

### `escalas_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |

### `escalas_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK |  |

### `escalas_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_escalas_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
