# public.beneficio_utilizacao

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
| 2 | `beneficio_colaborador_id` | `uuid` | sim |  |  |  |
| 3 | `data_uso` | `timestamp with time zone` | sim | `now()` |  |  |
| 4 | `valor_total` | `numeric` | não |  |  |  |
| 5 | `valor_desconto_folha` | `numeric` | sim |  |  |  |
| 6 | `estabelecimento` | `text` | sim |  |  |  |
| 7 | `protocolo_autorizacao` | `text` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| beneficio_utilizacao_beneficio_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (beneficio_colaborador_id) REFERENCES beneficios_colaborador(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| beneficio_utilizacao_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| beneficio_utilizacao_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX beneficio_utilizacao_pkey ON public.beneficio_utilizacao USING btree (id)` |
| idx_beneficio_utilizacao_beneficio_colaborador_id | btree | beneficio_colaborador_id | não | sim |  | `CREATE INDEX idx_beneficio_utilizacao_beneficio_colaborador_id ON public.beneficio_utilizacao USING btree (beneficio_colaborador_id)` |


## Policies (RLS)

### `Colaboradores podem ver seu próprio extrato de benefícios`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(EXISTS ( SELECT 1    FROM (beneficios_colaborador bc      JOIN colaboradores c ON ((bc.colaborador_id = c.id)))   WHERE ((bc.id = beneficio_utilizacao.beneficio_colaborador_id) AND (auth.uid() = c.id))))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
