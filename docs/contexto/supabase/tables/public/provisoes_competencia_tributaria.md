# public.provisoes_competencia_tributaria

> Contrato tributario da competencia: aliquota de encargos (bps) e retrato do regime usados no calculo daquele mes. Sobrevive a substituicao com lote vazio, que apaga as linhas de provisoes_mensais. Escrita exclusiva de replace_monthly_provisions.

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
| 1 | `empresa_id` | `uuid` | não |  |  |  |
| 2 | `competencia` | `date` | não |  |  |  |
| 3 | `encargos_aliquota_bps` | `integer` | não |  |  |  |
| 4 | `regime_tributario` | `regime_tributario` | sim |  |  |  |
| 5 | `simples_anexo` | `text` | sim |  |  |  |
| 6 | `registrado_em` | `timestamp with time zone` | não | `now()` |  |  |
| 7 | `registrado_por` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| provisoes_competencia_tributaria_bps_faixa | CHECK | `CHECK (encargos_aliquota_bps >= 0 AND encargos_aliquota_bps <= 1000)` |  |  | sim |
| provisoes_competencia_tributaria_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| provisoes_competencia_tributaria_pkey | PRIMARY KEY | `PRIMARY KEY (empresa_id, competencia)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| provisoes_competencia_tributaria_pkey | btree | empresa_id, competencia | sim | sim |  | `CREATE UNIQUE INDEX provisoes_competencia_tributaria_pkey ON public.provisoes_competencia_tributaria USING btree (empresa_id, competencia)` |


## Policies (RLS)

### `provisoes_competencia_tributaria_tenant_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)) OR is_admin(auth.uid()))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| authenticated | SELECT |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
