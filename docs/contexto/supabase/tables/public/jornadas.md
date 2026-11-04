# public.jornadas

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
| 3 | `nome` | `text` | não |  |  |  |
| 4 | `tipo` | `text` | sim | `'padrao'::text` |  |  |
| 5 | `carga_horaria_semanal` | `integer` | sim | `44` |  |  |
| 6 | `horario_entrada` | `text` | sim |  |  |  |
| 7 | `horario_saida` | `text` | sim |  |  |  |
| 8 | `intervalo_minutos` | `integer` | sim | `60` |  |  |
| 9 | `ativa` | `boolean` | sim | `true` |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| jornadas_carga_plausivel | CHECK | `CHECK (carga_horaria_semanal IS NULL OR carga_horaria_semanal > 0 AND carga_horaria_semanal <= 80)` |  |  | sim |
| jornadas_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| jornadas_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.jornadas_horarios | jornadas_horarios_jornada_id_fkey | jornada_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_jornadas_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_jornadas_empresa_id ON public.jornadas USING btree (empresa_id)` |
| jornadas_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX jornadas_pkey ON public.jornadas USING btree (id)` |


## Policies (RLS)

### `tenant_jornadas`

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
| update_jornadas_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
