# public.ponto_espelhos_papel

> Etapa 85: espelho de ponto devolvido assinado em papel, por colaborador e competência (1º dia do mês).

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `empresa_id` | `uuid` | não |  |  |  |
| 3 | `colaborador_id` | `uuid` | não |  |  |  |
| 4 | `competencia` | `date` | não |  |  |  |
| 5 | `devolvido_em` | `timestamp with time zone` | sim |  |  |  |
| 6 | `registrado_por` | `uuid` | sim |  |  |  |
| 7 | `observacao` | `text` | sim |  |  |  |
| 8 | `arquivo_path` | `text` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ponto_espelhos_papel_colaborador_competencia_key | UNIQUE | `UNIQUE (colaborador_id, competencia)` |  |  | sim |
| ponto_espelhos_papel_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| ponto_espelhos_papel_competencia_mes_check | CHECK | `CHECK (competencia = date_trunc('month'::text, competencia::timestamp with time zone)::date)` |  |  | sim |
| ponto_espelhos_papel_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| ponto_espelhos_papel_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_ponto_espelhos_papel_empresa_competencia | btree | empresa_id, competencia | não | sim |  | `CREATE INDEX idx_ponto_espelhos_papel_empresa_competencia ON public.ponto_espelhos_papel USING btree (empresa_id, competencia)` |
| ponto_espelhos_papel_colaborador_competencia_key | btree | colaborador_id, competencia | sim | sim |  | `CREATE UNIQUE INDEX ponto_espelhos_papel_colaborador_competencia_key ON public.ponto_espelhos_papel USING btree (colaborador_id, competencia)` |
| ponto_espelhos_papel_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ponto_espelhos_papel_pkey ON public.ponto_espelhos_papel USING btree (id)` |


## Policies (RLS)

### `ponto_espelhos_papel_delete_rh`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(pertence_a_empresa(empresa_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role)))` |
| WITH CHECK |  |

### `ponto_espelhos_papel_insert_rh`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(pertence_a_empresa(empresa_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role)))` |

### `ponto_espelhos_papel_select_rh`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(pertence_a_empresa(empresa_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role)))` |
| WITH CHECK |  |

### `ponto_espelhos_papel_update_rh`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(pertence_a_empresa(empresa_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role)))` |
| WITH CHECK | `(pertence_a_empresa(empresa_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role)))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_ponto_espelhos_papel_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |
| trg_ponto_espelhos_papel_validar | BEFORE | INSERT OR UPDATE | ROW | enabled | public.ponto_espelhos_papel_validar |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, SELECT, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
