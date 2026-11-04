# public.times_brindes

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
| 2 | `time_id` | `uuid` | não |  |  |  |
| 3 | `brinde_id` | `uuid` | não |  |  |  |
| 4 | `quantidade_alocada` | `integer` | sim | `0` |  |  |
| 5 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| times_brindes_brinde_id_fkey | FOREIGN KEY | `FOREIGN KEY (brinde_id) REFERENCES promo_brindes(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| times_brindes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| times_brindes_time_id_brinde_id_key | UNIQUE | `UNIQUE (time_id, brinde_id)` |  |  | sim |
| times_brindes_time_id_fkey | FOREIGN KEY | `FOREIGN KEY (time_id) REFERENCES times(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_times_brindes_brinde_id | btree | brinde_id | não | sim |  | `CREATE INDEX idx_times_brindes_brinde_id ON public.times_brindes USING btree (brinde_id)` |
| times_brindes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX times_brindes_pkey ON public.times_brindes USING btree (id)` |
| times_brindes_time_id_brinde_id_key | btree | time_id, brinde_id | sim | sim |  | `CREATE UNIQUE INDEX times_brindes_time_id_brinde_id_key ON public.times_brindes USING btree (time_id, brinde_id)` |


## Policies (RLS)

### `Enable read for all`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM times t   WHERE ((t.id = times_brindes.time_id) AND ((t.empresa_id IS NULL) OR pertence_a_empresa(t.empresa_id)))))` |
| WITH CHECK |  |

### `Times brindes admin delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_role(auth.uid(), 'admin'::app_role)` |
| WITH CHECK |  |

### `Times brindes admin update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_role(auth.uid(), 'admin'::app_role)` |
| WITH CHECK | `has_role(auth.uid(), 'admin'::app_role)` |

### `Times brindes admin write`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `has_role(auth.uid(), 'admin'::app_role)` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
