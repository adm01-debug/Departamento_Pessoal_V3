# public.dados_estagiario

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
| 2 | `colaborador_id` | `uuid` | não |  |  |  |
| 3 | `empresa_id` | `uuid` | sim |  |  |  |
| 4 | `data_inicio` | `text` | sim |  |  |  |
| 5 | `data_fim` | `text` | sim |  |  |  |
| 6 | `categoria_estagio` | `text` | sim |  |  |  |
| 7 | `obrigatorio` | `boolean` | sim | `false` |  |  |
| 8 | `area_atuacao` | `text` | sim |  |  |  |
| 9 | `instituicao_nome` | `text` | sim |  |  |  |
| 10 | `instituicao_cnpj` | `text` | sim |  |  |  |
| 11 | `instituicao_cep` | `text` | sim |  |  |  |
| 12 | `instituicao_endereco` | `text` | sim |  |  |  |
| 13 | `instituicao_numero` | `text` | sim |  |  |  |
| 14 | `instituicao_complemento` | `text` | sim |  |  |  |
| 15 | `instituicao_bairro` | `text` | sim |  |  |  |
| 16 | `instituicao_cidade` | `text` | sim |  |  |  |
| 17 | `instituicao_uf` | `text` | sim |  |  |  |
| 18 | `supervisor_id` | `uuid` | sim |  |  |  |
| 19 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 20 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 21 | `curso` | `text` | sim |  |  |  |
| 22 | `nivel` | `text` | sim |  |  |  |
| 23 | `supervisor_nome` | `text` | sim |  |  |  |
| 24 | `supervisor_cargo` | `text` | sim |  |  |  |
| 25 | `carga_horaria_semanal` | `integer` | sim |  |  |  |
| 26 | `valor_bolsa` | `numeric` | sim |  |  |  |
| 27 | `numero_apolice` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| dados_estagiario_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| dados_estagiario_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| dados_estagiario_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| dados_estagiario_supervisor_id_fkey | FOREIGN KEY | `FOREIGN KEY (supervisor_id) REFERENCES colaboradores(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| dados_estagiario_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX dados_estagiario_pkey ON public.dados_estagiario USING btree (id)` |
| idx_dados_estagiario_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_dados_estagiario_colaborador_id ON public.dados_estagiario USING btree (colaborador_id)` |
| idx_dados_estagiario_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_dados_estagiario_empresa_id ON public.dados_estagiario USING btree (empresa_id)` |
| idx_dados_estagiario_supervisor_id | btree | supervisor_id | não | sim |  | `CREATE INDEX idx_dados_estagiario_supervisor_id ON public.dados_estagiario USING btree (supervisor_id)` |


## Policies (RLS)

### `tenant_dados_estagiario`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
