# public.periodos_ponto

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
| 2 | `competencia` | `character varying(7)` | não |  |  |  |
| 3 | `data_inicio` | `date` | não |  |  |  |
| 4 | `data_fim` | `date` | não |  |  |  |
| 5 | `status` | `character varying(20)` | sim | `'aberto'::character varying` |  |  |
| 6 | `fechado_em` | `timestamp with time zone` | sim |  |  |  |
| 7 | `fechado_por` | `uuid` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| periodos_ponto_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| periodos_ponto_status_check | CHECK | `CHECK (status::text = ANY (ARRAY['aberto'::character varying::text, 'fechado'::character varying::text, 'processado'::character varying::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| periodos_ponto_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX periodos_ponto_pkey ON public.periodos_ponto USING btree (id)` |


## Policies (RLS)

### `Admins can delete periodos_ponto`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin(auth.uid())` |
| WITH CHECK |  |

### `Admins can manage periodos_ponto`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_admin(auth.uid())` |

### `Admins can update periodos_ponto`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin(auth.uid())` |
| WITH CHECK |  |

### `Authenticated can read periodos_ponto`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_impedir_alteracao_periodo_ponto_fechado | BEFORE | UPDATE | ROW | enabled | public.impedir_alteracao_periodo_ponto_fechado |
| trg_proibir_delete_periodo_ponto_fechado | BEFORE | DELETE | ROW | enabled | public.proibir_delete_periodo_ponto_fechado |
| update_periodos_ponto_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
