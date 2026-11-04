# public.clinicas_partners_servicos

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
| 2 | `clinica_id` | `uuid` | não |  |  |  |
| 3 | `tipo_exame` | `text` | não |  |  |  |
| 4 | `preco` | `numeric(10,2)` | sim |  |  |  |
| 5 | `prazo_resultado_dias` | `integer` | sim |  |  |  |
| 6 | `ativo` | `boolean` | não | `true` |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| clinicas_partners_servicos_clinica_id_fkey | FOREIGN KEY | `FOREIGN KEY (clinica_id) REFERENCES clinicas_partners(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| clinicas_partners_servicos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| clinicas_servicos_unique | UNIQUE | `UNIQUE (clinica_id, tipo_exame)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| clinicas_partners_servicos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX clinicas_partners_servicos_pkey ON public.clinicas_partners_servicos USING btree (id)` |
| clinicas_servicos_unique | btree | clinica_id, tipo_exame | sim | sim |  | `CREATE UNIQUE INDEX clinicas_servicos_unique ON public.clinicas_partners_servicos USING btree (clinica_id, tipo_exame)` |
| idx_clinicas_servicos_clinica | btree | clinica_id, ativo | não | sim |  | `CREATE INDEX idx_clinicas_servicos_clinica ON public.clinicas_partners_servicos USING btree (clinica_id, ativo)` |


## Policies (RLS)

### `clinicas_servicos_via_clinica`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM (clinicas_partners c      JOIN user_empresas ue ON ((ue.empresa_id = c.empresa_id)))   WHERE ((c.id = clinicas_partners_servicos.clinica_id) AND (ue.user_id = auth.uid()))))` |
| WITH CHECK | `((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role)) AND (EXISTS ( SELECT 1    FROM (clinicas_partners c      JOIN user_empresas ue ON ((ue.empresa_id = c.empresa_id)))   WHERE ((c.id = clinicas_partners_servicos.clinica_id) AND (ue.user_id = auth.uid())))))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_clinicas_servicos_upd | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
