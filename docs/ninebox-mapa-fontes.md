# Nine-Box — MAPA DEFINITIVO DAS FONTES DE DADOS E CONSISTÊNCIA

> Auditoria **exclusivamente de leitura** + testes. Nada em banco, migrations, RLS,
> dados reais, layout, animações ou outros módulos foi alterado.
> **O Nine-Box NÃO está homologado** — ver §9 (pendências que bloqueiam a homologação).

## 1. Diagrama das fontes

```
                        ┌──────────────────────────────┐
   TELA (aba Nine-Box)  │  AvaliacaoPage / NineBoxTab  │
                        └──────────────┬───────────────┘
             ┌─────────────────────────┼───────────────────────────┐
             ▼                         ▼                           ▼
   avaliacaoService.listarFeedbacks  colaboradorService.list   avaliacaoService.listarPDIs
             │  (SELECT *, empresa_id)   (pageSize 25 — só nome/   (colaborador_id)
             ▼                            cargo/foto)             ▼
   ┌─────────────────────┐                                          pdi_plano_desenvolvimento
   │  feedbacks_360      │  ◄── ÚNICA FONTE DA CLASSIFICAÇÃO
   └──────────┬──────────┘
              ▼
   nineBoxConsolidacao.consolidarNineBox()   ← pipeline de 4 etapas
              ▼
   nineBoxComum.derivarPontos() → pontos → KPIs · matriz · destaques · insights · movimentação

   ── FORA DO FLUXO (legado, sem consumidores) ─────────────────────────────
   vw_matriz_nine_box  →  public.avaliacoes (colunas performance_score/potencial_score
                          QUE NÃO EXISTEM) — view inválida, 0 referências em src/
```

## 2. Tabelas e views envolvidas

| Objeto | Papel real | Estado |
|---|---|---|
| `public.feedbacks_360` | Fonte única de desempenho/potencial (colunas `nota_geral NUMERIC` sem CHECK; `performance`/`potencial INTEGER CHECK 1–5`) | **ativa** — escrita pelo app (INSERT) e lida por todas as superfícies |
| `public.ciclos_avaliacao` | Ciclos (filtro que comanda a matriz) | ativa |
| `public.colaboradores` | Nome/cargo/departamento/foto (paginado em 25) | ativa |
| `public.pdi_plano_desenvolvimento` | Marca "Com PDI" | ativa |
| `public.avaliacoes` | `valor DECIMAL(15,2)`, `competencia`, `data_vencimento`, `arquivo_url` → **documentos/laudos com valor**, NÃO desempenho | ativa como tabela, **irrelevante** para o Nine-Box |
| `vw_matriz_nine_box` | Agregado legado do Nine-Box (originalmente sobre `feedbacks_360 WHERE status='concluido'`) | **reescrita na migration `20260802000000` contra `public.avaliacoes` (colunas inexistentes) → inválida** |
| `public.audit_log` | Trilha (append-only) | ativa; **sem trigger** para `feedbacks_360` |

## 3. Componentes que consomem cada fonte

| Consumidor | Fonte | Operação |
|---|---|---|
| `NineBoxTab`, `NineBoxKpis`, `NineBoxMatriz`, `NineBoxQuadrante`, `NineBoxLateral`, `NineBoxQuadranteDialog`, `NineBoxFocoBanner`, `NineBoxFiltros` | `pontos` (derivado de `feedbacks_360`) | leitura |
| `FeedbacksTab`, `PerformanceDashboard`, `AnaliticosDesempenho`, `PerformanceAuditTimeline`, `TodosCiclosTable`, `PdiTab`, `MetasOKRsTab` | `feedbacks_360` / `ciclos_avaliacao` / `metas_okrs` / `pdi_plano_desenvolvimento` | leitura |
| `useDesenvolvimentoColaborador`, `useHistoricoColaborador`, `useRealtimeDashboard` | `feedbacks_360` | leitura |
| `avaliacaoService` | `feedbacks_360` | **único escritor** (INSERT/DELETE; sem UPDATE) |
| **`vw_matriz_nine_box`** | — | **nenhum componente, hook, serviço, edge function ou teste** |

## 4. Regras de classificação encontradas

| Onde | Limiares | Quadrantes | Ciclo |
|---|---|---|---|
| App (`nineBoxCombinacao.classifyScore`) | ≤1,5 baixo · ≤3,5 médio · >3,5 alto | **9** | **filtra pelo ciclo selecionado** |
| `vw_matriz_nine_box` (versão 2026-05, origem) | — | por quadrante textual | `WHERE status='concluido'` |
| `vw_matriz_nine_box` (versão 2026-08, vigente no arquivo) | **≥4** | **4** (`estrela`, `especialista`, `aprendiz`, `core`) | **nenhum** (agrega tudo) |

## 5. Divergências comprovadas

1. **Limiar diferente:** app usa 1,5/3,5 (três faixas); a view usava corte em 4 (duas faixas).
2. **Número de quadrantes:** 9 (app) × 4 (view).
3. **Isolamento de ciclo:** app por ciclo; view agregando todos os ciclos.
4. **Fonte:** app em `feedbacks_360`; view (vigente) em `public.avaliacoes`.
5. **View inválida:** `performance_score`/`potencial_score` **só aparecem nessa definição** — nenhuma migration cria essas colunas em nenhuma tabela → a view não pode ser consultada.
6. **Semântica de status divergente:** a máquina de estados do app usa `pendente/concluido/cancelado`; a view original exigia `concluido`; o app grava sempre `pendente` (não há finalização).

## 6. Dependências legadas

- `vw_matriz_nine_box`: **0 consumidores** no repositório (só aparece em migrations e na documentação criada nesta auditoria) → remover/realinhar não quebra a interface (mas **não foi tocada**, conforme sua restrição).
- `public.avaliacoes`: tabela antiga (`2025-12-28`) com policy `FOR ALL` liberada e depois corrigida para tenant (`20260724002100`) → nenhuma referência no app.

## 7. Riscos de manter duas implementações

| Risco | Gravidade | Situação |
|---|---|---|
| Classificações contraditórias para a mesma pessoa | **Alta (latente)** | Não se materializa hoje: a view é inválida e não é consumida |
| Terceiro (BI/consulta manual) usando a view e publicando números diferentes | **Alta** | Precisa de verificação no banco-alvo (§8, query Q1/Q2) |
| Refatoração futura "consertar" a view contra `avaliacoes` e criar uma segunda verdade | **Média** | Mitigação: registrar a decisão de fonte única (§9) |
| Regra de 4 quadrantes reaparecer em documentação/metas | **Média** | Mitigação: documentar a regra oficial (9 quadrantes, 1,5/3,5) |

## 8. Confirmação no banco-alvo (somente leitura — não executei)

```sql
-- Q1: a view existe e está válida?
select c.relname, c.relkind, v.security_invoker
from pg_class c left join pg_views v on v.viewname = c.relname
where c.relname = 'vw_matriz_nine_box';

-- Q2: alguma coisa depende dela?
select dependent.relname as objeto_dependente, dependent.relkind
from pg_depend d
join pg_rewrite r on r.oid = d.objid
join pg_class dependent on dependent.oid = r.ev_class
join pg_class source on source.oid = d.refobjid
where source.relname = 'vw_matriz_nine_box';

-- Q3: a view abre? (se falhar, confirma a invalidade por coluna inexistente)
select * from public.vw_matriz_nine_box limit 1;

-- Q4: `public.avaliacoes` tem as colunas da view e dados?
select column_name, data_type from information_schema.columns
where table_schema='public' and table_name='avaliacoes' order by ordinal_position;
select count(*) as linhas from public.avaliacoes;

-- Q5: distribuição real de status em feedbacks_360 (base para ligar o filtro depois)
select empresa_id, ciclo_id, coalesce(status,'(nulo)') as status, count(*),
       count(distinct avaliado_id) as colaboradores_unicos
from public.feedbacks_360 group by 1,2,3 order by 4 desc;

-- Q6: KPIs de hoje x pessoas únicas (contagem de feedbacks ≠ pessoas)
select ciclo_id, count(*) registros, count(distinct avaliado_id) pessoas
from public.feedbacks_360 group by 1 order by 2 desc;
```

## 9. Proposta de fonte única oficial

1. **Fonte única da classificação = `feedbacks_360`** (é o que a tela usa e o que o pipeline consolida). Nenhuma outra fonte deve alimentar a matriz.
2. **`vw_matriz_nine_box`:** manter intocada por ora (sua restrição), mas **marcada como legado inválido** neste documento. Quando autorizado, uma migration de limpeza deve **remover a view** (ou recriá-la como agregação *somente leitura* sobre `feedbacks_360`, com `security_invoker` e alinhada à regra oficial de 9 quadrantes) — decisão sua.
3. **`public.avaliacoes`:** fora do escopo do Nine-Box (é tabela de documentos com valor). Nenhuma mudança proposta.
4. **Regra oficial documentada:** escala 1–5, faixas por `≤1,5 / ≤3,5 / >3,5`, 9 quadrantes, sempre **um colaborador por ciclo** (`empresa + ciclo + colaborador`).
5. **Semântica de status oficial:** `pendente → concluido | cancelado`, com `concluido` sendo o único estado que deve consolidar **quando o fluxo existir** (compatível com a intenção da view original).

## 10. Plano de migração (somente se necessário)

| Passo | Ação | Gate |
|---|---|---|
| 1 | Rodar Q1–Q6 e registrar os resultados | leitura, pode ser feito já |
| 2 | Se a view não for usada por ninguém: migration de **remoção** (ou realinhamento) | **exige sua autorização** |
| 3 | Se houver uso externo: publicar aviso de descontinuação e só então remover | **exige sua autorização** |
| 4 | Ligar o filtro de status (após finalização em produção) | **exige sua autorização** |

## 11. Testes exigidos para homologação

1. Nenhuma superfície do Nine-Box consulta `vw_matriz_nine_box` (grep + revisão de imports) ✅ **verificado: 0 referências**.
2. KPIs de pessoas usam colaboradores únicos, não contagem de feedbacks ✅ (ver §12).
3. Matriz, destaques, insights e movimentação derivam da **mesma** lista `pontos` ✅.
4. Consolidado: 1 colaborador + 1 ciclo = 1 classificação (`validarInvariantes`) ✅.
5. Seleção do representante: mais recente prevalece; sinalização não rebaixa ✅ (20 testes).
6. Conteúdo da view (se mantida) comparado com a regra oficial em amostra de ciclo — **depende de Q1–Q4**.

## 12. Consistência dos indicadores (Prioridade 4)

| Indicador | Métrica | Unidade correta? |
|---|---|---|
| Nine-Box · "Colaboradores avaliados" | `classificados` = pessoas com quadrante **no ciclo** | ✅ pessoas únicas |
| Nine-Box · "Evoluíram / Permaneceram / Regrediram" | `lerMovimento` por `colaboradorId` | ✅ pessoas |
| Nine-Box · contagem por quadrante | `contarQuadrantes(pontos)` (soma fecha com classificados) | ✅ pessoas |
| Nine-Box · Talentos em destaque | `rankingPontos(filtrados)` | ✅ pessoas |
| Nine-Box · Insights | `lerInsightsEstruturados(contagens, atencao, movimento)` | ✅ derivados dos mesmos dados |
| Feedbacks · "Feedbacks por Status" / "Distribuição das Notas" | `feedbacks.length` | ✅ métrica É de registros (rótulo diz "feedbacks") |
| Alertas · "feedbacks pendentes" | registros pendentes | ✅ idem |
| Timeline · "N feedback(s)" | registros | ✅ idem |

**Nenhum indicador do módulo rotula contagem de feedbacks como "colaboradores"** ✅. Todo o Nine-Box lê `pontos` (mesma base consolidada) ✅.

