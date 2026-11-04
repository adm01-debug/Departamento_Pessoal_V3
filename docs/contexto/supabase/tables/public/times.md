# public.times

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 5 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `nome` | `text` | não |  |  |  |
| 3 | `descricao` | `text` | sim |  |  |  |
| 4 | `departamento_id` | `uuid` | sim |  |  |  |
| 5 | `empresa_id` | `uuid` | sim |  |  |  |
| 6 | `lider_id` | `uuid` | sim |  |  |  |
| 7 | `ativo` | `boolean` | sim | `true` |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| times_departamento_id_fkey | FOREIGN KEY | `FOREIGN KEY (departamento_id) REFERENCES departamentos(id)` | NO ACTION | NO ACTION | sim |
| times_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| times_lider_id_fkey | FOREIGN KEY | `FOREIGN KEY (lider_id) REFERENCES colaboradores(id)` | NO ACTION | NO ACTION | sim |
| times_nome_empresa_key | UNIQUE | `UNIQUE (nome, empresa_id)` |  |  | sim |
| times_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.times_brindes | times_brindes_time_id_fkey | time_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_times_departamento_id | btree | departamento_id | não | sim |  | `CREATE INDEX idx_times_departamento_id ON public.times USING btree (departamento_id)` |
| idx_times_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_times_empresa_id ON public.times USING btree (empresa_id)` |
| idx_times_lider_id | btree | lider_id | não | sim |  | `CREATE INDEX idx_times_lider_id ON public.times USING btree (lider_id)` |
| times_nome_empresa_key | btree | nome, empresa_id | sim | sim |  | `CREATE UNIQUE INDEX times_nome_empresa_key ON public.times USING btree (nome, empresa_id)` |
| times_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX times_pkey ON public.times USING btree (id)` |


## Policies (RLS)

### `Enable read access for all users`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((empresa_id IS NULL) OR pertence_a_empresa(empresa_id))` |
| WITH CHECK |  |

### `Times delete scoped`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK |  |

### `Times insert scoped`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |

### `Times update scoped`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |

### `tenant_times`

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
| update_times_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
