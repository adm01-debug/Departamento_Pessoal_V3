# public.ponto_ajustes

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
| 2 | `colaborador_id` | `uuid` | não |  |  |  |
| 3 | `data_referencia` | `date` | não |  |  |  |
| 4 | `tipo_ajuste` | `text` | não |  |  |  |
| 5 | `hora_original` | `time without time zone` | sim |  |  |  |
| 6 | `hora_sugerida` | `time without time zone` | sim |  |  |  |
| 7 | `justificativa` | `text` | não |  |  |  |
| 8 | `anexo_url` | `text` | sim |  |  |  |
| 9 | `status` | `text` | sim | `'PENDENTE'::text` |  |  |
| 10 | `gestor_id` | `uuid` | sim |  |  |  |
| 11 | `data_decisao` | `timestamp with time zone` | sim |  |  |  |
| 12 | `observacoes_gestor` | `text` | sim |  |  |  |
| 13 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 14 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 15 | `sla_vencimento` | `timestamp with time zone` | sim |  |  |  |
| 16 | `nivel_aprovacao_atual` | `integer` | sim | `1` |  |  |
| 17 | `historico_aprovacao` | `jsonb` | sim | `'[]'::jsonb` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ponto_ajustes_gestor_id_fkey | FOREIGN KEY | `FOREIGN KEY (gestor_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| ponto_ajustes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_ponto_ajustes_gestor_id | btree | gestor_id | não | sim |  | `CREATE INDEX idx_ponto_ajustes_gestor_id ON public.ponto_ajustes USING btree (gestor_id)` |
| ponto_ajustes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ponto_ajustes_pkey ON public.ponto_ajustes USING btree (id)` |


## Policies (RLS)

### `Colaboradores podem solicitar ajustes`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(auth.uid() IN ( SELECT profiles.user_id    FROM profiles   WHERE (profiles.id = ponto_ajustes.colaborador_id)))` |

### `Colaboradores podem ver seus próprios ajustes`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(auth.uid() IN ( SELECT profiles.user_id    FROM profiles   WHERE (profiles.id = ponto_ajustes.colaborador_id)))` |
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
