# public.epis_fichas_itens

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
| 2 | `ficha_id` | `uuid` | não |  |  |  |
| 3 | `epi_id` | `uuid` | sim |  |  |  |
| 4 | `descricao` | `text` | não |  |  |  |
| 5 | `ca` | `text` | sim |  |  |  |
| 6 | `ca_validade` | `date` | sim |  |  |  |
| 7 | `quantidade` | `integer` | não | `1` |  |  |
| 8 | `data_entrega` | `date` | não | `CURRENT_DATE` |  |  |
| 9 | `data_devolucao` | `date` | sim |  |  |  |
| 10 | `status_item` | `text` | não | `'em_uso'::text` |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| epis_fichas_itens_epi_id_fkey | FOREIGN KEY | `FOREIGN KEY (epi_id) REFERENCES epis(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| epis_fichas_itens_ficha_id_fkey | FOREIGN KEY | `FOREIGN KEY (ficha_id) REFERENCES epis_fichas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| epis_fichas_itens_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| epis_fichas_itens_quantidade_check | CHECK | `CHECK (quantidade > 0)` |  |  | sim |
| epis_fichas_itens_status_item_check | CHECK | `CHECK (status_item = ANY (ARRAY['em_uso'::text, 'devolvido'::text, 'substituido'::text, 'descartado'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| epis_fichas_itens_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX epis_fichas_itens_pkey ON public.epis_fichas_itens USING btree (id)` |
| idx_epis_fichas_itens_epi_id | btree | epi_id | não | sim |  | `CREATE INDEX idx_epis_fichas_itens_epi_id ON public.epis_fichas_itens USING btree (epi_id)` |
| idx_epis_itens_ficha | btree | ficha_id | não | sim |  | `CREATE INDEX idx_epis_itens_ficha ON public.epis_fichas_itens USING btree (ficha_id)` |
| idx_epis_itens_status | btree | status_item | não | sim |  | `CREATE INDEX idx_epis_itens_status ON public.epis_fichas_itens USING btree (status_item)` |


## Policies (RLS)

### `Itens EPI seguem ficha`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM (epis_fichas f      JOIN user_empresas ue ON ((ue.empresa_id = f.empresa_id)))   WHERE ((f.id = epis_fichas_itens.ficha_id) AND (ue.user_id = auth.uid()))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM (epis_fichas f      JOIN user_empresas ue ON ((ue.empresa_id = f.empresa_id)))   WHERE ((f.id = epis_fichas_itens.ficha_id) AND (ue.user_id = auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role)))))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_epi_item_ca | BEFORE | INSERT OR UPDATE | ROW | enabled | public.validate_epi_item_ca |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
