# public.ia_provisoes_alertas

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
| 2 | `empresa_id` | `uuid` | sim |  |  |  |
| 3 | `tipo_alerta` | `text` | sim |  |  |  |
| 4 | `descricao` | `text` | sim |  |  |  |
| 5 | `impacto_financeiro_estimado` | `numeric` | sim |  |  |  |
| 6 | `sugestao_acao` | `text` | sim |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ia_provisoes_alertas_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| ia_provisoes_alertas_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| ia_provisoes_alertas_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ia_provisoes_alertas_pkey ON public.ia_provisoes_alertas USING btree (id)` |
| idx_ia_provisoes_alertas_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_ia_provisoes_alertas_empresa_id ON public.ia_provisoes_alertas USING btree (empresa_id)` |


## Policies (RLS)

### `Gestores podem ver alertas de IA`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((empresa_id IS NULL) OR pertence_a_empresa(empresa_id))` |
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
