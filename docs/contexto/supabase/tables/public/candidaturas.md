# public.candidaturas

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
| 2 | `vaga_id` | `uuid` | não |  |  |  |
| 3 | `candidato_id` | `uuid` | não |  |  |  |
| 4 | `etapa` | `text` | sim | `'triagem'::text` |  |  |
| 5 | `nota_geral` | `numeric` | sim |  |  |  |
| 6 | `feedback` | `text` | sim |  |  |  |
| 7 | `data_entrevista` | `timestamp with time zone` | sim |  |  |  |
| 8 | `entrevistador` | `text` | sim |  |  |  |
| 9 | `status` | `text` | sim | `'em_andamento'::text` |  |  |
| 10 | `motivo_rejeicao` | `text` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `feedback_ia` | `text` | sim |  |  |  |
| 14 | `historico_etapas` | `jsonb` | sim | `'[]'::jsonb` |  |  |
| 15 | `data_proxima_etapa` | `timestamp with time zone` | sim |  |  |  |
| 16 | `empresa_id` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| candidaturas_candidato_id_fkey | FOREIGN KEY | `FOREIGN KEY (candidato_id) REFERENCES candidatos(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| candidaturas_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| candidaturas_nota_faixa | CHECK | `CHECK (nota_geral IS NULL OR nota_geral >= 0::numeric AND nota_geral <= 10::numeric)` |  |  | sim |
| candidaturas_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| candidaturas_vaga_id_candidato_id_key | UNIQUE | `UNIQUE (vaga_id, candidato_id)` |  |  | sim |
| candidaturas_vaga_id_fkey | FOREIGN KEY | `FOREIGN KEY (vaga_id) REFERENCES vagas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.recrutamento_agendamentos | recrutamento_agendamentos_candidatura_id_fkey | candidatura_id | CASCADE |
| public.recrutamento_anotacoes | recrutamento_anotacoes_candidatura_id_fkey | candidatura_id | CASCADE |
| public.recrutamento_entrevistas | recrutamento_entrevistas_candidatura_id_fkey | candidatura_id | CASCADE |
| public.recrutamento_testes | recrutamento_testes_candidatura_id_fkey | candidatura_id | CASCADE |
| public.triagem_notas | triagem_notas_candidatura_id_fkey | candidatura_id | CASCADE |
| public.vaga_entrevistas | vaga_entrevistas_candidatura_id_fkey | candidatura_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| candidaturas_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX candidaturas_pkey ON public.candidaturas USING btree (id)` |
| candidaturas_vaga_id_candidato_id_key | btree | vaga_id, candidato_id | sim | sim |  | `CREATE UNIQUE INDEX candidaturas_vaga_id_candidato_id_key ON public.candidaturas USING btree (vaga_id, candidato_id)` |
| idx_candidaturas_candidato_id | btree | candidato_id | não | sim |  | `CREATE INDEX idx_candidaturas_candidato_id ON public.candidaturas USING btree (candidato_id)` |
| idx_candidaturas_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_candidaturas_empresa_id ON public.candidaturas USING btree (empresa_id)` |
| idx_candidaturas_vaga | btree | vaga_id | não | sim |  | `CREATE INDEX idx_candidaturas_vaga ON public.candidaturas USING btree (vaga_id)` |


## Policies (RLS)

### `Multi-tenant access`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((empresa_id = auth.uid()) OR (( SELECT c.empresa_id    FROM colaboradores c   WHERE (c.id = auth.uid())) = empresa_id))` |
| WITH CHECK |  |

### `Users can manage candidaturas via vaga empresa`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(vaga_id IN ( SELECT vagas.id    FROM vagas   WHERE (vagas.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_candidaturas_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |
| tr_update_candidatura_history | BEFORE | UPDATE | ROW | enabled | public.fn_update_candidatura_history |
| tr_updated_at_candidaturas | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
