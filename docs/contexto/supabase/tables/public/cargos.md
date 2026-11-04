# public.cargos

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
| 3 | `departamento_id` | `uuid` | sim |  |  |  |
| 4 | `empresa_id` | `uuid` | sim |  |  |  |
| 5 | `cbo` | `text` | sim |  |  |  |
| 6 | `salario_base` | `numeric` | sim |  |  |  |
| 7 | `ativo` | `boolean` | sim | `true` |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `descricao` | `text` | sim |  |  |  |
| 11 | `requisitos` | `text` | sim |  |  |  |
| 12 | `nivel_hierarquico` | `integer` | sim | `1` |  |  |
| 13 | `version` | `integer` | sim | `1` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| cargos_departamento_id_fkey | FOREIGN KEY | `FOREIGN KEY (departamento_id) REFERENCES departamentos(id)` | NO ACTION | NO ACTION | sim |
| cargos_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| cargos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.beneficio_regras_elegibilidade | beneficio_regras_elegibilidade_cargo_id_fkey | cargo_id | NO ACTION |
| public.cargo_faixas_salariais | cargo_faixas_salariais_cargo_id_fkey | cargo_id | CASCADE |
| public.colaboradores | colaboradores_cargo_id_fkey | cargo_id | SET NULL |
| public.contrato_templates | contrato_templates_cargo_id_fkey | cargo_id | SET NULL |
| public.pcs_avaliacoes_cargo | pcs_avaliacoes_cargo_cargo_id_fkey | cargo_id | CASCADE |
| public.pcs_pesquisa_salarial | pcs_pesquisa_salarial_cargo_id_fkey | cargo_id | SET NULL |
| public.promocoes | promocoes_cargo_anterior_id_fkey | cargo_anterior_id | NO ACTION |
| public.promocoes | promocoes_cargo_novo_id_fkey | cargo_novo_id | NO ACTION |
| public.sst_ordens_servico | sst_ordens_servico_cargo_id_fkey | cargo_id | SET NULL |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| cargos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX cargos_pkey ON public.cargos USING btree (id)` |
| idx_cargos_departamento_id | btree | departamento_id | não | sim |  | `CREATE INDEX idx_cargos_departamento_id ON public.cargos USING btree (departamento_id)` |
| idx_cargos_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_cargos_empresa_id ON public.cargos USING btree (empresa_id)` |


## Policies (RLS)

### `tenant_cargos`

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
| audit_cargos | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.log_audit_change |
| tr_increment_version_cargos | BEFORE | UPDATE | ROW | enabled | public.increment_version |
| update_cargos_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
