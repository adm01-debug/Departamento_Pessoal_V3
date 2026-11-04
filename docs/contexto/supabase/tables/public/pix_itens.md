# public.pix_itens

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
| 2 | `lote_id` | `uuid` | não |  |  |  |
| 3 | `colaborador_id` | `uuid` | sim |  |  |  |
| 4 | `chave_pix` | `text` | não |  |  |  |
| 5 | `tipo_chave` | `text` | não |  |  |  |
| 6 | `valor` | `numeric(18,2)` | não |  |  |  |
| 7 | `descricao` | `text` | sim |  |  |  |
| 8 | `status` | `text` | sim | `'pendente'::text` |  |  |
| 9 | `end_to_end_id` | `text` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 11 | `chave_pix_encrypted` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| pix_itens_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| pix_itens_lote_id_fkey | FOREIGN KEY | `FOREIGN KEY (lote_id) REFERENCES pix_lotes(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| pix_itens_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_pix_itens_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_pix_itens_colaborador_id ON public.pix_itens USING btree (colaborador_id)` |
| idx_pix_itens_lote_id | btree | lote_id | não | sim |  | `CREATE INDEX idx_pix_itens_lote_id ON public.pix_itens USING btree (lote_id)` |
| pix_itens_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX pix_itens_pkey ON public.pix_itens USING btree (id)` |


## Policies (RLS)

### `pix_itens_rh_manage`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM pix_lotes l   WHERE ((l.id = pix_itens.lote_id) AND pode_gerir_rh(l.empresa_id))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM pix_lotes l   WHERE ((l.id = pix_itens.lote_id) AND pode_gerir_rh(l.empresa_id))))` |

### `pix_itens_tenant_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM pix_lotes l   WHERE ((l.id = pix_itens.lote_id) AND pode_gerir_rh(l.empresa_id))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_pix_itens_encrypt | BEFORE | INSERT OR UPDATE | ROW | enabled | public.encrypt_pix_itens_fields |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
