# public.verbas_rescisorias

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
| 2 | `desligamento_id` | `uuid` | não |  |  |  |
| 3 | `rubrica_id` | `uuid` | sim |  |  |  |
| 4 | `codigo` | `text` | sim |  |  |  |
| 5 | `descricao` | `text` | não |  |  |  |
| 6 | `tipo` | `text` | não |  |  |  |
| 7 | `valor` | `numeric(15,2)` | não |  |  |  |
| 8 | `incide_inss` | `boolean` | sim | `false` |  |  |
| 9 | `incide_irrf` | `boolean` | sim | `false` |  |  |
| 10 | `incide_fgts` | `boolean` | sim | `false` |  |  |
| 11 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| verbas_rescisorias_desligamento_id_fkey | FOREIGN KEY | `FOREIGN KEY (desligamento_id) REFERENCES desligamentos(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| verbas_rescisorias_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| verbas_rescisorias_rubrica_id_fkey | FOREIGN KEY | `FOREIGN KEY (rubrica_id) REFERENCES rubricas_folha(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_verbas_desligamento | btree | desligamento_id | não | sim |  | `CREATE INDEX idx_verbas_desligamento ON public.verbas_rescisorias USING btree (desligamento_id)` |
| idx_verbas_rescisorias_rubrica_id | btree | rubrica_id | não | sim |  | `CREATE INDEX idx_verbas_rescisorias_rubrica_id ON public.verbas_rescisorias USING btree (rubrica_id)` |
| verbas_rescisorias_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX verbas_rescisorias_pkey ON public.verbas_rescisorias USING btree (id)` |


## Policies (RLS)

### `Acesso verbas por empresa`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(EXISTS ( SELECT 1    FROM (desligamentos d      JOIN user_empresas ue ON ((d.empresa_id = ue.empresa_id)))   WHERE ((d.id = verbas_rescisorias.desligamento_id) AND (ue.user_id = auth.uid()))))` |
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
