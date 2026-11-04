# public.clinicas_partners_horarios

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
| 3 | `dia_semana` | `smallint` | não |  |  |  |
| 4 | `hora_abertura` | `time without time zone` | não |  |  |  |
| 5 | `hora_fechamento` | `time without time zone` | não |  |  |  |
| 6 | `intervalo_slot_min` | `integer` | não | `30` |  |  |
| 7 | `capacidade_por_slot` | `integer` | não | `1` |  |  |
| 8 | `ativo` | `boolean` | não | `true` |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| clinicas_horarios_intervalo_valido | CHECK | `CHECK (hora_fechamento > hora_abertura)` |  |  | sim |
| clinicas_horarios_unique | UNIQUE | `UNIQUE (clinica_id, dia_semana, hora_abertura)` |  |  | sim |
| clinicas_partners_horarios_capacidade_por_slot_check | CHECK | `CHECK (capacidade_por_slot > 0)` |  |  | sim |
| clinicas_partners_horarios_clinica_id_fkey | FOREIGN KEY | `FOREIGN KEY (clinica_id) REFERENCES clinicas_partners(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| clinicas_partners_horarios_dia_semana_check | CHECK | `CHECK (dia_semana >= 0 AND dia_semana <= 6)` |  |  | sim |
| clinicas_partners_horarios_intervalo_slot_min_check | CHECK | `CHECK (intervalo_slot_min > 0)` |  |  | sim |
| clinicas_partners_horarios_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| clinicas_horarios_unique | btree | clinica_id, dia_semana, hora_abertura | sim | sim |  | `CREATE UNIQUE INDEX clinicas_horarios_unique ON public.clinicas_partners_horarios USING btree (clinica_id, dia_semana, hora_abertura)` |
| clinicas_partners_horarios_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX clinicas_partners_horarios_pkey ON public.clinicas_partners_horarios USING btree (id)` |
| idx_clinicas_horarios_clinica_dia | btree | clinica_id, dia_semana | não | sim |  | `CREATE INDEX idx_clinicas_horarios_clinica_dia ON public.clinicas_partners_horarios USING btree (clinica_id, dia_semana)` |


## Policies (RLS)

### `clinicas_horarios_via_clinica`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM (clinicas_partners c      JOIN user_empresas ue ON ((ue.empresa_id = c.empresa_id)))   WHERE ((c.id = clinicas_partners_horarios.clinica_id) AND (ue.user_id = auth.uid()))))` |
| WITH CHECK | `((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role)) AND (EXISTS ( SELECT 1    FROM (clinicas_partners c      JOIN user_empresas ue ON ((ue.empresa_id = c.empresa_id)))   WHERE ((c.id = clinicas_partners_horarios.clinica_id) AND (ue.user_id = auth.uid())))))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_clinicas_horarios_upd | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
