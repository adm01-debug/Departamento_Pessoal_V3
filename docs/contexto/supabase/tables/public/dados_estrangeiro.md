# public.dados_estrangeiro

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
| 3 | `pais_origem` | `text` | sim |  |  |  |
| 4 | `tipo_visto` | `text` | sim |  |  |  |
| 5 | `data_chegada` | `date` | sim |  |  |  |
| 6 | `data_naturalizacao` | `date` | sim |  |  |  |
| 7 | `casado_brasileiro` | `boolean` | sim | `false` |  |  |
| 8 | `filho_brasileiro` | `boolean` | sim | `false` |  |  |
| 9 | `tempo_residencia` | `text` | sim |  |  |  |
| 10 | `condicao_ingresso` | `text` | sim |  |  |  |
| 11 | `endereco_exterior` | `text` | sim |  |  |  |
| 12 | `reside_brasil` | `boolean` | sim | `true` |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `tipo_visto_id` | `integer` | sim |  |  |  |
| 16 | `condicao_ingresso_id` | `integer` | sim |  |  |  |
| 17 | `tempo_residencia_id` | `integer` | sim |  |  |  |
| 18 | `descricao_logradouro_id` | `integer` | sim |  |  |  |
| 19 | `pais_id` | `integer` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| dados_estrangeiro_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| dados_estrangeiro_colaborador_id_key | UNIQUE | `UNIQUE (colaborador_id)` |  |  | sim |
| dados_estrangeiro_condicao_ingresso_id_fkey | FOREIGN KEY | `FOREIGN KEY (condicao_ingresso_id) REFERENCES condicoes_ingresso(id)` | NO ACTION | NO ACTION | sim |
| dados_estrangeiro_descricao_logradouro_id_fkey | FOREIGN KEY | `FOREIGN KEY (descricao_logradouro_id) REFERENCES descricoes_logradouro(id)` | NO ACTION | NO ACTION | sim |
| dados_estrangeiro_pais_id_fkey | FOREIGN KEY | `FOREIGN KEY (pais_id) REFERENCES paises(id)` | NO ACTION | NO ACTION | sim |
| dados_estrangeiro_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| dados_estrangeiro_tempo_residencia_id_fkey | FOREIGN KEY | `FOREIGN KEY (tempo_residencia_id) REFERENCES tempos_residencia(id)` | NO ACTION | NO ACTION | sim |
| dados_estrangeiro_tipo_visto_id_fkey | FOREIGN KEY | `FOREIGN KEY (tipo_visto_id) REFERENCES tipos_visto(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| dados_estrangeiro_colaborador_id_key | btree | colaborador_id | sim | sim |  | `CREATE UNIQUE INDEX dados_estrangeiro_colaborador_id_key ON public.dados_estrangeiro USING btree (colaborador_id)` |
| dados_estrangeiro_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX dados_estrangeiro_pkey ON public.dados_estrangeiro USING btree (id)` |
| idx_dados_estrangeiro_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_dados_estrangeiro_colaborador_id ON public.dados_estrangeiro USING btree (colaborador_id)` |
| idx_dados_estrangeiro_condicao_ingresso_id | btree | condicao_ingresso_id | não | sim |  | `CREATE INDEX idx_dados_estrangeiro_condicao_ingresso_id ON public.dados_estrangeiro USING btree (condicao_ingresso_id)` |
| idx_dados_estrangeiro_descricao_logradouro_id | btree | descricao_logradouro_id | não | sim |  | `CREATE INDEX idx_dados_estrangeiro_descricao_logradouro_id ON public.dados_estrangeiro USING btree (descricao_logradouro_id)` |
| idx_dados_estrangeiro_pais_id | btree | pais_id | não | sim |  | `CREATE INDEX idx_dados_estrangeiro_pais_id ON public.dados_estrangeiro USING btree (pais_id)` |
| idx_dados_estrangeiro_tempo_residencia_id | btree | tempo_residencia_id | não | sim |  | `CREATE INDEX idx_dados_estrangeiro_tempo_residencia_id ON public.dados_estrangeiro USING btree (tempo_residencia_id)` |
| idx_dados_estrangeiro_tipo_visto_id | btree | tipo_visto_id | não | sim |  | `CREATE INDEX idx_dados_estrangeiro_tipo_visto_id ON public.dados_estrangeiro USING btree (tipo_visto_id)` |


## Policies (RLS)

### `tenant_dados_estrangeiro`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(colaborador_id IN ( SELECT colaboradores.id    FROM colaboradores   WHERE (colaboradores.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |
| WITH CHECK | `(colaborador_id IN ( SELECT colaboradores.id    FROM colaboradores   WHERE (colaboradores.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
