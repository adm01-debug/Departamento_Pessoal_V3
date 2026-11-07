# Contexto e inventário gerados para agentes de IA

> Extraído do antigo `CLAUDE.md` em 07/11/2026. Scripts autônomos portados do Zapp Web V2 (04/11/2026).
> Nada aqui é escrito à mão: se divergir, regenere.

| Fonte | Onde ler | Quem gera | Frequência |
|---|---|---|---|
| Índice único (diz qual fonte é dona de cada fato) | `docs/contexto/00-INDEX.md` na branch **`contexto`** | `scripts/regras_negocio/indice.py` | a cada 10 min e a cada push em `main` (`contexto.yml`) |
| Código: rotas, menu, módulos, hooks, edges, grafo, testes, convenções | `docs/contexto/codigo/` (branch `contexto`) | `scripts/ai-context/gerar.mjs` | idem |
| Banco canônico ao vivo: tabelas, colunas, RLS, funções, triggers, grants, lints | `docs/contexto/supabase/` (branch `contexto`) | `scripts/supabase_snapshot/snapshot.py` (role `ci_auditor`) | a cada 10 min |
| Regras de negócio: RLS por operação, estados, validações, fórmulas, lacunas | `docs/contexto/regras/` (branch `contexto`) + regras humanas em `docs/contexto/regras/manual/` (**main**) | `scripts/regras_negocio/generate.py` | a cada push em `main` |
| Estado real versionado: banco (alertas, órfãs, cron), rotas × menu × telas, edges | `inventario/estado/*.json` (**main**) | `scripts/inventario/*.mjs` | semanal, PR automático com auto-merge (`inventario-estado-semanal.yml`) |

Ler sem trocar de branch: `git fetch origin contexto && git show origin/contexto:docs/contexto/00-INDEX.md`
(ou `raw.githubusercontent.com/adm01-debug/Departamento_Pessoal_V3/contexto/docs/contexto/00-INDEX.md`).

## Regras

- **Credencial:** os workflows usam o secret de repositório `SUPABASE_DB_URL_READONLY` (role `ci_auditor`,
  só catálogo, nenhuma linha de RH). Não enxerga ledger, histórico do cron, `auth`/`storage` nem `cron.job`
  (RLS do pg_cron) — essas seções saem como `errors.md` / `coleta_parcial`, nunca como "vazio".
- **Auto-correção:** os alertas (`inventario/estado/banco.json → alertas`, `rotas.json → problemas`,
  `codigo/INDEX.md` → tabelas/RPCs/edges citados no código e inexistentes) são a fila de correção dos agentes;
  o inventário se reescreve sozinho por PR; o CI reprova PR que muda rotas/menu sem regenerar
  `inventario/estado/rotas.json` (`npm run inventario:rotas`).
- **Nunca** abra PR da branch `contexto` nem edite `docs/contexto/` na `main` (só `regras/manual/`).
- Testes offline: `node --test scripts/tests/contexto-*.test.mjs scripts/tests/inventario-*.test.mjs`
  (rodam no job `security-config` do `ci.yml`).
- Como gerar cada arquivo de `inventario/estado/` e como ler `banco.json → alertas`
  (`tabela_sem_rls`, `rls_sem_policy`, `empresa_id_fora_das_policies`, `cron_*`, `edge_sem_deploy`,
  `coleta_parcial`): `inventario/estado/README.md`.
