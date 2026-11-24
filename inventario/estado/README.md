# Estado real do projeto — inventário gerado

Pasta de **dados gerados por script**, não de relatórios escritos à mão. É a fonte de consulta dos
agentes para "o que existe hoje" no banco e no código. Se um número aqui divergir do que você mediu,
regere o arquivo (comandos abaixo) em vez de corrigir à mão. Mesmo padrão do Zapp Web V2
(`scripts/inventario/`), adaptado ao DP V3.

| Arquivo | Como gerar | O que tem |
|---|---|---|
| `banco.json` | `DATABASE_URL=<SUPABASE_DB_URL_READONLY> node scripts/inventario/gerar-banco.mjs` (precisa de `psql`) **ou**, sem credencial, rodar cada seção de `scripts/inventario/banco.sql` no MCP do banco canônico, juntar `{ "<seção>": <valor de j> }` num arquivo e `node scripts/inventario/gerar-banco.mjs --entrada <arquivo>` | banco canônico (`frjbfeamybqsejlvmqbl`), só leitura: cada tabela (RLS, policies, se tem `empresa_id` e se alguma policy cita `empresa_id`, soft delete, triggers, linhas, tamanho, se é citada em função/view e quantos `.from()`/`/rest/v1/<tabela>` tem em `src/` e `supabase/functions/`), tabelas órfãs, cron jobs, execuções do cron (quando o papel enxerga), ledger de migrations (idem), edge functions do repo (publicadas só com `SUPABASE_ACCESS_TOKEN`), `coleta.secoes_indisponiveis` e a lista `alertas` |
| `rotas.json` | `node scripts/inventario/gerar-rotas.mjs` (`--check` só confere se está em dia) | as URLs de `src/App.tsx` com caminho completo (rotas aninhadas), `ProtectedRoute`/`AdminRoute` herdados, o menu lateral de `src/components/layout/AppSidebar.tsx`, e por tela os hooks, tabelas, RPCs, buckets e edge functions alcançados pelos imports; mais `problemas` (menu sem rota, menu visível para todos apontando rota de admin, URL sem arquivo, import quebrado) e `rotas_sem_item_de_menu` |
| `edges.json` | `node scripts/inventario/gerar-repo.mjs < /dev/null` | as edge functions: linhas, segredos lidos (`Deno.env.get`) e quem invoca cada uma (src, migrations, outras edges, e2e, CI) |
| `tabelas-uso.json` (não versionado) | `node scripts/inventario/gerar-repo.mjs < lista-de-tabelas.txt` | quantos `.from('tabela')` cada tabela tem — também sai em `banco.json` → `tabelas[].uso_no_codigo` |

## Como ler `banco.json`

- **`alertas`** é o que um agente precisa saber antes de mexer: `tabela_sem_rls`, `rls_sem_policy`,
  `empresa_id_fora_das_policies` (tabela multi-empresa cujas policies não citam `empresa_id` — candidata
  a vazamento entre empresas; confirme no corpo da policy, o isolamento pode vir de função/join),
  `cron_invisivel_para_o_papel`, `cron_falhando` (taxa ≥ 5 % em 7 dias), `cron_sem_execucao`,
  `cron_parado`, `historico_cron_sem_limpeza`, `edge_sem_deploy`, `edge_publicada_sem_codigo` e
  `coleta_parcial` (seções que o papel não conseguiu ler). Os limiares estão em `LIMIARES` no script.
- **Credencial do CI:** o secret de repositório `SUPABASE_DB_URL_READONLY` (role `ci_auditor`, só
  catálogo — nenhuma linha de dado de RH). Por isso:
  - `linhas` é a **estimativa do planner** (`reltuples`, `linhas_exatas: false`); com um papel que lê a
    tabela e abaixo de 200 mil linhas, sai `count(*)` exato (`linhas_exatas: true`);
  - `cron_execucoes` e `ledger` ficam `null` (sem `SELECT` em `cron.job_run_details` e
    `supabase_migrations.schema_migrations`) e aparecem em `coleta.secoes_indisponiveis`;
  - `cron_jobs.visivel: false` quando o RLS do pg_cron (`username = current_user`) esconde os jobs do
    papel — a lista vazia, nesse caso, **não** significa "nenhum job". A lista declarada nas migrations
    está em `docs/contexto/codigo/banco.json` da branch `contexto`.
  O `SUPABASE_DB_URL`/`SUPABASE_ACCESS_TOKEN` do environment `Production` têm revisor obrigatório:
  um job semanal autônomo não pode depender deles.
- **`tabelas_orfas`**: 0 linhas + não citada em função/view do banco + nenhum `.from()` nem `/rest/v1/`
  no código (`.from(variavel)` não é resolvido). Candidata a limpeza, não prova de que pode apagar.
- A resposta só é gravada se ≥ 90 % das tabelas de `src/integrations/supabase/types.ts` estiverem nela
  e, quando o ledger é visível, se ele bater com `supabase/migrations/` (maior versão entre as 20 mais
  recentes do repo e contagem a até 10 %). A URL precisa ser do projeto canônico (direta
  `db.<ref>.supabase.co` ou pooler com usuário `<papel>.<ref>`). Barra resposta colada de outro banco.
- O PR semanal (`inventario-estado-semanal.yml`) só abre quando algo estrutural mudou: tabela
  nova/apagada, alerta novo, RLS/policy, tela/rota/menu, edge etc. `medido_em`/`gerado_em`, a telemetria
  do cron (`execucoes_*`, `falhas_*`, `taxa_falha_7d_pct`, `horas_paradas_7d`…) e as estimativas
  `linhas`/`bytes`/`tamanho_bytes` sozinhas **não** abrem PR (oscilam a cada `ANALYZE`). Confie nesses
  números só depois de regenerar.
- Nada de segredo sai do banco: de `cron.job` só o nome das funções chamadas (nunca o comando). O teste
  `scripts/tests/inventario-banco.test.mjs` barra escrita no SQL, e o script se recusa a gravar saída com
  cara de credencial (Bearer, JWT, `sb_secret_`, DSN com senha).

## Como ler `rotas.json`

- `urls[]`: `caminho` completo, `componente`, `arquivo`, `layout` (rota com filhas, ex.: `/` →
  `MainLayout`), `protegida`, `admin` e `redireciona`.
- `telas[]`: uma por arquivo de página, com as URLs que a abrem, o item de menu e o que ela alcança.
- `problemas[]`: `menu_aponta_rota_admin` é fato do código (o `AppSidebar` não filtra por papel e a
  rota está sob `AdminRoute`), não suposição de UX.
- O CI (`scripts/tests/inventario-rotas.test.mjs`, job `security-config`) reprova PR que muda rotas,
  menu ou telas sem regenerar `rotas.json` (só a parte estrutural; hooks/tabelas de cada tela seguem
  o inventário semanal).
