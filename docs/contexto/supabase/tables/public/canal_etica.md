# public.canal_etica

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


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `protocolo` | `text` | não | `SUBSTRING((gen_random_uuid())::text FROM 1 FOR 8)` |  |  |
| 3 | `categoria` | `text` | não |  |  |  |
| 4 | `descricao` | `text` | não |  |  |  |
| 5 | `anonimo` | `boolean` | sim | `true` |  |  |
| 6 | `status` | `text` | sim | `'aberto'::text` |  |  |
| 7 | `prioridade` | `text` | sim | `'media'::text` |  |  |
| 8 | `resposta` | `text` | sim |  |  |  |
| 9 | `empresa_id` | `uuid` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| canal_etica_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| canal_etica_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| canal_etica_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX canal_etica_pkey ON public.canal_etica USING btree (id)` |
| idx_canal_etica_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_canal_etica_empresa_id ON public.canal_etica USING btree (empresa_id)` |


## Policies (RLS)

### `canal_etica_reportar`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `((empresa_id IS NULL) OR pertence_a_empresa(empresa_id))` |

### `canal_etica_rh_manage`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `pode_gerir_rh(empresa_id)` |
| WITH CHECK | `pode_gerir_rh(empresa_id)` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
