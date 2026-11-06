# CONTEXTO PARA AGENTES DE IA — ÍNDICE ÚNICO

> Gerado automaticamente por indice.py · 2026-11-06 00:47 UTC · HEAD `0d79b5cef6` · Não edite à mão.

Um sistema, três fontes de verdade, três produtores independentes. **Leia este arquivo e vá direto à fonte certa.** Cada fato tem um dono: se duas fontes discordarem, vale o dono.

## Onde está cada coisa

| Preciso de… | Fonte (dona do fato) | Onde ler | Estado |
|---|---|---|---|
| Regras que não podem ser quebradas: RLS por operação, estados e transições, validações, fórmulas, prazos, erros de negócio, testes como especificação, inconsistências código×schema (NÃO VERIFICADO) e regras humanas (`manual/`) | **regras de negócio** | `docs/contexto/regras/07-REGRAS-DE-NEGOCIO.md` | ok · 1 min atrás |
| Tabelas, colunas, RLS/políticas, funções, triggers, cron, storage, lints — **como está em produção agora** | **banco real** | `docs/contexto/supabase/README.md` | parcial · 2h atrás · ⚠️ 6 erro(s) de coleta no manifest (erros); 6 seção(ões) com erro em errors.md; desatualizado há 2h47 |
| Rotas, telas, módulos, hooks, edge functions, grafo de dependências, testes, scripts, convenções | **código** | `docs/contexto/codigo/INDEX.md` | ok · 0 min atrás |

## Ordem de leitura antes de qualquer tarefa ou planejamento

1. **regras de negócio** — Qualquer mudança de comportamento · Antes de criar status/valor/validação · Antes de planejar.
2. **banco real** — Vou tocar tabela/coluna/política/função SQL · Quero saber se algo existe de verdade no banco.
3. **código** — Vou mexer em tela/rota/hook/edge · Preciso saber onde uma coisa vive e quem a usa.

## Regras do protocolo

- Tabela/coluna/política existe? → **banco real**. Migrations do repo são histórico, não estado.
- Onde fica, quem chama, o que importa o quê? → **código**.
- Pode fazer isso? Qual estado vem depois? Qual o limite? → **regras de negócio** (inclui `manual/`, escrito por humanos, prioridade máxima).
- Item listado como **NÃO VERIFICADO** ou **inconsistência** em qualquer fonte: confirme na fonte dona antes de assumir.
- Nada aqui é editado à mão. Para registrar uma regra que só o negócio sabe, escreva em `manual/` da fonte de regras.

<details><summary>Arquivos de <b>banco real</b> (`docs/contexto/supabase/`)</summary>

- `docs/contexto/supabase/CHANGELOG.md`
- `docs/contexto/supabase/README.md`
- `docs/contexto/supabase/auth.md`
- `docs/contexto/supabase/cron-runs.md`
- `docs/contexto/supabase/cron.md`
- `docs/contexto/supabase/edge-functions.md`
- `docs/contexto/supabase/errors.md`
- `docs/contexto/supabase/extensions.md`
- `docs/contexto/supabase/foreign-servers.md`
- `docs/contexto/supabase/functions.md`
- `docs/contexto/supabase/grants.md`
- `docs/contexto/supabase/indexes.md`
- `docs/contexto/supabase/lints.md`
- `docs/contexto/supabase/manifest.json`
- `docs/contexto/supabase/migrations.md`
- `docs/contexto/supabase/policies.md`
- `docs/contexto/supabase/project-config.md`
- `docs/contexto/supabase/queues.md`
- `docs/contexto/supabase/realtime.md`
- `docs/contexto/supabase/relationships.md`
- `docs/contexto/supabase/roles.md`
- `docs/contexto/supabase/schemas.md`
- `docs/contexto/supabase/sequences.md`
- `docs/contexto/supabase/snapshot.json`
- `docs/contexto/supabase/stats.json`
- `docs/contexto/supabase/stats.md`
- `docs/contexto/supabase/storage.md`
- `docs/contexto/supabase/tables.md`
- `docs/contexto/supabase/tables/_supabase_internal_triggers.md`
- `docs/contexto/supabase/tables/public/adiantamentos_salariais.md`
- `docs/contexto/supabase/tables/public/admissao_tokens.md`
- `docs/contexto/supabase/tables/public/admissoes.md`
- `docs/contexto/supabase/tables/public/aej_geracoes.md`
- `docs/contexto/supabase/tables/public/afastamentos.md`
- `docs/contexto/supabase/tables/public/afd_geracoes.md`
- `docs/contexto/supabase/tables/public/afdt_divergencias.md`
- `docs/contexto/supabase/tables/public/afdt_importacoes.md`
- `docs/contexto/supabase/tables/public/afdt_registros_raw.md`
- `docs/contexto/supabase/tables/public/ajustes_ponto.md`
- `docs/contexto/supabase/tables/public/anotacoes_colaborador.md`
- `docs/contexto/supabase/tables/public/asos.md`
- `docs/contexto/supabase/tables/public/audit_log.md`
- `docs/contexto/supabase/tables/public/audit_log_unified.md`
- `docs/contexto/supabase/tables/public/audit_log_unified_archive.md`
- `docs/contexto/supabase/tables/public/audit_logs.md`
- `docs/contexto/supabase/tables/public/auditoria.md`
- `docs/contexto/supabase/tables/public/auditoria_acesso_bancario.md`
- `docs/contexto/supabase/tables/public/auditoria_contratual.md`
- `docs/contexto/supabase/tables/public/auditoria_logs.md`
- `docs/contexto/supabase/tables/public/auth_gov_br_sessions.md`
- `docs/contexto/supabase/tables/public/automacao_logs.md`
- `docs/contexto/supabase/tables/public/banco_horas.md`
- `docs/contexto/supabase/tables/public/banco_horas_config.md`
- `docs/contexto/supabase/tables/public/batidas_ponto.md`
- `docs/contexto/supabase/tables/public/beneficiarios_plano.md`
- `docs/contexto/supabase/tables/public/beneficiarios_seguro.md`
- `docs/contexto/supabase/tables/public/beneficio_arquivos.md`
- `docs/contexto/supabase/tables/public/beneficio_movimentacoes.md`
- `docs/contexto/supabase/tables/public/beneficio_regras_elegibilidade.md`
- `docs/contexto/supabase/tables/public/beneficio_utilizacao.md`
- `docs/contexto/supabase/tables/public/beneficios.md`
- `docs/contexto/supabase/tables/public/beneficios_colaborador.md`
- `docs/contexto/supabase/tables/public/beneficios_colaboradores.md`
- `docs/contexto/supabase/tables/public/bitrix24_config.md`
- `docs/contexto/supabase/tables/public/bitrix24_sync_logs.md`
- `docs/contexto/supabase/tables/public/blocked_ips.md`
- `docs/contexto/supabase/tables/public/campos_customizados.md`
- `docs/contexto/supabase/tables/public/canal_etica.md`
- `docs/contexto/supabase/tables/public/candidatos.md`
- `docs/contexto/supabase/tables/public/candidaturas.md`
- `docs/contexto/supabase/tables/public/cargo_faixas_salariais.md`
- `docs/contexto/supabase/tables/public/cargos.md`
- `docs/contexto/supabase/tables/public/catalogo_cursos.md`
- `docs/contexto/supabase/tables/public/catalogo_infracoes.md`
- `docs/contexto/supabase/tables/public/categorias_trabalhador.md`
- `docs/contexto/supabase/tables/public/cbo.md`
- `docs/contexto/supabase/tables/public/centros_custo.md`
- `docs/contexto/supabase/tables/public/certificados_digitais.md`
- `docs/contexto/supabase/tables/public/ciclos_avaliacao.md`
- `docs/contexto/supabase/tables/public/cid10.md`
- … +343

</details>

<details><summary>Arquivos de <b>código</b> (`docs/contexto/codigo/`)</summary>

- `docs/contexto/codigo/GRAPH_REPORT.md`
- `docs/contexto/codigo/INDEX.md`
- `docs/contexto/codigo/banco.json`
- `docs/contexto/codigo/baseline.json`
- `docs/contexto/codigo/componentes.json`
- `docs/contexto/codigo/convencoes.json`
- `docs/contexto/codigo/edge-functions.json`
- `docs/contexto/codigo/ferramentas.json`
- `docs/contexto/codigo/grafo-arestas.json`
- `docs/contexto/codigo/grafo-graphify.json`
- `docs/contexto/codigo/grafo.json`
- `docs/contexto/codigo/hooks.json`
- `docs/contexto/codigo/logica.json`
- `docs/contexto/codigo/manifest.json`
- `docs/contexto/codigo/modulos.json`
- `docs/contexto/codigo/rotas.json`
- `docs/contexto/codigo/scripts.json`
- `docs/contexto/codigo/testes.json`

</details>

<details><summary>Arquivos de <b>regras de negócio</b> (`docs/contexto/regras/`)</summary>

- `docs/contexto/regras/07-REGRAS-DE-NEGOCIO.md`
- `docs/contexto/regras/10-ACESSO-E-SEGURANCA.md`
- `docs/contexto/regras/11-GLOSSARIO-E-LACUNAS.md`
- `docs/contexto/regras/context.json`
- `docs/contexto/regras/manifest.json`
- `docs/contexto/regras/manual/README.md`
- `docs/contexto/regras/manual/TEMPLATE-regras-de-negocio.md`

</details>
