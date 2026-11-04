# public.cargo_faixas_salariais

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
| 2 | `cargo_id` | `uuid` | sim |  |  |  |
| 3 | `nivel` | `text` | não |  |  |  |
| 4 | `valor_minimo` | `numeric(12,2)` | não |  |  |  |
| 5 | `valor_maximo` | `numeric(12,2)` | não |  |  |  |
| 6 | `created_at` | `timestamp with time zone` | não | `timezone('utc'::text, now())` |  |  |
| 7 | `updated_at` | `timestamp with time zone` | não | `timezone('utc'::text, now())` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| cargo_faixas_salariais_cargo_id_fkey | FOREIGN KEY | `FOREIGN KEY (cargo_id) REFERENCES cargos(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| cargo_faixas_salariais_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| faixas_maximo_coerente | CHECK | `CHECK (valor_maximo IS NULL OR valor_maximo >= valor_minimo)` |  |  | sim |
| faixas_minimo_nao_negativo | CHECK | `CHECK (valor_minimo >= 0::numeric)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| cargo_faixas_salariais_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX cargo_faixas_salariais_pkey ON public.cargo_faixas_salariais USING btree (id)` |
| idx_cargo_faixas_salariais_cargo_id | btree | cargo_id | não | sim |  | `CREATE INDEX idx_cargo_faixas_salariais_cargo_id ON public.cargo_faixas_salariais USING btree (cargo_id)` |


## Policies (RLS)

### `Faixas acessíveis por empresa`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(EXISTS ( SELECT 1    FROM cargos cg   WHERE ((cg.id = cargo_faixas_salariais.cargo_id) AND ((cg.empresa_id IS NULL) OR pertence_a_empresa(cg.empresa_id)))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM cargos cg   WHERE ((cg.id = cargo_faixas_salariais.cargo_id) AND ((cg.empresa_id IS NULL) OR pertence_a_empresa(cg.empresa_id)))))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_timestamp_cargo_faixas | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
