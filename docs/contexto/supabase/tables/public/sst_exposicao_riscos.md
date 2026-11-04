# public.sst_exposicao_riscos

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
| 2 | `colaborador_id` | `uuid` | sim |  |  |  |
| 3 | `ambiente_id` | `uuid` | sim |  |  |  |
| 4 | `agente_nocivo_codigo` | `text` | sim |  |  |  |
| 5 | `intensidade_concentracao` | `text` | sim |  |  |  |
| 6 | `tecnica_utilizada` | `text` | sim |  |  |  |
| 7 | `epi_eficaz` | `boolean` | sim | `true` |  |  |
| 8 | `data_inicio_exposicao` | `date` | não |  |  |  |
| 9 | `data_fim_exposicao` | `date` | sim |  |  |  |
| 10 | `status_esocial` | `text` | sim | `'pendente'::text` |  |  |
| 11 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sst_exposicao_riscos_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| sst_exposicao_riscos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_sst_exposicao_riscos_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_sst_exposicao_riscos_colaborador_id ON public.sst_exposicao_riscos USING btree (colaborador_id)` |
| sst_exposicao_riscos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sst_exposicao_riscos_pkey ON public.sst_exposicao_riscos USING btree (id)` |


## Policies (RLS)

### `Gestores de RH podem ver Riscos`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM colaboradores c   WHERE ((c.id = sst_exposicao_riscos.colaborador_id) AND pertence_a_empresa(c.empresa_id))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trigger_auditoria_sst_riscos | AFTER | INSERT OR UPDATE | ROW | enabled | public.registrar_auditoria_sst |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
