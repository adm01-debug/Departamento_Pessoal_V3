# public.departamentos

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
| 2 | `nome` | `text` | não |  |  |  |
| 3 | `empresa_id` | `uuid` | sim |  |  |  |
| 4 | `gestor_id` | `uuid` | sim |  |  |  |
| 5 | `ativo` | `boolean` | sim | `true` |  |  |
| 6 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 7 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `departamento_pai_id` | `uuid` | sim |  |  |  |
| 9 | `responsavel_id` | `uuid` | sim |  |  |  |
| 10 | `codigo_centro_custo` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| departamentos_departamento_pai_id_fkey | FOREIGN KEY | `FOREIGN KEY (departamento_pai_id) REFERENCES departamentos(id)` | NO ACTION | NO ACTION | sim |
| departamentos_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| departamentos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| departamentos_responsavel_id_fkey | FOREIGN KEY | `FOREIGN KEY (responsavel_id) REFERENCES colaboradores(id)` | NO ACTION | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.beneficio_regras_elegibilidade | beneficio_regras_elegibilidade_departamento_id_fkey | departamento_id | NO ACTION |
| public.cargos | cargos_departamento_id_fkey | departamento_id | NO ACTION |
| public.contrato_templates | contrato_templates_departamento_id_fkey | departamento_id | SET NULL |
| public.departamentos | departamentos_departamento_pai_id_fkey | departamento_pai_id | NO ACTION |
| public.times | times_departamento_id_fkey | departamento_id | NO ACTION |
| public.transferencias | transferencias_departamento_anterior_id_fkey | departamento_anterior_id | NO ACTION |
| public.transferencias | transferencias_departamento_novo_id_fkey | departamento_novo_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| departamentos_empresa_nome_key | btree | empresa_id, nome | sim | sim |  | `CREATE UNIQUE INDEX departamentos_empresa_nome_key ON public.departamentos USING btree (empresa_id, nome)` |
| departamentos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX departamentos_pkey ON public.departamentos USING btree (id)` |
| idx_departamentos_departamento_pai_id | btree | departamento_pai_id | não | sim |  | `CREATE INDEX idx_departamentos_departamento_pai_id ON public.departamentos USING btree (departamento_pai_id)` |
| idx_departamentos_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_departamentos_empresa_id ON public.departamentos USING btree (empresa_id)` |
| idx_departamentos_responsavel_id | btree | responsavel_id | não | sim |  | `CREATE INDEX idx_departamentos_responsavel_id ON public.departamentos USING btree (responsavel_id)` |


## Policies (RLS)

### `tenant_departamentos`

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
| audit_departamentos | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.log_audit_change |
| update_departamentos_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
