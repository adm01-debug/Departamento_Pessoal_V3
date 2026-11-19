# Varredura de branches, PRs e ledger — 19/11/2026

Registro da verificação pedida pelo dono: _nenhum trabalho de outro agente, em
nenhuma branch, pode ser perdido; só se exclui o que já está na `main` ou é
realmente obsoleto, com certeza byte a byte_.

Tudo abaixo foi medido nesta sessão, não herdado de relatório anterior. Comandos
reais, para quem quiser repetir.

## 1. Branches remotas — nenhuma com trabalho pendente

```sh
for b in $(git for-each-ref --format='%(refname:short)' refs/remotes/origin \
            | grep -vE 'origin/(HEAD|main)'); do
  echo "$(git rev-list --count origin/main..$b)  $b"
done | sort -rn
```

| commits fora da `main` | branch                                                       | veredito                                                                                                                                                                                                                      |
| ---------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 388                    | `origin/contexto`                                            | **órfã, sem merge-base com a `main`.** 856 arquivos, só `docs/`, `inventario/`, `README.md` e `vercel.json` — é a branch gerada de contexto. `AGENTS.md` §8 proíbe fechá-la e proíbe abrir PR dela. Nenhum código de produto. |
| 2                      | `origin/claude/infra-lote-canonico-3-migrations-261119-0020` | PR #712, desta sessão                                                                                                                                                                                                         |
| 2                      | `origin/claude/fix-consignado-margem-trigger-261119-0010`    | PR #711, desta sessão                                                                                                                                                                                                         |
| 0                      | `origin/computador_local`                                    | zero commits fora da `main`; `git merge-base --is-ancestor origin/computador_local origin/main` = verdadeiro. Não fechar (regra do dono).                                                                                     |

**Não existe mais nenhuma branch de outro agente com trabalho fora da `main`.**

## 2. As 20 tags `arquivo/*` — o que foi fechado e por quê

Cada tag anotada carrega a justificativa no próprio objeto
(`git tag -l --format='%(contents)' <tag>`). Classificação:

- **Tudo já na `main`, conferido arquivo por arquivo:** `codex-e50-preflight`
  (41 arquivos; 11 byte-idênticos, 30 "divergentes" eram atraso, não trabalho
  novo), `canoniza-8-migrations-ledger` (**md5 idêntico** normalizando
  comentário, espaço e `;`), `copilot-generators` (efeitos em `e11272ee0`,
  PR #418), `e51-026-lote2`, `rotinas-agendadas`, `happy-cori-claude-md`,
  `feriado-20-11-ferias` (asserções resgatadas pela PR #572),
  `e2e-bypass-mfa-pr358`, `e2e-cleanup-logout-pr361`, `check-dependencies-pr370`,
  `computador_local`.
- **Obsoleta, com o motivo escrito:** `patch-1-workflow-vazio` (workflow de uma
  linha em branco), `dependabot-setup-cli` (a `main` já usa versão ≥),
  `obsoletas-3-branches` (workflow temporário + reformatação sem mudança de
  comportamento).
- **Resíduo resgatado antes de arquivar:** `build-rebaseline-cors-pr391` →
  PR #706; `prod-readiness-557` → PR #584; `shell-ops-pr372` (resíduo sem efeito
  prático, registrado em `REAUDITORIA_DESCARTES_2026-11-18.md`).
- **Preservada de propósito, decisão do dono:** `muri` (3 migrations resgatadas
  pela PR #582, 18/18 asserções e 9/9 funções com `md5(prosrc)` idêntico à
  produção; ficaram só na tag a esteira `training-image-*` parada
  — `autoqueue_enabled = false` —, 1 backfill de 27 linhas, 4 migrations onde a
  `main` seguiu outro caminho e ~120 componentes de protótipo com mock),
  `muri-avaliacao-ninebox-w1` (área já na `main` pela PR #569),
  `edge-metabase-embed-2026-10-31` (fonte de 5 arquivos / 13.741 bytes, removida
  do repo em `7db8ba84a` mas ainda publicada em produção).

Mergear a `muri` seria **regressão**: as telas de Treinamentos/Recrutamento dela
são protótipo com mock e a `main` tem as duas áreas ligadas a 14 tabelas reais.

## 3. Migrations do repo × ledger do canônico

148 arquivos `supabase/migrations/*.sql` com versão ≥ `20260901` cruzados com
`supabase_migrations.schema_migrations` do projeto `frjbfeamybqsejlvmqbl`.
**13 não têm registro no ledger.** Para cada uma, conferi o objeto no banco real
— todas estão **em vigor**:

| objeto                                                                                                                | existe em produção |
| --------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `drenar_fila_limpeza_lgpd`, `process_lgpd_cleanup_queue`, `purge_rate_limits`, `fn_atualizar_status_ferias_diario`    | sim                |
| `pagar_desligamento`, `fn_auto_generate_training_certificate`, `fn_update_admissao_checklist`, `process_ferias_audit` | sim                |
| `fn_pensoes_set_empresa`, `bloquear_aprovacao_ponto_sem_rh`, `dp_assert_rls`                                          | sim                |
| coluna `pensoes.empresa_id`, trigger `trg_pensoes_set_empresa`, índice `idx_pensoes_empresa_id`                       | sim                |
| policies `canal_etica_rh_select`, `comunicados_rh_insert`, `cnab_remessas_rh_manage`                                  | sim                |
| revoke de DML em `dp_audit_log*` para `anon`/`authenticated` (sidecar da `20261115000000`)                            | `ok`               |

**Conclusão: não há DDL perdido.** O que existe é lacuna de _registro_ — relevante
para reconstrução determinística, não para funcionalidade. Como todas são
idempotentes, uma reconstrução as reexecuta sem dano. Fica como lote próprio de
higiene, a aplicar pelo canal canônico depois do lote atual.

## 4. As duas perdas reais encontradas fora do GitHub

1. **`ninebox_permissoes_homologacao`** — tabela que existia **só em produção**
   (4 colunas, RLS ligada, 0 policies). Versionada pela PR #708, com sidecar.
   Numa reconstrução sem ela, o preflight da `20261115150000` abortava o lote
   NineBox.
2. **`whatsapp_config`** — produção tinha **uma única policy**,
   `"Empresas gerenciam seu próprio WhatsApp"` (PERMISSIVE, role `public`,
   `FOR ALL`), cujo filtro só exige vínculo em `user_empresas`: **qualquer
   funcionário logado lia e gravava a `api_key` da Evolution API**. As versões
   `20261012150000` e `20261013120000` constam no ledger desde outubro, mas a
   policy antiga está de volta e a nova não existe — o estado foi reposto do
   baseline `20260831_canonical`, que carrega a permissiva. É o caso que o
   `AGENTS.md` §5 descreve: **ledger não prova DDL**. Consertado pela PR #710
   com versão nova (as antigas o canal pula, por já estarem no ledger) e gate na
   tela, porque `/integracoes` não passa por `AdminRoute`.

## 5. Limites de ferramenta desta sessão (não são decisão pendente)

- **Lista de edge functions publicadas:** sem token de management do Supabase.
  Sondagem HTTP por nome (401/405 = no ar, 404 = fora) é o que há.
- **Workflows do N8N:** o MCP desta sessão expõe só variáveis (`var_*`); não há
  endpoint de listar workflows.
- **`actionlint` local:** binário ausente no container e instalação bloqueada
  pelo ambiente. O workflow foi escrito pelo MCP do GitHub (caminho que o
  `AGENTS.md` §7 manda usar) e validado pelo job
  `Lint de workflows (actionlint)` do CI, que passou na PR #712.
