# public.beneficio_regras_elegibilidade

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
| 2 | `beneficio_id` | `uuid` | sim |  |  |  |
| 3 | `empresa_id` | `uuid` | sim |  |  |  |
| 4 | `cargo_id` | `uuid` | sim |  |  |  |
| 5 | `departamento_id` | `uuid` | sim |  |  |  |
| 6 | `tempo_casa_minimo` | `integer` | sim | `0` |  |  |
| 7 | `automatico` | `boolean` | sim | `false` |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `timezone('utc'::text, now())` |  |  |
| 9 | `updated_at` | `timestamp with time zone` | não | `timezone('utc'::text, now())` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| beneficio_regras_elegibilidade_beneficio_id_fkey | FOREIGN KEY | `FOREIGN KEY (beneficio_id) REFERENCES beneficios(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| beneficio_regras_elegibilidade_cargo_id_fkey | FOREIGN KEY | `FOREIGN KEY (cargo_id) REFERENCES cargos(id)` | NO ACTION | NO ACTION | sim |
| beneficio_regras_elegibilidade_departamento_id_fkey | FOREIGN KEY | `FOREIGN KEY (departamento_id) REFERENCES departamentos(id)` | NO ACTION | NO ACTION | sim |
| beneficio_regras_elegibilidade_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| beneficio_regras_elegibilidade_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| beneficio_regras_elegibilidade_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX beneficio_regras_elegibilidade_pkey ON public.beneficio_regras_elegibilidade USING btree (id)` |
| idx_beneficio_regras_elegibilidade_beneficio_id | btree | beneficio_id | não | sim |  | `CREATE INDEX idx_beneficio_regras_elegibilidade_beneficio_id ON public.beneficio_regras_elegibilidade USING btree (beneficio_id)` |
| idx_beneficio_regras_elegibilidade_cargo_id | btree | cargo_id | não | sim |  | `CREATE INDEX idx_beneficio_regras_elegibilidade_cargo_id ON public.beneficio_regras_elegibilidade USING btree (cargo_id)` |
| idx_beneficio_regras_elegibilidade_departamento_id | btree | departamento_id | não | sim |  | `CREATE INDEX idx_beneficio_regras_elegibilidade_departamento_id ON public.beneficio_regras_elegibilidade USING btree (departamento_id)` |
| idx_beneficio_regras_elegibilidade_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_beneficio_regras_elegibilidade_empresa_id ON public.beneficio_regras_elegibilidade USING btree (empresa_id)` |


## Policies (RLS)

### `Regras acessíveis por empresa`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((empresa_id IS NULL) OR pertence_a_empresa(empresa_id))` |
| WITH CHECK | `((empresa_id IS NULL) OR pertence_a_empresa(empresa_id))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_timestamp_beneficio_regras | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
