# public.vagas

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
| 3 | `titulo` | `text` | não |  |  |  |
| 4 | `descricao` | `text` | sim |  |  |  |
| 5 | `departamento` | `text` | sim |  |  |  |
| 6 | `cargo` | `text` | sim |  |  |  |
| 7 | `tipo_contrato` | `text` | sim | `'clt'::text` |  |  |
| 8 | `modalidade` | `text` | sim | `'presencial'::text` |  |  |
| 9 | `faixa_salarial_min` | `numeric` | sim |  |  |  |
| 10 | `faixa_salarial_max` | `numeric` | sim |  |  |  |
| 11 | `quantidade` | `integer` | sim | `1` |  |  |
| 12 | `requisitos` | `text` | sim |  |  |  |
| 13 | `beneficios_oferecidos` | `text` | sim |  |  |  |
| 14 | `status` | `text` | sim | `'aberta'::text` |  |  |
| 15 | `data_abertura` | `date` | sim | `CURRENT_DATE` |  |  |
| 16 | `data_encerramento` | `date` | sim |  |  |  |
| 17 | `responsavel_id` | `uuid` | sim |  |  |  |
| 18 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 19 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_vagas_status | CHECK | `CHECK (status IS NULL OR (status = ANY (ARRAY['rascunho'::text, 'aberta'::text, 'pausada'::text, 'encerrada'::text, 'preenchida'::text, 'cancelada'::text, 'arquivada'::text])))` |  |  | sim |
| vagas_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| vagas_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.candidaturas | candidaturas_vaga_id_fkey | vaga_id | CASCADE |
| public.vaga_etapas | vaga_etapas_vaga_id_fkey | vaga_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_vagas_empresa | btree | empresa_id | não | sim |  | `CREATE INDEX idx_vagas_empresa ON public.vagas USING btree (empresa_id)` |
| vagas_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX vagas_pkey ON public.vagas USING btree (id)` |


## Policies (RLS)

### `Multi-tenant access`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((empresa_id = auth.uid()) OR (( SELECT c.empresa_id    FROM colaboradores c   WHERE (c.id = auth.uid())) = empresa_id))` |
| WITH CHECK |  |

### `Users can manage vagas of their empresa`

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
| audit_status_change | AFTER | UPDATE | ROW | enabled | public.trg_audit_status_change |
| set_vagas_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |
| tr_updated_at_vagas | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |
| vagas_status_transition | BEFORE | UPDATE | ROW | enabled | public.trg_vagas_status_transition |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
