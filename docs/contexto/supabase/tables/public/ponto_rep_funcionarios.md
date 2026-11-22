# public.ponto_rep_funcionarios

> Cadastro de funcionários vindo do AtecSoft e vínculo com colaboradores.

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
| 2 | `dispositivo_id` | `uuid` | não |  |  |  |
| 3 | `empresa_id` | `uuid` | não |  |  |  |
| 4 | `codigo` | `integer` | não |  |  |  |
| 5 | `nome` | `text` | sim |  |  |  |
| 6 | `matricula` | `text` | sim |  |  |  |
| 7 | `cpf` | `text` | sim |  |  |  |
| 8 | `pis` | `text` | sim |  |  |  |
| 9 | `situacao` | `text` | sim |  |  |  |
| 10 | `empresa_codigo` | `integer` | sim |  |  |  |
| 11 | `horario_codigo` | `integer` | sim |  |  |  |
| 12 | `data_admissao` | `date` | sim |  |  |  |
| 13 | `data_desligamento` | `date` | sim |  |  |  |
| 14 | `colaborador_id` | `uuid` | sim |  |  |  |
| 15 | `vinculo_metodo` | `text` | sim |  |  |  |
| 16 | `vinculado_em` | `timestamp with time zone` | sim |  |  |  |
| 17 | `hash_conteudo` | `text` | sim |  |  |  |
| 18 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 19 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 20 | `cpf_last4` | `text` | sim |  |  | Últimos 4 dígitos do CPF, mantidos pelo gatilho fn_ponto_rep_funcionario_cpf_last4 — único CPF que authenticated pode ler. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ponto_rep_funcionarios_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| ponto_rep_funcionarios_dispositivo_codigo_key | UNIQUE | `UNIQUE (dispositivo_id, codigo)` |  |  | sim |
| ponto_rep_funcionarios_dispositivo_id_fkey | FOREIGN KEY | `FOREIGN KEY (dispositivo_id) REFERENCES ponto_rep_dispositivos(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| ponto_rep_funcionarios_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| ponto_rep_funcionarios_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| ponto_rep_funcionarios_vinculo_metodo_check | CHECK | `CHECK (vinculo_metodo IS NULL OR (vinculo_metodo = ANY (ARRAY['cpf'::text, 'pis'::text, 'matricula'::text, 'manual'::text])))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_ponto_rep_funcionarios_colaborador | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_ponto_rep_funcionarios_colaborador ON public.ponto_rep_funcionarios USING btree (colaborador_id)` |
| idx_ponto_rep_funcionarios_empresa | btree | empresa_id | não | sim |  | `CREATE INDEX idx_ponto_rep_funcionarios_empresa ON public.ponto_rep_funcionarios USING btree (empresa_id)` |
| ponto_rep_funcionarios_dispositivo_codigo_key | btree | dispositivo_id, codigo | sim | sim |  | `CREATE UNIQUE INDEX ponto_rep_funcionarios_dispositivo_codigo_key ON public.ponto_rep_funcionarios USING btree (dispositivo_id, codigo)` |
| ponto_rep_funcionarios_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ponto_rep_funcionarios_pkey ON public.ponto_rep_funcionarios USING btree (id)` |
| ux_ponto_rep_funcionarios_colaborador_por_empresa | btree | empresa_id, colaborador_id | sim | sim | `(colaborador_id IS NOT NULL)` | `CREATE UNIQUE INDEX ux_ponto_rep_funcionarios_colaborador_por_empresa ON public.ponto_rep_funcionarios USING btree (empresa_id, colaborador_id) WHERE (colaborador_id IS NOT NULL)` |


## Policies (RLS)

### `ponto_rep_funcionarios_select_rh`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(pertence_a_empresa(empresa_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role)))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_ponto_rep_funcionario_cpf_last4 | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_ponto_rep_funcionario_cpf_last4 |


## Grants

| role | privilégios |
|---|---|
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |


Grants por coluna:

| coluna | role | privilégios |
|---|---|---|
| codigo | authenticated | SELECT |
| colaborador_id | authenticated | SELECT |
| cpf_last4 | authenticated | SELECT |
| created_at | authenticated | SELECT |
| data_admissao | authenticated | SELECT |
| data_desligamento | authenticated | SELECT |
| dispositivo_id | authenticated | SELECT |
| empresa_codigo | authenticated | SELECT |
| empresa_id | authenticated | SELECT |
| hash_conteudo | authenticated | SELECT |
| horario_codigo | authenticated | SELECT |
| id | authenticated | SELECT |
| matricula | authenticated | SELECT |
| nome | authenticated | SELECT |
| situacao | authenticated | SELECT |
| updated_at | authenticated | SELECT |
| vinculado_em | authenticated | SELECT |
| vinculo_metodo | authenticated | SELECT |
