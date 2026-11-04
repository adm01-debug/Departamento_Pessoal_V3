# public.planos_saude

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
| 2 | `empresa_id` | `uuid` | sim |  |  |  |
| 3 | `colaborador_id` | `uuid` | sim |  |  |  |
| 4 | `operadora` | `text` | sim |  |  |  |
| 5 | `tipo_plano` | `text` | sim | `'enfermaria'::text` |  |  |
| 6 | `numero_carteirinha` | `text` | sim |  |  |  |
| 7 | `valor_mensal` | `numeric` | sim | `0` |  |  |
| 8 | `percentual_empresa` | `numeric` | sim | `100` |  |  |
| 9 | `percentual_colaborador` | `numeric` | sim | `0` |  |  |
| 10 | `data_inicio` | `date` | sim |  |  |  |
| 11 | `data_fim` | `date` | sim |  |  |  |
| 12 | `ativo` | `boolean` | sim | `true` |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `ans_registro` | `text` | sim |  |  |  |
| 15 | `coparticipacao_teto` | `numeric(10,2)` | sim |  |  |  |
| 16 | `abrangencia` | `text` | sim | `'nacional'::text` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| planos_saude_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| planos_saude_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| planos_saude_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.beneficiarios_plano | beneficiarios_plano_plano_saude_id_fkey | plano_saude_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_planos_saude_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_planos_saude_colaborador_id ON public.planos_saude USING btree (colaborador_id)` |
| idx_planos_saude_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_planos_saude_empresa_id ON public.planos_saude USING btree (empresa_id)` |
| planos_saude_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX planos_saude_pkey ON public.planos_saude USING btree (id)` |


## Policies (RLS)

### `tenant_planos_saude`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_planos_saude_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
