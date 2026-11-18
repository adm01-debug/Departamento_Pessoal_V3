# Reauditoria dos descartes — 18/11/2026

Objetivo do dono: _"faça uma análise exaustiva em tudo que você descartou, procurando o
que NÃO deveria ter sido descartado por ser trabalho de outro agente, PARCIAL"_.

## 1. O erro de método da auditoria anterior

A reconciliação de 16–18/11 comparou as 650 cabeças de PR por **conteúdo**, mas o funil
usado (312 → 111 "alto valor" → 41 triados) partia de **arquivos ausentes**: caminhos que
não existem na `main`. Com isso, **alteração dentro de arquivo que continua existindo nunca
foi examinada** — e é exatamente aí que mora trabalho parcial de outro agente.

Além disso, o esforço concentrou-se na PR #546 (`muri`). As outras PRs fechadas sem merge
não foram abertas uma por uma.

## 2. Universo real, fechado por consulta e não por amostragem

Das 650 PRs do repositório, **apenas 38 nunca foram mergeadas** (GraphQL,
`states: [CLOSED, OPEN]`, que exclui `MERGED`): 25 são bump do Dependabot e 13 são
trabalho de agente/humano.

Para cada uma: `git diff --name-only $(git merge-base origin/main pr/N) pr/N`, e para cada
arquivo tocado, comparação de blob contra `origin/main` — o que separa "ausente da main"
de "existe mas diverge". Resultado por PR, com a prova:

| PR   | Assunto                                | Veredito                   | Prova                                                                                                                                                                                                                                                                                                                                                  |
| ---- | -------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| #209 | 4 rotinas agendadas falhando todo dia  | **Incorporada**            | migration `20261012130000` na main difere só em comentários (3+/14-, nenhuma linha funcional); script de teste idêntico                                                                                                                                                                                                                                |
| #256 | Notas de sessão no CLAUDE.md           | Obsoleta                   | `CLAUDE.md` na main é só `@AGENTS.md`; abordagem substituída de propósito                                                                                                                                                                                                                                                                              |
| #328 | `.github/workflows/main.yml`           | Vazia                      | o arquivo da PR tem **0 bytes**                                                                                                                                                                                                                                                                                                                        |
| #358 | Bypass de MFA para E2E                 | **Main à frente**          | a main tem o `return` dentro do `useEffect` que a PR não tinha                                                                                                                                                                                                                                                                                         |
| #361 | E2E cleanup tolerar P0001 + aria-label | **Incorporada**            | `seed-cleanup.spec.ts:81` tem o `P0001`; `user-profile-menu.tsx:54` tem o aria-label                                                                                                                                                                                                                                                                   |
| #370 | Reprovar dependência crítica ausente   | **Main à frente**          | a main troca `throw` por `console.error`+`failures++`, checa a versão instalada do TS e inclui `bun.lock`                                                                                                                                                                                                                                              |
| #371 | Geradores com falha silenciosa         | **Main à frente**          | a main é ESM, tem guarda de sobrescrita ("already exists; nothing was written") e resolve caminho por `import.meta.dirname`                                                                                                                                                                                                                            |
| #372 | Scripts shell com falha silenciosa     | **Quase toda incorporada** | `backup.sh` tem o `rm -f` no erro; `capacitor-build.sh` tem `--check`, pré-checagem de `node_modules` e ainda `--help`; `wait-for-postgres` tem a checagem de container morto. **Resíduo:** `deploy.sh`/`rollback.sh` ficaram em `set -e` (a PR punha `set -euo pipefail`) e perderam o bit de execução — ambos só fazem `exit 1`, efeito prático zero |
| #391 | Erro claro em `build-rebaseline`       | **PERDA REAL (pequena)**   | a main **não** tem o `try/catch` que a PR adicionou: arquivo de entrada ausente dá stack do Node em vez de "arquivo de entrada ausente". Sai não-zero nos dois casos                                                                                                                                                                                   |
| #533 | Feriado de 20/11 no prazo do Art. 145  | **Superada e aplicada**    | conteúdo chegou por `20261114000000_remediate_ferias_art145_11_20`, no ledger de produção. Verificado no banco: `eh_feriado_fixo_br('2026-11-20') = true` e prazo de férias de 22/11 = **19/11**                                                                                                                                                       |
| #546 | `muri`                                 | ver seção 3                |                                                                                                                                                                                                                                                                                                                                                        |
| #564 | NineBox/Avaliação onda W1              | **Incorporada**            | 158 arquivos tocados, **0 ausentes** da main, e nenhum arquivo de teste tem menos casos na main                                                                                                                                                                                                                                                        |
| #592 | Canoniza 8 migrations                  | **Incorporada**            | as 8 são **byte a byte idênticas** às da main                                                                                                                                                                                                                                                                                                          |

Os 25 bumps do Dependabot não são trabalho de agente e não foram triados aqui.

## 3. PR #546 (`muri`) — os 258 arquivos ausentes da main

Única PR não mergeada com corpo de trabalho ausente (as outras somam 3 arquivos: 2 da #533,
superados, e 1 vazio da #328).

| Categoria                                                                                         | Qtd | Veredito                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------- | --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/_tmp-*`, `_visual-*`, `_medir*`                                                          | 152 | 133 descartáveis (sonda de uma sessão, grava em `tmp-*`, nenhuma referenciada por `npm run` ou workflow), 17 já cobertos por sidecar `.verify.sql`/teste da main, 2 ferramentas de dev sem equivalente (auditoria tipográfica em navegador e roteiro de demo D1–D20) |
| `supabase/.temp/*`                                                                                | 8   | artefato local do CLI                                                                                                                                                                                                                                                |
| `supabase/migrations/*` + 1 rollback                                                              | 10  | ver seção 4                                                                                                                                                                                                                                                          |
| `src/components/**` (não-teste)                                                                   | 23  | 2 perdas reais (seção 5), 8 já cobertas, 13 descartáveis                                                                                                                                                                                                             |
| `src/components/__tests__/**`, `src/pages/__tests__/**`                                           | 14  | ver seção 6                                                                                                                                                                                                                                                          |
| `src/mocks/*`, `src/assets/banks/*`                                                               | 14  | mock da demonstração e imagens medidas e descartadas na #699                                                                                                                                                                                                         |
| `_tmp-*.mjs` na raiz, `anim-out/*`, `desempenho-*.txt`, `dev-server.err`, `pnpm-*`, `.clinerules` | 29  | lixo de sessão; `pnpm-*` é proibido pelo repo (npm único)                                                                                                                                                                                                            |
| `docs/`, `e2e/`, outros                                                                           | 8   | SQL ad-hoc com nome de pessoa, e2e que depende de mock inexistente na main                                                                                                                                                                                           |

## 4. As 10 migrations órfãs da muri — conferidas contra o banco de produção

| Migration                                               | Estado em produção                                                                                                                                                                                                                                                              |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20260819000000_p0_fix_user_empresa_id_rls`             | **aplicada em substância**: `user_empresa_id()` lê `user_empresas`                                                                                                                                                                                                              |
| `20260820000000_p0_fix_auditoria_rpc`                   | **aplicada**: `registrar_auditoria` e `listar_auditoria` existem, 1 overload cada (era o ponto da migration)                                                                                                                                                                    |
| `20260821000000_p0_rls_dashboard_audit`                 | **aplicada**: policy `admissoes_tenant_select` existe                                                                                                                                                                                                                           |
| `20260925120000_document_upload_storage_columns`        | recriada como `20261117170300_documentos_colunas_storage` (no ledger)                                                                                                                                                                                                           |
| `20260925130000_storage_documentos_delete_tenant_scope` | recriada como `20261117170000` (no ledger)                                                                                                                                                                                                                                      |
| `20261005000000_onboarding_kits_rls_additive`           | **objetivo atendido**: `onboarding_kits` com RLS ligada e policy `FOR ALL` por empresa                                                                                                                                                                                          |
| `20261005010000_onboarding_audit_trigger`               | recriada como `20261117170100` (no ledger)                                                                                                                                                                                                                                      |
| `20261005020000_onboarding_modelo_b_convergencia`       | **não aplicada, de propósito** — copiaria 27 tarefas de onboarding do modelo legado para o canônico, e os 6 registros de origem são **seed** (todos criados em 27/07/2026 pela `20260730000000_seed_*`, nomes de demonstração). Aplicar injetaria dado fictício nas telas reais |
| `20261026090000_ciclos_exclusao_autorizada` (+rollback) | **aplicada em substância**: `ciclos_avaliacao_insert`/`_delete` exigem `pode_gerir_avaliacoes()`; trigger de bloqueio por dependência existe                                                                                                                                    |

## 5. Perdas reais encontradas nesta reauditoria, e o que foi feito

| Achado                                                                                                                                                                                                                                                       | Onde                                                       | Ação                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **`AlertasRHWidget` e `CadastroIncompletoWidget` definidos e nunca renderizados** — `vw_alertas_rh` com **47 linhas**, todas "Férias iniciada SEM pagamento (Art. 145 CLT)" (13/11 a 18/11), e `vw_cadastro_incompleto` com **15**. Nada disso chegava ao RH | `src/components/dashboard/analytics/widgets.tsx:184,239`   | PR #702 — põe os dois em tela na `AnalyticsSection`. Views conferidas com `security_invoker=true` antes |
| **Filtro "Inativos" filtrava status inexistente** — o enum `status_colaborador` é `ativo, ferias, afastado, desligado, pendente`; a opção nunca retornava nada, e `pendente` não tinha filtro                                                                | `src/pages/ColaboradoresPage.tsx:127`                      | PR #701 — trocado por "Pendentes"                                                                       |
| **Paginação, ordenação e filtro por etapa dos desligamentos**                                                                                                                                                                                                | `GestaoDesligamentos.tsx`, 854 linhas, nunca chegou à main | PR #700                                                                                                 |
| **21 casos de teste para código vivo e sem teste** (`PdiCard`, `ColaboradoresPage`, `AdmissoesPage`)                                                                                                                                                         | `src/components/__tests__`, `src/pages/__tests__`          | PR #701                                                                                                 |
| `try/catch` com mensagem clara em `build-rebaseline.mjs` (#391)                                                                                                                                                                                              | `scripts/build-rebaseline.mjs`                             | não feito — só muda a mensagem de erro de um script manual; registrado em "Próximos passos"             |

## 6. Testes da muri — por que cada um entrou ou não

| Arquivo                                                                                                                    | Casos       | Decisão                                                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PdiCard.test.tsx`                                                                                                         | 20 → **14** | entrou. Saíram 6 que exigiam `MOCK_PROGRESSO_PDI_ATIVO` ligado: na muri era `true` fixo e o card mostrava percentual inventado **até em produção**; a main fechou isso. 1 caso reescrito (o menu existe sempre porque `Exportar PDF` funciona sem prop) |
| `ColaboradoresPage.test.tsx`                                                                                               | 4 → **5**   | entrou, com mocks de `usePiiMask` e das opções de filtro; os 2 casos do filtro de status provam a correção                                                                                                                                              |
| `AdmissoesConsolidacao.test.tsx`                                                                                           | **2**       | entrou, com `QueryClientProvider` e shim de `useAuth`                                                                                                                                                                                                   |
| `FeriasResumoTab.test.tsx`                                                                                                 | 3           | **não**: o componente foi reescrito na main (1000+ linhas, 3 hooks, textos todos diferentes). Recuperar seria escrever teste novo. O componente segue sem teste                                                                                         |
| `ColaboradorFormPage.test.tsx`                                                                                             | 36          | **não**: testa um formulário maior que o da main (campos `rg_data_emissao`, `local_trabalho`, `centro_custo`, `lotacao_principal_id` que a main não tem)                                                                                                |
| `DadosPessoaisTab`, `HoleritesTab`, `SSTResumoTab`, `auditoriaDerivacoes`                                                  | —           | já cobertos: a main tem 6, 7 e 13 casos (vs 7, 4 e 2 da muri)                                                                                                                                                                                           |
| `AuditoriaAdmissoesContent`, `ColaboradorCamposCustomizadosTab`, `ComplianceTab`, `FormularioRescisao`, `QuickActionsMenu` | 44          | órfãos: testam componente que não existe na main, e cujo original depende de `@/mocks/admissoesMock`, ausente da main                                                                                                                                   |

## 7. Decisões de não resgatar, com o motivo

- **`src/hooks/use-stagger-cards.ts`** — entrada em cascata global dos cards. A main cita o
  arquivo em comentários (`ui/entrada-cards.tsx:71`, `lib/motionMode.ts:72`) mas não o tem.
  Ganho **puramente estético**, nenhum dado novo, e o orçamento de bundle está saturado.
- **Bloco AUTO-CURA de Service Worker** (`src/main.tsx` da muri) — guardado por
  `import.meta.env.DEV`: limpa SW/cache obsoleto na máquina de **desenvolvimento**. Zero
  efeito em produção, e o comentário cita `bun dev`, runtime proibido no repo.
- **`AlertasProximasCard.tsx` como está na muri** — funde "Alertas de RH" com "Próximas
  Atividades". `ProximasAtividadesCard` já está em tela desde a #698; fundir duplicaria.
  Só a parte que faltava (os alertas) entrou na #702.
- **Histórico da calculadora de rescisão** — na muri o "Histórico" é estado local da
  sessão, não leitura de `historico_rescisoes`. **Nenhuma das duas** fecha o buraco real:
  a main grava na tabela (`CalculadoraRescisaoPage.tsx:194`) e **nunca** lê. Registrado em
  "Próximos passos".
- **`deploy.sh`/`rollback.sh` em `set -e` em vez de `set -euo pipefail`** — os dois só
  fazem `exit 1`; o endurecimento não muda comportamento nenhum hoje.

## 8. O que esta reauditoria NÃO prova

- Os 25 bumps do Dependabot fechados sem merge não foram conferidos contra o
  `package.json` atual. O alerta moderado aberto do Dependabot no repositório segue de pé.
- Comparei blob a blob e, nos casos divergentes, as linhas funcionais. Não reli os 158
  arquivos da #564 linha por linha — a prova ali é contagem de casos de teste por arquivo.
- Nada foi conferido clicando na tela de produção. Onde digo "em produção", a fonte é
  consulta SQL ou catálogo do Postgres, citada no próprio item.
