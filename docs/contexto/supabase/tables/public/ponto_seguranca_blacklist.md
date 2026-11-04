# public.ponto_seguranca_blacklist

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
| 2 | `dispositivo_id` | `text` | não |  |  |  |
| 3 | `colaborador_id` | `uuid` | sim |  |  |  |
| 4 | `motivo` | `text` | sim |  |  |  |
| 5 | `bloqueado_em` | `timestamp with time zone` | sim | `now()` |  |  |
| 6 | `bloqueado_ate` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ponto_seguranca_blacklist_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id)` | NO ACTION | NO ACTION | sim |
| ponto_seguranca_blacklist_dispositivo_id_key | UNIQUE | `UNIQUE (dispositivo_id)` |  |  | sim |
| ponto_seguranca_blacklist_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_ponto_seguranca_blacklist_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_ponto_seguranca_blacklist_colaborador_id ON public.ponto_seguranca_blacklist USING btree (colaborador_id)` |
| ponto_seguranca_blacklist_dispositivo_id_key | btree | dispositivo_id | sim | sim |  | `CREATE UNIQUE INDEX ponto_seguranca_blacklist_dispositivo_id_key ON public.ponto_seguranca_blacklist USING btree (dispositivo_id)` |
| ponto_seguranca_blacklist_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ponto_seguranca_blacklist_pkey ON public.ponto_seguranca_blacklist USING btree (id)` |


## Policies (RLS)

### `Admins can manage blacklist`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM user_roles   WHERE ((user_roles.user_id = auth.uid()) AND ((user_roles.role)::text = 'admin'::text))))` |
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
