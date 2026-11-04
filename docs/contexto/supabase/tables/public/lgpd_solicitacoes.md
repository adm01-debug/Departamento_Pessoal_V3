# public.lgpd_solicitacoes

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
| 2 | `colaborador_id` | `uuid` | sim |  |  |  |
| 3 | `tipo` | `text` | não |  |  |  |
| 4 | `status` | `text` | sim | `'pendente'::text` |  |  |
| 5 | `descricao` | `text` | sim |  |  |  |
| 6 | `resposta` | `text` | sim |  |  |  |
| 7 | `prazo_legal` | `date` | sim |  |  |  |
| 8 | `concluida_em` | `timestamp with time zone` | sim |  |  |  |
| 9 | `responsavel_id` | `uuid` | sim |  |  |  |
| 10 | `empresa_id` | `uuid` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| lgpd_solicitacoes_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id)` | NO ACTION | NO ACTION | sim |
| lgpd_solicitacoes_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| lgpd_solicitacoes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_lgpd_solicitacoes_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_lgpd_solicitacoes_colaborador_id ON public.lgpd_solicitacoes USING btree (colaborador_id)` |
| idx_lgpd_solicitacoes_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_lgpd_solicitacoes_empresa_id ON public.lgpd_solicitacoes USING btree (empresa_id)` |
| lgpd_solicitacoes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX lgpd_solicitacoes_pkey ON public.lgpd_solicitacoes USING btree (id)` |


## Policies (RLS)

### `lgpd_solicitacoes_rh_manage`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `pode_gerir_rh(empresa_id)` |
| WITH CHECK | `pode_gerir_rh(empresa_id)` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
