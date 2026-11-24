# Lógica — Services (a–f), parte 1/2

Escopo: `src/services/` — arquivos iniciando em `a`..`f` (inclusive), mais o diretório `folha/`.
`__tests__` ignorado como alvo, mas usado como prova de "só o teste importa".

---

## 1. Cobertura

**Lidos integralmente (44 arquivos, 6.897 linhas):**
`admissaoService`, `afastamentoService`, `assistenteIAService`, `auditoriaService`, `authService`,
`automacaoService`, `avaliacaoService`, `backupService`, `bancoHorasConfigService`, `bancoHorasService`,
`baseService`, `batidasPontoService`, `beneficioService`, `calculoBeneficiosService`,
`canalContabilidadeService`, `cargoService`, `catalogoCursoService`, `cnabLayoutService`, `cnabService`,
`colaboradorDetalhesService`, `colaboradorService`, `comunicacaoService`, `contabilidadeService`,
`contratacaoService`, `contratoService`, `contratoTemplateService`, `controleAcessoService`,
`departamentoService`, `desligamentoService`, `despesaService`, `documentoService`,
`dominioAlterdataService`, `dominioService`, `edgeFunctionsService`, `empresaService`,
`encryptionService`, `episService`, `esocialService`, `exportService`, `faltasService`, `feriasService`,
`folhaPagamentoService`, `folhaService`, `folha/calculoLoteService`, `folha/provisoesService`.
(Exceção: `exportService` lido integralmente exceto o miolo de layout jsPDF de `exportPontoCSV`, lido por amostragem.)

**Amostrado:** consumidores fora de `src/services/` (grep dirigido por símbolo, não leitura integral das páginas).

**Verificação contra o banco de produção (leitura via MCP, `project_ref` frjbfeamybqsejlvmqbl):**
- Existência de 92 tabelas referenciadas pelos services → todas existem, **exceto `contratos_trabalho` e `folha_pagamento` (singular)**.
- Existência de colunas (`pg_attribute`) para todos os filtros/inserts suspeitos.
- Existência de FKs (`pg_constraint`) para todos os embeds PostgREST suspeitos.
- Índices únicos (`pg_indexes`) para todos os `upsert(..., { onConflict })`.
- Existência das 8 RPCs chamadas → **todas existem**.
- `storage.buckets` → **0 buckets, 0 objects** (como `postgres`, com privilégio de leitura confirmado).

**Não executado:** build, typecheck, lint, testes (`node_modules` ausente). Nenhuma afirmação de "compila"/"passa".

---

## 2. Tabela de funcionalidades

| Funcionalidade | Classificação | Evidência (arquivo:linha / objeto de banco) | O que falta |
|---|---|---|---|
| CRUD genérico (`BaseService`) | `IMPLEMENTADO_PARCIAL` | `src/services/baseService.ts:21-173`; `requireEmpresaId` default `true` em :31-33 | Assume que TODA tabela tem `empresa_id`. 33 das tabelas usadas **não têm** → ver Achados 3, 4, 5 |
| Colaboradores (listar/summary/CRUD) | `IMPLEMENTADO_TOTAL` | `colaboradorService.ts:14-99`; tabela `colaboradores` = 13 linhas | — (funciona; `pageSize` sem clamp em :91, risco de payload grande) |
| Empresas — listar | `IMPLEMENTADO_TOTAL` | `empresaService.ts:12-31`; `empresas` = 1 linha | — |
| Empresas — **editar** | `MORTO_OU_ABANDONADO` | `EmpresaFormPage.tsx:77` chama `empresaService.atualizar(id, data)` sem `empresaId` → `baseService.ts:129-131` lança sempre | Passar `empresaId` ou `requireEmpresaId:false`; e `empresas` não tem coluna `empresa_id` |
| Cargos / Departamentos | `IMPLEMENTADO_TOTAL` | `cargoService.ts:4-12`, `departamentoService.ts:4-11`; `cargos`=14, `departamentos`=10 | — |
| Afastamentos (listar/CID/config/prorrogação) | `IMPLEMENTADO_PARCIAL` | `afastamentoService.ts:28-241`; `afastamentos`=1, `cid10`=6, `config_afastamentos`=6, `prorrogacoes_afastamento`=0 | Upload de documento quebrado (bucket inexistente — Achado 1) |
| Afastamentos — upload de atestado | `SUGERIDO_OU_INICIADO` | `afastamentoService.ts:125-127` → `storage.from('afastamentos')`; `storage.buckets` = 0 linhas | Bucket `afastamentos` não existe |
| Admissões | `IMPLEMENTADO_TOTAL` | `admissaoService.ts:18-41`; `admissoes`=8 | — |
| Admissão — link/token do candidato | `SUGERIDO_OU_INICIADO` | `contratacaoService.ts:123-143`; `admissao_tokens`=0 | Nunca usado em produção |
| Admissão — **transmissão eSocial** | `IMPLEMENTADO_PARCIAL` (dado fictício) | `contratacaoService.ts:187-193`: `setTimeout(2000)` + `esocial_protocol: PROTO-${Math.random()...}` | Não chama eSocial. Grava protocolo falso em `metadata` e audita `status:'sucesso'` (Achado 6) |
| Desligamentos | `IMPLEMENTADO_TOTAL` | `desligamentoService.ts:11-98`; `desligamentos`=2 | — |
| Férias — listar/aprovar/cancelar | `IMPLEMENTADO_TOTAL` | `feriasService.ts:40-219`; `ferias`=12, `periodos_aquisitivos`=12 | — |
| Férias — paginação por cursor | `IMPLEMENTADO_PARCIAL` | `feriasService.ts:90` usa `Buffer.from(...)`; nenhum polyfill em `vite.config.ts` | `ReferenceError: Buffer is not defined` no browser quando `hasMore` (>20 registros). Latente: hoje só há 12 |
| Férias — "sincronizar com Hub" | `MORTO_OU_ABANDONADO` (fachada) | `feriasService.ts:101-114`: faz `select id limit 1` e devolve `recordsUpdated: 0` fixo; consumido em `FeriasPage.tsx:66,92` | Não existe hub nenhum |
| Folha — cabeçalhos (`folhaService`) | `IMPLEMENTADO_TOTAL` | `folhaService.ts:30-56`; `folhas_pagamento`=4 | — |
| Folha — **cálculo em lote** | `MORTO_OU_ABANDONADO` | `folha/calculoLoteService.ts:61` embed `contratos:contratos_trabalho(...)` → tabela **não existe**; `:244` `upsert(onConflict:'folha_id,colaborador_id')` sem índice único | Duas falhas fatais independentes (Achado 2). Os 12 `folha_itens` vieram por outro caminho (edge `calcular-folha`) |
| Folha — provisões 13º/férias | `MORTO_OU_ABANDONADO` | `folha/provisoesService.ts:81` `onConflict:'empresa_id,colaborador_id,competencia'`; `pg_indexes` em `provisoes_folha` só tem `provisoes_folha_pkey(id)` | `provisoes_folha`=0. `upsert` erra 42P10 sempre. A função pura `calcularProvisaoColaborador` (:33-48) está correta |
| Folha — holerite (dados) | `IMPLEMENTADO_PARCIAL` | `folhaPagamentoService.ts:24-82`; `folha_itens`=12, `holerites`=**0** | Nunca gerou holerite persistido |
| Folha — assinatura de holerite | `SUGERIDO_OU_INICIADO` | `folhaPagamentoService.ts:94-126`; `holerites`=0 | Depende do trigger `enforce_holerite_signed_hash`; sem uso real |
| Folha — fechar/reabrir | `IMPLEMENTADO_PARCIAL` | `folhaPagamentoService.ts:139-252` → edge `fechar-folha`/`reabrir-folha` | Deploy das edge functions `NAO_VERIFICADO` (sem PAT) |
| Folha — **emitir PDF** | `MORTO_OU_ABANDONADO` (mock) | `folhaPagamentoService.ts:254-259`: `setTimeout(1500)` + URL fixa `https://storage.lovable.dev/holerites/holerite_${folhaId}.pdf`; consumido em `CalculoFolhaWizard.tsx:357` | Link morto entregue ao usuário (Achado 6) |
| CNAB 240 (remessa bancária) | `MORTO_OU_ABANDONADO` | `cnabService.ts:145,161,184,280` usam `folha_id` e `arquivo_remessa` em `cnab_remessas`; colunas reais: `arquivo_url`, `hash_integridade` — **`folha_id` e `arquivo_remessa` não existem** | O `insert` com `folha_id` (:184) erra 42703 → `throw` em :193. Nunca gera arquivo (Achado 3) |
| CNAB 400 | `MORTO_OU_ABANDONADO` | `cnabService.ts:562-578` header soma **399** chars → `:580-581` lança sempre; trailer em `:676` soma **416** chars e é truncado em `:678` | Aritmética de layout errada; código inalcançável além do header |
| CNAB — parse do arquivo de retorno | `MORTO_OU_ABANDONADO` (silencioso) | `cnabService.ts:309,324` filtram `cnab_itens.empresa_id` — coluna **não existe**; `error` é descartado em `:306` → `item` sempre `null` | Retorna sempre `{sucesso:0, erro:0, detalhes:[]}` sem erro. `cnab_itens`=0 (Achado 4) |
| CNAB — lote PIX (CSV) | `SUGERIDO_OU_INICIADO` | `cnabService.ts:347-381`; `pix_lotes`=2, `contas_bancarias`=12 | Só monta CSV em memória; não persiste em `pix_lotes` |
| `cnabLayoutService` | `MORTO_OU_ABANDONADO` | `cnabLayoutService.ts:3-11` delega a `cnabService.generateCNAB240`; único importador é `__tests__/cnabLayoutService.test.ts:2` | Wrapper órfão sobre função que sempre falha |
| Benefícios — catálogo | `IMPLEMENTADO_TOTAL` | `beneficioService.ts:18-33`; `beneficios`=8 | — |
| Benefícios — **vínculo colaborador↔benefício** | `MORTO_OU_ABANDONADO` | Todo o código usa `beneficios_colaborador` (**0 linhas**, FK → `tipos_beneficio` que também está vazia). Os **74 vínculos reais** estão em `beneficios_colaboradores` (plural, FK → `beneficios`), que **nenhum arquivo do repo referencia** (grep em `src` e `supabase/functions`: 0 ocorrências) | Split-brain de tabela (Achado 5) |
| Benefícios — `listComAdesao` | `MORTO_OU_ABANDONADO` | `beneficioService.ts:37-39` embed `beneficios_colaborador(count)` a partir de `beneficios`; `pg_constraint`: **não há FK** entre as duas | PostgREST PGRST200 garantido |
| Benefícios — VT / VA / plano de saúde / seguro de vida | `MORTO_OU_ABANDONADO` | `calculoBeneficiosService.ts:66-68,143-147,156-158,199-203`: colunas inexistentes (`beneficio_id`, `mes_referencia`, `valor_coparticipacao`, `dependente_id`) e embeds sem FK | Todos os cálculos de benefício erram 42703/PGRST200 (Achado 5) |
| Dependentes (IRRF / salário-família) | `MORTO_OU_ABANDONADO` | `colaboradorDetalhesService.ts:16,34,40` e `calculoBeneficiosService.ts:223` filtram `dependentes.empresa_id` — coluna **não existe** | `dependentes`=0. Listar/atualizar/excluir sempre erram |
| Contatos de emergência | `IMPLEMENTADO_PARCIAL` (stub) | `colaboradorDetalhesService.ts:47-49`: `return []` com comentário "Tabela ... não encontrada no cache" — mas `contatos_emergencia` **existe** | `criarContatoEmergencia` (:51) grava; a listagem nunca mostra. Fio cortado |
| Documentos do colaborador | `MORTO_OU_ABANDONADO` | `documentoService.ts:25` filtra `documentos.empresa_id` — coluna **não existe**; `DocumentosPage.tsx:87` e `PortalDocumentosTab.tsx:94` chamam `excluir(id)` sem `empresaId` → `baseService.ts:160-161` lança | `documentos`=0 |
| Banco de horas (saldo/registro) | `IMPLEMENTADO_TOTAL` | `bancoHorasService.ts:5-43`; `banco_horas`=25 | — |
| Config banco de horas | `SUGERIDO_OU_INICIADO` | `bancoHorasConfigService.ts:5-21`; `banco_horas_config`=0 | Nunca configurado |
| Batidas de ponto | `SUGERIDO_OU_INICIADO` | `batidasPontoService.ts:11-70`; `batidas_ponto`=**0** (os 120 registros estão em `registros_ponto`, outra tabela) | Módulo paralelo sem uso |
| Fechamento de período de ponto | `MORTO_OU_ABANDONADO` | `batidasPontoService.ts:74` insere `empresa_id` em `periodos_ponto` — coluna **não existe** | `periodos_ponto`=0. Insert erra 42703 |
| Faltas | `SUGERIDO_OU_INICIADO` | `faltasService.ts:3-55`; `faltas`=0 | Tabela vazia |
| Contratos (CRUD simples) | `SUGERIDO_OU_INICIADO` | `contratoService.ts:3-54`; `contratos`=0 | Tabela vazia |
| Templates de contrato + token de assinatura | `IMPLEMENTADO_PARCIAL` | `contratoTemplateService.ts:59-201`; RPCs `contrato_gerar_token_assinatura`/`contrato_revogar_token`/`contrato_estender_expiracao` **existem**; `contrato_templates`=5 | `contratos_gerados`=0, `contrato_token_eventos`=0; `downloadUrl` (:134) usa bucket `contratos-trabalho` inexistente |
| Contabilidade (lançamentos / plano de contas / SPED) | `IMPLEMENTADO_PARCIAL` | `contabilidadeService.ts:4-98`; `lancamentos_contabeis`=5, `plano_contas`=23 | `exportarSPED` (:81-98) emite literais `\|0000\|LECD\|...\|` e `\|...\|` como placeholders — arquivo não é SPED válido |
| Canal com a contabilidade | `IMPLEMENTADO_PARCIAL` | `canalContabilidadeService.ts:14-144`; `contabilidade_threads`=3, `contabilidade_mensagens`=5, `contabilidade_contatos`=3 | `uploadAnexo` (:130) usa bucket `contabilidade-anexos` inexistente |
| Despesas / reembolsos | `IMPLEMENTADO_PARCIAL` | `despesaService.ts:8-107`; RPCs `aprovar_despesa`/`rejeitar_despesa` existem; `despesas`=8, `despesas_aprovacoes_log`=8 | `uploadComprovante` (:86) usa bucket `comprovantes-despesas` inexistente |
| EPIs / entregas | `IMPLEMENTADO_TOTAL` | `episService.ts:16-96`; `epis`=8, `epis_entregas`=8 | — |
| Auditoria (via RPC) | `IMPLEMENTADO_TOTAL` | `auditoriaService.ts:34-73`; RPCs `listar_auditoria`/`registrar_auditoria` existem; `audit_log`=281 | — |
| Notificações in-app | `SUGERIDO_OU_INICIADO` | `auditoriaService.ts:77-100`; `notificacoes`=0 | Ninguém nunca gerou notificação |
| Avaliação de desempenho (ciclos/metas/PDI/360/competências) | `IMPLEMENTADO_PARCIAL` | `avaliacaoService.ts:5-107`; `ciclos_avaliacao`=2, `metas_okrs`=0, `pdi_plano_desenvolvimento`=0, `feedbacks_360`=0, `competencias_config`=0 | Só o ciclo existe; nenhum conteúdo |
| Treinamentos / trilhas / inscrições | `IMPLEMENTADO_PARCIAL` | `catalogoCursoService.ts:6-151`; `catalogo_cursos`=3, `trilhas_aprendizado`=2, `trilhas_cursos`=2, `inscricoes_cursos`=2, `treinamento_certificados`=1 | Volumes de vitrine |
| Comunicados / canal de ética | `SUGERIDO_OU_INICIADO` | `comunicacaoService.ts:3-68`; `comunicados`=0, `canal_etica`=0 | Tabelas vazias |
| Controle de acesso (catracas) | `SUGERIDO_OU_INICIADO` | `controleAcessoService.ts:2-27`; `controle_acesso`=0 | Tabela vazia |
| eSocial (eventos/config/certificados) | `SUGERIDO_OU_INICIADO` | `esocialService.ts:48-348`; `esocial_eventos`=**0**, `configuracoes_esocial`=0, `certificados_digitais`=0, `esocial_transmissao_logs`=0 | Código coerente, zero uso. Deploy de `enviar-esocial` `NAO_VERIFICADO` |
| Assistente IA | `SUGERIDO_OU_INICIADO` | `assistenteIAService.ts:88-257`; consumido por `AssistenteIAPage.tsx:49,73`; edge `assistente-ia` existe no repo | Sem tabela de histórico; deploy `NAO_VERIFICADO` |
| Automações (aniversário/ASO/experiência) | `MORTO_OU_ABANDONADO` | `automacaoService.ts:14-131`; único importador é `__tests__/automacaoService.test.ts:28` | Nenhuma página/cron chama `processarAutomacoes` |
| Backup CSV/JSON | `IMPLEMENTADO_PARCIAL` | `backupService.ts:14-25`: `BACKUP_TABLES` inclui `'folha_pagamento'` (**tabela não existe**; a real é `folhas_pagamento`) e é engolida por `Promise.allSettled` em :52 | Backup omite a folha silenciosamente e reporta sucesso (Achado 7) |
| Exportação CSV/PDF (ponto, Portaria 671) | `IMPLEMENTADO_PARCIAL` | `exportService.ts:88` imprime `'CONFORME (MTP 671)'` fixo; `:128` imprime "Documento assinado digitalmente conforme MP 2.200-2/2001" sem assinatura | Selo de conformidade fabricado (Achado 6) |
| Gateway de edge functions | `IMPLEMENTADO_PARCIAL` | `edgeFunctionsService.ts:33-193`, 26 funções; 17 importadores | Deploy de todas `NAO_VERIFICADO` (Management API sem PAT) |
| `authService` (forgot/reset/getSession) | `MORTO_OU_ABANDONADO` | `authService.ts:5-54`; exportado em `index.ts:2`, mas nenhum consumidor de app importa `authService` (só `__tests__/authService.test.ts:20`) | Login real usa outro caminho |
| `dominioService` (CBO/CNAE/IRRF/INSS via edge `tabelas-dominio`) | `MORTO_OU_ABANDONADO` | `dominioService.ts:60-162`; grep por `dominioService` em `src`+`e2e`+`supabase`+`scripts`: **0 importadores** | Nenhum chamador |
| `dominioAlterdataService` (ERP Domínio/Alterdata) | `MORTO_OU_ABANDONADO` | `dominioAlterdataService.ts:87-320`, 387 linhas; grep: **0 ocorrências no repo inteiro** | Nunca integrado; exporta um `const dominioService` que colide com o outro arquivo (Achado 8) |
| `encryptionService` (validação/máscara de CPF/CNPJ) | `MORTO_OU_ABANDONADO` + stub | `encryptionService.ts:61-70`: `validateCNPJ` retorna `true` sem checar dígito ("implementação completa omitida"); grep: **0 importadores**; a implementação viva é `src/lib/masks.ts` | Duplicata abandonada com validação falsa |
| `fgtsService` | `MORTO_OU_ABANDONADO` | `index.ts:48`: `{ calcular: (salario) => salario * 0.08 }` inline; nenhum consumidor | Alíquota hardcoded, sem chamador |

---

## 3. Achados graves

### 1. [CRÍTICA] Nenhum bucket de Storage existe em produção — todo upload/download falha
`select count(*) from storage.buckets` → **0** (e `storage.objects` → 0), consultado como `postgres` com
`has_table_privilege = true`. Os services em escopo referenciam 5 buckets:
`afastamentos` (`afastamentoService.ts:126,131`), `comprovantes-despesas` (`despesaService.ts:86,94`),
`contabilidade-anexos` (`canalContabilidadeService.ts:10,82,88`), `contratos-trabalho`
(`contratoTemplateService.ts:134`), `documentos`/`documentos-admissao` (`edgeFunctionsService.ts:122`).
Todos retornam "Bucket not found" em runtime. Isto contradiz diretamente `CLAUDE.md`, que afirma que a
migração `20260723113000` criou o bucket `ferias-avisos` — ele não existe (consistente com o fato de que
só 30 das 641 migrations estão registradas).

### 2. [CRÍTICA] Cálculo de folha em lote é inexecutável — duas falhas fatais independentes
`src/services/folha/calculoLoteService.ts:57-62` faz embed PostgREST
`contratos:contratos_trabalho(jornada_mensal, tipo_contrato)`. A relação **`contratos_trabalho` não existe**
no schema `public` (verificado em `pg_class`, qualquer `relkind`) → PGRST200 → `colabError` é lançado em
`:66` antes de qualquer processamento.
Mesmo que se removesse o embed, `:242-244` faz
`upsert(itemData, { onConflict: 'folha_id,colaborador_id' })` em `folha_itens`, que **não possui índice
único** sobre esse par (`pg_indexes`: apenas `folha_itens_pkey(id)` e índices não-únicos) → erro 42P10.
Os 12 registros em `folha_itens` foram produzidos por outro caminho (edge function `calcular-folha`),
não por este service.

### 3. [CRÍTICA] Geração de CNAB 240 e 400 é impossível — o código escreve em colunas que não existem
`cnab_remessas` tem as colunas `id, empresa_id, banco_codigo, sequencial_arquivo, data_geracao, status,
arquivo_url, total_pagamentos, valor_total, created_at, updated_at, hash_integridade`.
O service usa **`folha_id`** (`cnabService.ts:145, 184, 420, 455`) e **`arquivo_remessa`**
(`:143, 150-151, 280, 418, 426, 692`) — nenhuma das duas existe. O `insert` de `:181-191` inclui
`folha_id` → 42703 → `throw` em `:193`. `generateCNAB240` nunca completa.
`generateCNAB400` morre ainda antes: o header montado em `:562-578` soma **399** caracteres, e `:580-581`
aborta explicitamente com `Header CNAB400: tamanho 399 ≠ 400`. O trailer em `:676` soma **416**
caracteres e seria truncado em `:678`, corrompendo soma e contagem de registros.
`cnab_itens` = 0 linhas confirma que nada jamais foi gerado.

### 4. [CRÍTICA] Baixa do retorno bancário falha em silêncio e reporta "0 erros"
`cnabService.parseRetornoCNAB` (`:288-345`) busca `cnab_itens` filtrando `.eq('empresa_id', empresaId)`
em `:309` — `cnab_itens` **não tem** coluna `empresa_id`. O destructuring de `:306` é
`const { data: item } = await ...`, **descartando `error`**. O PostgREST devolve erro, `item` fica `null`,
o `if (item)` nunca entra, e a função retorna `{ sucesso: 0, erro: 0, detalhes: [] }` **sem lançar nada**.
Do ponto de vista do operador, o arquivo de retorno do banco "foi processado com sucesso e nada mudou".
Nenhum `folha_itens.status_pagamento` é jamais atualizado.

### 5. [CRÍTICA] Split-brain de benefícios: os 74 vínculos reais estão numa tabela que o código não conhece
Existem três tabelas paralelas: `beneficios_colaborador` (**0 linhas**, FK → `tipos_beneficio`, que também
está vazia), `beneficios_colaboradores` (**74 linhas**, FK → `beneficios`, 8 linhas) e `colaborador_beneficios` (0).
Grep em `src/` + `supabase/functions/`: **`beneficios_colaboradores` (plural) tem 0 ocorrências**.
Todo o código — `beneficioService.ts:96,109,119`, `calculoBeneficiosService.ts:41,199`,
`folha/calculoLoteService.ts:139`, `hooks/useBeneficiosColaborador.ts:14,29,49`,
`supabase/functions/gerar-holerite/index.ts:111` — aponta para a tabela vazia.
Além do dado invisível, as queries em si são inválidas:
- `beneficioService.ts:37-39` embute `beneficios_colaborador(count)` a partir de `beneficios` — **não há FK** entre elas (`pg_constraint`) → PGRST200.
- `calculoBeneficiosService.ts:199-203` filtra `.eq('beneficio_id', ...)` — coluna inexistente em `beneficios_colaborador`.
- `calculoBeneficiosService.ts:143-147` seleciona `valor_coparticipacao` e filtra `mes_referencia` em `beneficiarios_plano`, cujas colunas reais são `id, plano_saude_id, colaborador_id, nome, parentesco, cpf, data_inclusao, data_exclusao, data_carencia, tipo, status, created_at`.
- `calculoBeneficiosService.ts:223` e `colaboradorDetalhesService.ts:16,34,40` filtram `dependentes.empresa_id` — coluna inexistente.
Resultado: **VT, VA, plano de saúde, seguro de vida e dependentes não calculam nada** — e o desconto de VT
é insumo direto do líquido da folha.

### 6. [ALTA] Quatro fabricações de dado apresentadas ao usuário como fato
1. `contratacaoService.ts:187-193` — "transmissão eSocial": `await new Promise(r => setTimeout(r, 2000))`,
   depois grava `metadata: { esocial_protocol: \`PROTO-${Math.random().toString(36)...}\` }` e registra
   auditoria com `status: 'sucesso'`. Nenhuma chamada ao eSocial acontece. Pior: `admissoes` **possui**
   as colunas reais `status_esocial`, `protocolo_esocial`, `data_transmissao_esocial`, que ficam nulas.
2. `folhaPagamentoService.ts:254-259` — `emitirPDF`: dorme 1500 ms e devolve
   `https://storage.lovable.dev/holerites/holerite_${folhaId}.pdf`, URL de domínio de terceiro que não
   hospeda nada deste projeto. Consumido por `CalculoFolhaWizard.tsx:357`.
3. `exportService.ts:88` imprime `'CONFORME (MTP 671)'` como "STATUS GERAL" **fixo**, independentemente do
   conteúdo; `:128` estampa em todas as páginas "Documento assinado digitalmente conforme MP 2.200-2/2001"
   sem que exista qualquer assinatura digital.
4. `feriasService.ts:101-114` — `syncWithHub` faz um `select id limit 1` e retorna
   `{ success: true, recordsUpdated: 0 }` fixo; `FeriasPage.tsx:66,92` exibe isso como sincronização.

### 7. [ALTA] Backup silenciosamente omite a folha de pagamento e reporta sucesso
`backupService.ts:18` lista `'folha_pagamento'` em `BACKUP_TABLES`. A tabela real é `folhas_pagamento`
(plural) — a singular **não existe** (`pg_class`). `fetchTableData` lança, mas `:52`/`:99` usam
`Promise.allSettled` e `:58`/`:105` só processam `status === 'fulfilled'`: a rejeição é descartada sem log.
O arquivo gerado sai sem a folha e as estatísticas de `exportarBackupCSV` ainda contam
`tabelas: targetTables.length` (:87) — reportam 10 tabelas exportadas quando foram 9.
As outras 9 entradas de `BACKUP_TABLES` existem no banco e têm `empresa_id`; o defeito é isolado
em `'folha_pagamento'` (:18).

### 8. [MÉDIA] Refactor abandonado com colisão de nome: dois "dominioService"
`src/services/dominioService.ts` (162 linhas) expõe `buscarCBO/buscarCNAE/getIRRFTable/...` via edge
function `tabelas-dominio`. `src/services/dominioAlterdataService.ts` (387 linhas) exporta
`export const dominioService = {...}` (`:87`) para o **ERP contábil Domínio**, mais `alterdataService` (`:220`).
São coisas semanticamente distintas com o mesmo nome de símbolo. Prova de morte: grep por
`dominioService` em `src`, `e2e`, `supabase`, `scripts` retorna **apenas a própria linha 87 de
`dominioAlterdataService.ts`**; grep por `dominioAlterdataService` retorna **zero linhas em todo o repo**.
Nenhum dos dois roda. `dominioAlterdataService.ts:94` inclusive se autodeclara: "Este stub implementa o fluxo real".

### 9. [MÉDIA] `encryptionService` é duplicata morta com validação de CNPJ falsa
`encryptionService.ts:61-70`: `validateCNPJ` verifica só tamanho e repetição, e o comentário admite
"(implementação completa omitida para brevidade)" antes de `return true`. Qualquer sequência de 14
dígitos não repetidos passa. Grep: **0 importadores** — a implementação viva é `src/lib/masks.ts`
(com testes em `src/lib/__tests__/masks.test.ts`) e `src/components/ui/cnpj-input.tsx:39`.
Risco: o arquivo continua exportando uma função "de validação" que qualquer refactor futuro pode religar.

### 10. [MÉDIA] Serviços cujo único chamador é o próprio teste
- `authService.ts` — reexportado em `index.ts:2`, mas nenhum consumidor de app o importa; só `__tests__/authService.test.ts:20`.
- `automacaoService.ts` — só `__tests__/automacaoService.test.ts:28`. Nenhuma página, hook ou cron dispara `processarAutomacoes`.
- `cnabLayoutService.ts` — só `__tests__/cnabLayoutService.test.ts:2`, e delega a `generateCNAB240`, que sempre falha (Achado 3).
Os três testes passam contra mocks do supabase-js, portanto **não protegem nada**: não detectariam nenhuma
das divergências de schema listadas nos Achados 2–5, porque o mock nunca valida colunas.

### 11. [MÉDIA] `BaseService` presume `empresa_id` universal — quebra editar/excluir em 3 telas
`baseService.ts:31-33` liga `requireEmpresaId` por padrão; `:129-131` e `:159-161` lançam se o chamador
não passar `empresaId`, e `:133-134`/`:164-165` acrescentam `.eq('empresa_id', ...)`.
Das tabelas usadas pelos services em escopo, **33 não têm a coluna** (`documentos`, `dependentes`,
`empresas`, `holerites`, `folha_itens`, `cnab_itens`, `periodos_ponto`, `contatos_emergencia`, entre outras).
Consequências concretas já materializadas:
- `EmpresaFormPage.tsx:77` → `empresaService.atualizar(id, data)` sem `empresaId` → **editar empresa sempre falha**.
- `DocumentosPage.tsx:87` e `PortalDocumentosTab.tsx:94` → `documentoService.excluir(doc.id)` sem `empresaId` → **excluir documento sempre falha**.
- `documentoService.ts:25` filtra `documentos.empresa_id` → **listar documentos sempre erra 42703**.

### 12. [BAIXA] `Buffer` usado em código de browser sem polyfill
`feriasService.ts:90` monta o cursor com `Buffer.from(...).toString('base64')`. Não há `define`/polyfill
de `Buffer` em `vite.config.ts`. Dispara `ReferenceError` apenas quando `hasMore === true`, ou seja, com
mais de 20 férias — hoje há 12, então a bomba está armada mas não detonou. A correção natural é `btoa`.

### 13. [BAIXA] `exportarSPED` emite placeholders literais
`contabilidadeService.ts:86-92` escreve `|0000|LECD|...|SPED CONTABIL|`, `|I250|<conta>|...|D|` e
`|9999|...|END|` — as reticências são literais no arquivo, não campos preenchidos. O resultado não é
aceito por nenhum validador SPED.

---

## 4. Lacunas (o que não consegui verificar e por quê)

1. **Deploy das Edge Functions** — `NAO_VERIFICADO`. A Management API exige PAT, indisponível. Portanto
   não posso afirmar se `assistente-ia`, `fechar-folha`, `reabrir-folha`, `enviar-esocial`,
   `gerar-contrato-pdf`, `tabelas-dominio`, `calcular-folha` etc. estão realmente publicadas. Todas
   existem como diretório em `supabase/functions/`, o que prova apenas o código-fonte.
2. **Execução real das queries** — não executei nenhuma chamada PostgREST. As falhas 42703/PGRST200/42P10
   que aponto são deduzidas de comparação entre o SQL emitido pelo service e o catálogo real
   (`pg_attribute`, `pg_constraint`, `pg_indexes`), lido ao vivo. É prova estrutural forte, mas não é
   observação de runtime.
3. **Build/typecheck/lint/testes** — `node_modules` ausente; nada foi executado. Não afirmo que qualquer
   arquivo compila. Em particular, vários services usam `as any`/`as unknown as` justamente nos pontos
   onde o schema diverge (`colaboradorDetalhesService.ts:12,34,40`, `calculoBeneficiosService.ts:40-47`,
   `cnabService.ts` inteiro via `QueryBuilderType`), o que suprime a checagem estática desses erros.
4. **RLS** — não avaliei se as policies permitem as operações. Uma consulta pode falhar por RLS mesmo
   quando colunas e FKs estão corretas; minha análise cobre só a camada estrutural.
5. **Origem dos dados existentes** — `folha_itens`=12, `cnab_remessas`=3 e `beneficios_colaboradores`=74
   existem, mas os caminhos de código em escopo não conseguem tê-los produzido. Não rastreei qual
   migration/seed/edge function os inseriu.
6. **Consumidores** — o levantamento de importadores foi por grep de símbolo em `src/` e `e2e/`,
   tolerante a `funcao<T>('x')` e a reexport via `index.ts` (barril lido integralmente). Não cobre
   `import()` dinâmico com string computada; encontrei apenas um dinâmico, literal e legítimo
   (`contratacaoService.ts:157` → `whatsappService`), fora de escopo.
