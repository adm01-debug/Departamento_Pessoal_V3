# public.candidatos

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
| 2 | `empresa_id` | `uuid` | sim |  |  |  |
| 3 | `nome` | `text` | não |  |  |  |
| 4 | `email` | `text` | sim |  |  |  |
| 5 | `telefone` | `text` | sim |  |  |  |
| 6 | `cpf` | `text` | sim |  |  |  |
| 7 | `linkedin` | `text` | sim |  |  |  |
| 8 | `curriculo_url` | `text` | sim |  |  |  |
| 9 | `pretensao_salarial` | `numeric` | sim |  |  |  |
| 10 | `experiencia_anos` | `integer` | sim |  |  |  |
| 11 | `formacao` | `text` | sim |  |  |  |
| 12 | `observacoes` | `text` | sim |  |  |  |
| 13 | `origem` | `text` | sim | `'site'::text` |  |  |
| 14 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| candidatos_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| candidatos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| candidatos_valores_nao_negativos | CHECK | `CHECK ((pretensao_salarial IS NULL OR pretensao_salarial >= 0::numeric) AND (experiencia_anos IS NULL OR experiencia_anos >= 0))` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.candidaturas | candidaturas_candidato_id_fkey | candidato_id | CASCADE |
| public.curriculos_arquivos | curriculos_arquivos_candidato_id_fkey | candidato_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| candidatos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX candidatos_pkey ON public.candidatos USING btree (id)` |
| idx_candidatos_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_candidatos_empresa_id ON public.candidatos USING btree (empresa_id)` |


## Policies (RLS)

### `Multi-tenant access`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((empresa_id = auth.uid()) OR (( SELECT c.empresa_id    FROM colaboradores c   WHERE (c.id = auth.uid())) = empresa_id))` |
| WITH CHECK |  |

### `Users can manage candidatos of their empresa`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_candidatos_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |
| tr_updated_at_candidatos | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
