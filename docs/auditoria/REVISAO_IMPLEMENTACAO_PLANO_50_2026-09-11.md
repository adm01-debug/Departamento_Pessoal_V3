# Revisão de implementação — 50 etapas, código, GitHub e canônico

Data: 11/09/2026. Código revisado: `706e29194918521bd33eb2e6137be3f3215a324c`.
Branch: `codex/e50-execution-20260911`. Main remoto: `1dfd6d3a7f29132b23d6e2dc6f4382a4dae515e3`.
Projeto canônico: `frjbfeamybqsejlvmqbl`. Consultas de catálogo realizadas nesta revisão, aproximadamente entre 18:45 e 18:50 UTC.

## Veredito e alcance

**Não implementamos nem validamos todas as melhorias. Nenhuma das 50 etapas tem evidência suficiente para conclusão C4.** Existem correções reais no código e testes aprovados; ainda há funcionalidades incompletas, contratos incompatíveis com o banco e versões implantadas diferentes das locais.

Foram confrontados os 50 objetivos, seus critérios positivos/negativos, os 500 itens de trabalho e os 200 checkpoints com as evidências disponíveis. Isso não significa executar 700 testes: vários itens são decisões de produto, revisão, operação ou homologação. Sem evidência específica, o checkpoint permanece aberto. Esta revisão não substitui pentest, homologação de provedores, teste de carga nem auditoria jurídica dos cálculos.

O recorte da matriz abaixo usa três estados, sem converter presença de arquivos em percentual de entrega:

| Estado                                                                   | Etapas                                       | Quantidade |
| ------------------------------------------------------------------------ | -------------------------------------------- | ---------: |
| P — parcial: há artefatos ou implementação, com falha ou aceite pendente | 002–010, 012–017, 020–036, 038, 040–047, 049 |         42 |
| B — depende de configuração/evidência externa                            | 001, 037                                     |          2 |
| NE — objetivo completo não demonstrado pelas evidências localizadas      | 011, 018, 019, 039, 048, 050                 |          6 |
| C4 — concluído, validado e promovido                                     | nenhum comprovado                            |          0 |

NE não afirma que inexiste qualquer trabalho nessa área. P não significa que a funcionalidade esteja utilizável no ambiente. Os impedimentos concretos estão na matriz.

O owner já autorizou alterações no canônico com massa descartável. Portanto, **não é necessária uma nova autorização genérica para usar esse ambiente**, e a ausência de staging não deve ser apresentada como bloqueio de autorização. A exceção não comprova restauração, rollback ou operação de staging/DR, que continuam sem aceite. Nesta rodada de revisão não houve DDL, deploy, alteração de secrets, merge ou escrita de dados de negócio no canônico.

Evidências estruturadas: [snapshot JSON](REVISAO_PLANO_50_EVIDENCIAS_2026-09-11.json). Fonte dos requisitos: [plano de 50 etapas](PLANO_MELHORIAS_50_ETAPAS_2026-09-10.md). A [revisão de 10/09](REVISAO_IMPLEMENTACAO_PLANO_50_2026-09-10.md) é um snapshot histórico; seus números não devem substituir esta medição.

## 1. Achados prioritários confirmados

### R01 — P0: views e funções privilegiadas continuam expostas

O catálogo vivo contém 44 views públicas: 43 têm SELECT efetivo para `anon`; apenas duas têm `security_invoker=true`. A migration `20260911180000_p0_views_security_invoker.sql` está no branch publicado, mas não consta do ledger remoto. Não foram encontrados grants de SELECT a `PUBLIC` nas ACLs dessas views nesta consulta; isso não elimina a exposição por `anon`.

O Security Advisor confirma 42 views executadas com privilégios do proprietário e acusa `v_audit_trail` por possível exposição de `auth.users` a `anon`. Também confirma 23 funções SECURITY DEFINER executáveis por `anon`, 113 por `authenticated` e 28 funções sem search_path fixo. EXECUTE por si só não prova exploração de cada função: é necessário analisar a autorização interna e testar os papéis.

Requisito: E50-004/005/006/035. Aplicar a correção versionada, validar grants e executar cenários reais de titular, RH, colega, empresa ausente e T2. A simulação desta revisão provou a mecânica da migration em fixture PostgreSQL; não homologou as policies canônicas.

Referências do Advisor: [views com privilégios do proprietário](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view), [exposição de auth.users](https://supabase.com/docs/guides/database/database-linter?lint=0002_auth_users_exposed).

### R02 — P0: correção de autorização do holerite não chegou à Edge implantada

No código local, `supabase/functions/gerar-holerite/index.ts` chama `requireSelfOrRh`; `_shared/authz.ts` restringe o acesso ao titular ou RH/admin. No código remoto recuperado pela Management API, versão 6, a autorização ainda aceita `user_belongs_to_empresa` como condição suficiente para acessar o holerite de outra pessoa.

Isso mantém a autorização demasiadamente ampla dentro da mesma empresa. É evidência do caminho no source implantado, não relato de exploração com dados reais nesta rodada.

Há uma dependência adicional: `pode_gerir_rh_para`, usada pelo helper local, está entre as RPCs tipadas ausentes no catálogo canônico. **Implantar apenas a Edge endurecida pode negar acesso ao RH legítimo**, pois o helper falha fechado quando a RPC não existe. Restaurar e testar o contrato SQL antes do deploy que depende dele; validar titular/RH/colega/T2 depois.

Requisito: E50-013/023/027/030/031. Esse é um caso concreto em que código corrigido, banco preparado e função publicada precisam ser promovidos em ordem.

### R03 — P0/P1: Auth continua dependendo de RPCs ausentes

`auth-login/index.ts:87` chama `check_account_lockout`; a tentativa é registrada por `record_login_attempt`, na linha 129. Ambas estão ausentes no canônico. O código local registra a falha do lockout e continua a autenticação; o registro da tentativa é assíncrono. `edge_rate_limit_check` também está ausente. A RPC legada `reset_login_attempts` continua executável por `anon`.

Existirem `check_login_lock` e `record_failed_login` não satisfaz o contrato dos nomes usados pelo caller atual. Requisito: E50-008/013/022. Testar bloqueio, expiração, recuperação, corrida e bypass pelo endpoint direto de Auth, preservando disponibilidade sem mascarar degradação.

### R04 — P1: erros de contrato nos cálculos de folha e provisões

| Caller atual                                     | Contrato exigido pelo código                                           | Estado físico confirmado                             | Consequência                                     |
| ------------------------------------------------ | ---------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------ |
| `src/services/folha/calculoLoteService.ts:61`    | relacionamento `contratos:contratos_trabalho(...)`                     | `public.contratos_trabalho` ausente                  | consulta do lote não tem a relação requerida     |
| `supabase/functions/calcular-folha/index.ts:290` | upsert por `empresa_id,competencia`                                    | UNIQUE existente é `(empresa_id,competencia,tipo)`   | alvo de conflito sem índice único correspondente |
| `src/services/folha/calculoLoteService.ts:244`   | upsert `folha_itens` por `(folha_id,colaborador_id)`                   | único índice UNIQUE encontrado é a PK `(id)`         | persistência por upsert não satisfaz o contrato  |
| `src/services/folha/provisoesService.ts:81`      | upsert `provisoes_folha` por `(empresa_id,colaborador_id,competencia)` | tabela existe, mas único índice UNIQUE é a PK `(id)` | processamento pode falhar ao persistir           |

A inspeção conferiu índices únicos além das constraints, para não confundir ausência de constraint nomeada com ausência de arbiter válido. As falhas foram identificadas por confronto de caller e catálogo, sem lançar processamento financeiro no canônico.

Requisito: E50-020/021/024/036. Decidir a chave de negócio, sanear duplicados sintéticos, versionar constraints e testar transação, retry, fechamento e concorrência.

### R05 — P1: selagem, constraints e cron ainda incompletos

Há 12 CHECKs NOT VALID e a tabela `audit_log_unified_archive` segue sem PK. Em `folhas_pagamento`, os triggers `trigger_alerta_divergencia` e `trigger_gerar_provisao` estão desabilitados.

Foram encontrados 13 nomes `enforce*hash`: dez com search_path somente `public`, um sem configuração fixa e dois com `public, extensions`. A consulta sintética `digest(...)` sob `search_path=public` falhou novamente com SQLSTATE `42883`. Isso reproduz a dependência quebrada, mas não equivale à execução de todos os corpos de triggers nem prova que todos eles falham pelo mesmo motivo.

**Execução posterior à revisão:** foi criada a migration progressiva `20260911190000_p0_hash_trigger_search_path.sql`. Ela exige `pgcrypto` no schema `extensions`, exige os 13 gatilhos esperados e fixa `public, extensions, pg_catalog`; portanto não mascara drift parcial. Em PostgreSQL 17 descartável, a suíte reproduziu a falha antes da migration, exerceu os 13 gatilhos após duas aplicações e confirmou falha explícita quando a extensão ou uma função esperada estão ausentes. A aplicação e o smoke no canônico continuam pendentes de acesso de migration, logo esta evidência não é uma certificação remota.

O cron possui **50 jobs ativos**, não 7. Os três jobs `sec-audit-policies-daily`, `sec-policy-regressions-purge` e `sec-verify-seals-weekly` existem, mas apontam respectivamente para funções ausentes: `sec_audit_policies_scan`, `sec_policy_regressions_purge` e `sec_verify_seals_scan`.

Há oito grupos com comandos textualmente idênticos agendados sob nomes distintos. Um grupo executa a checagem de anomalias de idempotência quatro vezes em cadências diferentes. Isso exige análise de intenção, custo e idempotência; não autoriza apagar todos os duplicados automaticamente.

Requisito: E50-007/016/017/029/045. O plano foi atualizado para tratar jobs existentes com alvos quebrados, evitando criar novos agendamentos duplicados.

### R06 — P1: observabilidade corrigida localmente, mas remota e funcionalmente incompleta

A versão 1 de `metrics` implantada usa `error_count_1h / avg_p95_ms`. O código local passou a usar `calculateErrorRate(erros, consultas)` e sinalizar falhas de coleta. A correção **não está implantada**.

Persistem dois gaps no código local: `overall_status` considera apenas banco e telemetria, desconsiderando `brOk`; e a consulta de `health_checks` não testa uma operação efetiva do bridge. A coleta usa `mv_telemetry_dashboard`, que não existe no canônico. Após deploy, a sinalização 503 dessa ausência seria correta, porém ainda não representaria uma operação recuperada.

Requisito: E50-013/030/045. Corrigir/preparar dependências, validar indisponibilidade real do bridge, scrape, alerta e recuperação. A média de P95s também não deve ser tratada como P95 global sem definir a agregação.

### R07 — P1: os testes atuais permitem conclusões de segurança falsas

O CI do SHA revisado registra **462 arquivos aprovados, 1 pulado; 4.857 testes aprovados, 9 pulados**. Cobertura: statements 60,90%, branches 56,12%, funções 53,72%, linhas 65,20%. Não há base para declarar a meta de cobertura crítica cumprida apenas com o total de testes.

`src/tests/rpc-permissions.test.ts:23` desativa os testes de backend quando `CI` ou `GITHUB_ACTIONS` existe, mesmo que as credenciais estejam presentes. Os testes RPC aceitam mensagens contendo `egress`/`not found`; nos testes de tabela, qualquer `error` evita a asserção de ausência de linhas. Assim, indisponibilidade, objeto ausente ou falha de consulta podem ser confundidos com negação correta de autorização.

O job Edge Functions passou, mas os logs registram **54 funções não-bridge com erro de typecheck**, sob `continue-on-error: true`. O verde certifica somente os passos bloqueantes, não a correção de todas as Edge Functions.

`test:rebaseline` foi adicionado a `ci:verify`, mas nenhuma workflow atual chama `ci:verify` ou `test:rebaseline`. O teste existe e passa localmente; ainda falta execução obrigatória em CI. `test:migrations` também não está ligado às workflows inspecionadas.

Requisito: E50-031/033/034/035/041/047. Separar disponibilidade de negação, exigir códigos/estado esperados e executar os testes de segurança num job com backend acessível; reduzir a tolerância de typecheck com estratégia incremental rastreável.

## 2. Sincronização e contratos físicos

| Camada                             | Resultado desta revisão                                                | Limite da conclusão                                                                          |
| ---------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Working tree versus branch remoto  | HEAD e `origin/codex/e50-execution-20260911` coincidem em `706e29194`  | `AUDIT_REPORT.pdf` é alteração local preexistente                                            |
| Main versus branch de trabalho     | main permanece em `1dfd6d3a7`; PR #100 aberto/BLOCKED                  | publicado no branch não significa integrado na main                                          |
| Vercel                             | status de deploy do PR aprovado                                        | preview aprovado não demonstra promoção à produção nem schema atualizado                     |
| Migrations                         | 645 arquivos, 641 versões únicas; 362 registros remotos                | comparação de versões não prova equivalência física                                          |
| Diferença de versões               | 16 em comum; 625 só locais; 346 só remotas                             | não executar repair em massa para igualar listas                                             |
| Versões locais duplicadas          | `20260724120000`, `20260724130000`, `20260724140000`, `20260818000000` | requer decisão versionada sobre o histórico                                                  |
| Tabelas                            | 363 incluindo tabela particionada; 17 live-only e 7 type-only          | nomes não validam colunas/tipos/constraints                                                  |
| Funções                            | 26 nomes tipados sem objeto correspondente no canônico                 | 159 nomes live-only incluem triggers; não são automaticamente 159 RPCs faltantes no frontend |
| Edge Functions                     | 60 locais, 59 remotas; `metabase-embed` ausente remotamente            | caller, segredos e health ainda precisam ser validados                                       |
| Comparação dos entrypoints remotos | 56 diferentes, 3 idênticos após normalizar CRLF/final de arquivo       | comparação textual não distingue automaticamente mudança semântica de formatação             |

Os três entrypoints idênticos são `auth-gov-br`, `healthcheck` e `tabelas-dominio`. A igualdade não certifica seus arquivos compartilhados, configuração, secrets ou comportamento. O JSON anexo enumera todas as 59 comparações, versões e resultados; nenhum corpo de função com configuração sensível foi copiado para o relatório.

As cinco tabelas PCS (`pcs_planos`, `pcs_fatores`, `pcs_grades`, `pcs_avaliacoes_cargo`, `pcs_pesquisa_salarial`) continuam ausentes. As outras duas tabelas type-only são `sec_policy_regressions` e `sec_seal_events`.

O Storage tem 18 buckets: 17 privados e `avatars` público. Falta `backups`; vários buckets têm `file_size_limit` e/ou MIME nulos, inclusive `avatars`. Isso corrige o número histórico de 4/19, mas ainda não satisfaz upload/download/remoção autorizados e negativos dos 19 contratos.

## 3. Matriz completa das 50 etapas

Evidência desta rodada: **L** = source/config local; **DB** = consulta remota; **CI** = run do SHA; **SIM** = simulação sintética; **H** = evidência histórica, não reexecutada integralmente; **DOC** = busca documental. Cada linha registra o impedimento de conclusão, não uma promessa de que os demais checkpoints já passaram.

| Etapa                             | Estado | Evidência e trabalho ainda necessário                                                                                                                                                                                    |
| --------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| E50-001 — Credenciais             | B      | Exposições estão documentadas; não há atestado de revogação/rotação e atualização de todos os consumidores. Exigir evidência sem revelar valores.                                                                        |
| E50-002 — Recuperação             | P      | L/H: export, baseline e runbook existem; `backupService` ainda pode omitir tabelas com erro. Comprovar recuperação do estado atual e dos objetos/configs necessários.                                                    |
| E50-003 — Canônico/Git            | P      | L/DB/CI: auditor canônico passa e ref é frjb; branch está publicado. PR #100 ainda não integrado; comprovar promoção e smoke do destino.                                                                                 |
| E50-004 — Views                   | P      | DB/SIM: 43 grants anon/42 owner views persistem; migration local passa fixture de 42 views. Aplicação remota e matriz real faltam (R01).                                                                                 |
| E50-005 — SECURITY DEFINER        | P      | DB: 23 funções anon-executable, 113 authenticated. SQL de remediação existe; autorização interna por overload ainda precisa passar no destino.                                                                           |
| E50-006 — RLS/ACL                 | P      | DB: 55 policies públicas com qual true; migrations corretivas existem. Nem toda policy true é vulnerável isoladamente; falta classificar papel/tabela/operação e testar T1/T2.                                           |
| E50-007 — Hashes/triggers         | P      | DB: digest sob public falha; dois triggers de folha desabilitados. Corrigir resolução e testar adulteração e efeitos dos triggers (R05).                                                                                 |
| E50-008 — Lockout/rate limit      | P      | L/DB: nomes RPC do caller não existem e reset legado é público. Completar contrato atômico e testes de bypass (R03).                                                                                                     |
| E50-009 — Manifest físico         | P      | L/DB: inventários, hashes e snapshot atual existem. Falta manifest completo determinístico e obrigatório por promoção, com teste de alteração fora de migration.                                                         |
| E50-010 — Drift técnico/funcional | P      | L/DB: diferenças de versões/tabelas/RPCs e 59 entrypoints foram confrontadas. Faltam decisões e responsáveis por cada divergência, stub e capacidade órfã.                                                               |
| E50-011 — ADR baseline            | NE     | DOC: sete ADRs gerais localizados; não localizada decisão completa de corte, squash, preservação do histórico e promoção aprovada. Formalizar e reproduzir.                                                              |
| E50-012 — Baseline                | P      | L/SIM: gerador inclui cinco camadas; teste detecta omissão/ordem e paridade com 42 views. Falta restauração integral atual; teste ainda não é gate de workflow (R07).                                                    |
| E50-013 — RPCs/tabelas            | P      | DB: 26 nomes de funções tipadas ausentes, incluindo Auth e helpers RH. Preparar dependências antes de promover callers (R02/R03).                                                                                        |
| E50-014 — PCS                     | P      | L/DB: service/UI/tipos existem, cinco tabelas e RPCs correspondentes ausentes. Completar cálculo server-side e permissões ou retirar/desabilitar explicitamente o recurso.                                               |
| E50-015 — Storage                 | P      | DB: 18/19, falta backups, contratos MIME/tamanho incompletos. Testar todos os buckets, owner, tenant, bytes reais e URLs assinadas.                                                                                      |
| E50-016 — Cron                    | P      | DB: 50 jobs ativos, oito grupos de comandos repetidos, três jobs de segurança com alvo ausente. Reconciliar, testar e observar execução real; não recriar cegamente (R05).                                               |
| E50-017 — Constraints/triggers    | P      | DB: 12 CHECKs não validados, archive sem PK e triggers desabilitados. Sanear fixtures e validar invariantes/transições; confrontar triggers redundantes.                                                                 |
| E50-018 — Índices                 | NE     | H: inventário de FKs/grupos duplicados existe, sem rebenchmark atual. Não encontrada prova de decisões por workload e EXPLAIN antes/depois.                                                                              |
| E50-019 — Restore/ledger          | NE     | H/DB: replay histórico falhou na 529ª; drift permanece. Nenhuma prova nova de duas restaurações equivalentes nem reconciliação do ledger concluída.                                                                      |
| E50-020 — Tipos/contratos         | P      | L/DB/CI: typecheck passa, porém 7 tabelas e 26 nomes de funções tipadas não existem no catálogo. Regenerar após schema aprovado e validar colunas/assinaturas, além dos nomes.                                           |
| E50-021 — Acesso a dados          | P      | L: services e selects mínimos coexistem com acesso direto, any e erros convertidos em listas vazias. Consolidar domínio/repository e contrato de erro (R04).                                                             |
| E50-022 — Sessão/MFA              | P      | L/CI: guards, setup e sessão existem. Login usa contrato incompleto; E2E não executou. Validar AAL2, refresh, logout, recovery e abas concorrentes.                                                                      |
| E50-023 — RBAC/ABAC               | P      | L/DB: requireSelfOrRh existe localmente, remoto ainda aceita colega de empresa. Completar helpers server-owned e negativos por papel (R02).                                                                              |
| E50-024 — Folha                   | P      | L/DB: engines/testes existem; quatro incompatibilidades de persistência/relacionamento foram confirmadas. Consolidar engine e transações/golden cases (R04).                                                             |
| E50-025 — Ponto                   | P      | L/H: offline/idempotência/selagem têm implementações. E2E autenticado, vínculo e validação antifraude real pendentes; hash em caminho crítico ainda exige correção.                                                      |
| E50-026 — Férias/benefícios       | P      | L/DB: contatos de emergência agora consultam tabela; ferias-avisos existe. syncWithHub faz só SELECT; duas tabelas de benefícios coexistem; jornadas ainda incompletas.                                                  |
| E50-027 — Contratos/assinaturas   | P      | L: PDFs, tokens e guards existem. Não comprovada jornada assinada até pagamento, negação de replay e distribuição; autorização remota do holerite continua ampla.                                                        |
| E50-028 — Integrações             | P      | L: eSocial simulado ou sem transporte produtivo; PIX/FGTS/DCTF não comprovam liquidação/transmissão externa. Exigir homologação ou desativação explícita; não classificar CRUD como integração concluída.                |
| E50-029 — SST/LGPD                | P      | L/DB: tabelas/UI existem; sec_* e drenagem LGPD têm objetos ausentes, jobs inválidos e selagem com dependências quebradas. Testar ciência, retenção e acesso médico.                                                     |
| E50-030 — Deploy Edge             | P      | DB/L: 59 entrypoints comparados, 56 distintos e um local não implantado. Falta manifest completo de dependências/config/callers e gate permanente de promoção.                                                           |
| E50-031 — Segurança Edge          | P      | L/CI: middleware/bridge/testes existem. 54 typechecks informativos falham; segurança implantada diverge. Validar método, JWT, CSRF, origem, tamanho, tenant e papel de cada função.                                      |
| E50-032 — Validação/uploads       | P      | L/DB: schemas e limites existem parcialmente. MIME/tamanho incompletos nos buckets e ausência de ensaio de magic bytes/quarentena/ZIP bomb impedem aceite.                                                               |
| E50-033 — Unitários por risco     | P      | CI: 4.857 aprovados/9 pulados e branches 56,12%; não há prova de cobertura ≥80% dos riscos críticos ou mutation testing seletivo. Corrigir testes de segurança permissivos (R07).                                        |
| E50-034 — Integração real         | P      | SIM: três migrations antigas passam duas vezes/28 asserts; nova P0 passa fixture PostgreSQL. Isso não restaura Auth/PostgREST/Storage e baseline integrais.                                                              |
| E50-035 — Matriz RLS              | P      | DB/L/SIM: sete contratos fail-closed passam; gate DB sem conexão reprova. Matriz de todos os papéis/CRUD/T2 não comprovada; testes RPC atuais aceitam erros indevidos.                                                   |
| E50-036 — Concorrência            | P      | L/H: idempotência/lock existem. Não comprovada carga real de folha/ponto/CNAB/PIX/webhooks; upserts sem UNIQUE e cron repetido ampliam o risco.                                                                          |
| E50-037 — E2E                     | B      | CI/L: faltam quatro secrets; job aborta antes dos testes. Descoberta lista 71 testes/24 arquivos, mas duas specs na raiz não são selecionadas. Provisionar identidades sintéticas e rodar todas as jornadas necessárias. |
| E50-038 — Supply chain            | P      | CI: CodeQL/Audit aprovados no SHA, sharp corrigido em main. Isso não comprova rotação de secrets, SBOM/licenças ou integridade dos bundles Edge implantados.                                                             |
| E50-039 — Threat model/pentest    | NE     | DOC: não localizado laudo atual que demonstre cobertura e correção das cadeias de ataque previstas. A revisão de catálogo/source não substitui teste autenticado.                                                        |
| E50-040 — Arquitetura             | P      | L/grafo: caminhos de backup/folha/serviços localizados; código paralelo e wrappers persistem. Não houve recertificação completa de ciclos/clones/boundaries neste turno.                                                 |
| E50-041 — Tipos/lint              | P      | CI/L: app/testes/E2E typecheck passam; lint admite 18 warnings e não cobre integralmente Edge/testes. 54 Edge Functions apresentam erro. Criar ratchet e eliminar supressões arriscadas.                                 |
| E50-042 — Bundle/PWA/mobile       | P      | L/CI/H: build passou; há lazy/PWA e esqueleto Capacitor. Não foi obtida prova nova de budgets de navegação, dispositivos e entrega Android/iOS.                                                                          |
| E50-043 — Queries                 | P      | L: cursor/selects mínimos existem, mas ainda há SELECT amplo e erro mascarado; faltam workload, EXPLAIN e P95. Buffer.from no cursor de férias exige validação no navegador.                                             |
| E50-044 — Logs/PII                | P      | L: logger evita RPC remota sem sessão. AuthContext ainda envia email e logger captura URL completa/user-agent; redator central e testes de token/PII faltam.                                                             |
| E50-045 — Métricas/health         | P      | L/DB: matemática corrigida localmente, remota antiga; MV requerida ausente; overall ignora brOk. Validar coleta, falha real, recuperação e alertas (R06).                                                                |
| E50-046 — Acessibilidade          | P      | L/H: componentes e testes dispersos existem. Nenhuma certificação atual por teclado, leitor, contraste, zoom e mobile foi produzida.                                                                                     |
| E50-047 — CI/proteção             | P      | CI: ruleset ativo; DB/E2E falham por secrets. Instalação usa npm install; 54 Edge erros tolerados; gates rebaseline não ligados; E2E/build não são required checks e existe bypass permanente.                           |
| E50-048 — Staging/DR              | NE     | DOC: uso direto do canônico autorizado. Não comprovados staging isolado, promoção por digest, PITR/restore atual ou game day; requisito de DR não pode ser marcado concluído.                                            |
| E50-049 — Documentação            | P      | DOC: plano, revisão e evidências atualizados. Persistem snapshots contraditórios e lacunas de catálogo de capacidades/ownership/governança. Esta revisão corrige fatos sem declarar os documentos restantes completos.   |
| E50-050 — Go-live                 | NE     | DB/CI: P0s, drift e E2E pendentes impedem recertificação. A nota 4,11/10 é histórica; esta rodada não calculou nova nota nem aprovou produção.                                                                           |

## 4. Funcionalidades sugeridas ou parcialmente implementadas

| Capacidade                                                        | Evidência observada                                                                                                                                    | Classificação e próximo aceite                                                                                                                        |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sincronização de férias com hub                                   | `feriasService.ts:101` faz SELECT de um ID e retorna success/recordsUpdated=0; `FeriasPage` consome o método                                           | Parcial: é verificação de leitura, não sincronização. Implementar integração ou renomear/remover a promessa de sync.                                  |
| Contatos de emergência                                            | `colaboradorDetalhesService.ts:43` consulta a tabela real e propaga erro                                                                               | Implementação local corrigida; validar autorização e jornada autenticada.                                                                             |
| Backup CSV/JSON                                                   | `backupService.ts:14` inclui folha_pagamento; linhas 52/99 usam allSettled e omitem rejeitados; limite 10.000 sem paginação integral                   | Parcial e potencialmente incompleto. Exigir manifest, falha explícita, paginação, checksum e restore.                                                 |
| Dashboards por views                                              | 16 catch retornam [] em `services/tabelas/viewsService.ts`                                                                                             | Falha confundida com zero resultados. Propagar estado de erro à UI e testar indisponibilidade.                                                        |
| PDF de holerite                                                   | `HoleritesPage.tsx:72` chama `gerarPDFHolerite`; a Edge retorna JSON de cálculo                                                                        | Há geração local de PDF. Não reproduzida a antiga afirmação de URL fixa externa; falta persistência/distribuição/recibo e autorização remota correta. |
| eSocial                                                           | `enviar-esocial/index.ts:160` simula quando configurado; ramo produtivo informa integração ausente. ESocialPage:567/572 mostra Operacional/124ms fixos | Transporte externo não implementado nesse caminho; UI não representa health real. Exigir integração homologada ou estado indisponível explícito.      |
| FGTS Digital / DCTFWeb / PIX                                      | Edge Functions existem com operações e respostas locais, sem evidência de provedor homologado                                                          | Parcial: distinguir preparar/aprovar localmente de transmitir/liquidar externamente.                                                                  |
| E-mail/Resend                                                     | `enviar-relatorio/index.ts:269` inicializa status simulado sem chave; resposta final inclui success true e status                                      | Parcial: ausência de provedor não comprova entrega. Separar geração, fila, envio e confirmação e testar caller/UI.                                    |
| Metabase                                                          | service descreve stub; `metabase-embed` é a única Edge local não implantada                                                                            | Parcial: implantar com configuração e autorização verificadas ou desativar a capacidade.                                                              |
| PCS                                                               | cinco tabelas e RPCs ausentes, mas service ativo referencia todas                                                                                      | Implementação somente local; exige decisão explícita de completar/remover, não checkbox por existência de UI.                                         |
| Benefícios                                                        | `beneficios_colaborador` e `beneficios_colaboradores` coexistem fisicamente e nos caminhos históricos                                                  | Parcial: definir fonte por domínio e migrar consumidores com teste de reconciliação.                                                                  |
| Logs                                                              | batch/guarda de sessão existem, dados de email/URL continuam entrando                                                                                  | Parcial: completar redaction antes de console/RPC/Sentry e comprovar retenção.                                                                        |
| gov.br, Bitrix, ERP, IA/OCR/biometria, WhatsApp, Slack e webhooks | existem fontes/inventários anteriores; esta rodada não homologou os provedores nem verificou secrets/entrega de cada um                                | Não certificados. Manter E50-028/030 abertos; requerer caller, ambiente de teste, recibo real e falha de provedor.                                    |
| Mobile, i18n, BPMN, BI completo                                   | há configurações/código e registros históricos; entrega integral não demonstrada nesta revisão                                                         | Parcial/não comprovado; decidir escopo e exigir jornada real por plataforma/capacidade.                                                               |
| CAGED/RAIS, SMTP próprio, Telegram, Stripe                        | mencionados como possibilidades no inventário anterior, sem requisito de produto aprovado localizado                                                   | Sugestões de escopo, não defeitos automaticamente obrigatórios. Resolver em E50-010 antes de criar integrações.                                       |

O grafo Graphify ajudou a localizar `BackupPage → backupService` e caminhos de folha. A consulta retornou um subconjunto e metadados históricos; nem os números do grafo nem ausência de uma aresta foram tratados como prova de inexistência de caller. As conclusões acima se apoiam no source/catálogo atual ou explicitam a falta de nova homologação.

## 5. Validações realizadas e limites

| Verificação                                         | Resultado                                                                                                         | O que não comprova                                                      |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `node scripts/validate-plan-50.mjs`                 | 231 verificações estruturais aprovadas                                                                            | conclusão das 50 etapas                                                 |
| Auditor de projeto canônico                         | aprovado nas superfícies verificadas                                                                              | todos os secrets/consumidores implantados                               |
| `node scripts/tests/rebaseline-artifact.test.mjs`   | cinco camadas e 84 comandos/42 views coerentes                                                                    | execução integral do DDL da baseline                                    |
| `bun run test:db-audit-contract`                    | sete auditores passam cenários de falta de alvo/alvo inacessível                                                  | RLS efetiva no canônico                                                 |
| `bun run test:migrations`                           | três migrations 20260830000001–00003 aplicadas duas vezes, 28 asserts                                             | 645 migrations ou nova baseline completa                                |
| Simulação P0 em PostgreSQL 17 temporário            | reproduziu owner bypass; aplicou a migration duas vezes; 42 views com anon bloqueado e T1/T2/sem tenant coerentes | ACL/RLS/callers reais das 42 views canônicas                            |
| `digest` com literal sintético e search_path public | erro 42883 reproduzido no canônico                                                                                | teste de escrita/imutabilidade de cada trigger                          |
| `playwright test --list`                            | 71 testes em 24 arquivos                                                                                          | execução; duas specs da raiz continuam excluídas                        |
| Runs GitHub do SHA atual                            | typecheck, lint, unitários, bridge/shared, build e CodeQL aprovados; DB/E2E reprovados por configuração           | totalidade das Edge Functions, jornada autenticada e banco sincronizado |

O container sintético de P0 foi removido após o teste; somente dados descartáveis gerados para a simulação existiam nele. `AUDIT_REPORT.pdf` foi preservado. Não se repetiu o build local que regenera esse PDF; foi usada a evidência do build remoto no mesmo SHA. A suíte unitária integral também não foi repetida sem mudança de código: os resultados foram conferidos no run remoto correspondente.

Runs consultados: [CI](https://github.com/adm01-debug/Departamento_Pessoal_V3/actions/runs/34631912692), [E2E](https://github.com/adm01-debug/Departamento_Pessoal_V3/actions/runs/34631912752), [build](https://github.com/adm01-debug/Departamento_Pessoal_V3/actions/runs/34631912835), [PR #100](https://github.com/adm01-debug/Departamento_Pessoal_V3/pull/100).

## 6. Ajustes e ordem de conclusão recomendada

1. Preservar a autorização já concedida para o canônico, registrar o corte e comprovar recuperação/configuração antes das mudanças. E50-001/002 continuam exigindo evidência, não apenas declaração.
2. Fechar views/RPCs/RLS e testar acesso real por papel. A migration P0 já preparada é uma contenção parcial; não resolve todos os objetos.
3. Restaurar helpers de autorização e Auth, selagem e constraints. Testar assinatura dos RPCs usados por cada Edge antes do deploy; assim evita-se bloquear RH por dependência ausente.
4. Reconciliar os 50 jobs, principalmente os três com função inexistente e os oito grupos repetidos. Completar Storage/PCS conforme o escopo aprovado.
5. Promover Edge Functions por grupos de dependência, revisando as 56 diferenças textuais e `metabase-embed`. Usar manifesto de entrypoint, dependências, config e versão implantada.
6. Corrigir contratos de folha/provisões, backup e sucessos simulados. Definir estados distintos para preparação local, transmissão e confirmação externa.
7. Tornar integração/RLS/rebaseline bloqueantes no CI; eliminar testes que aceitam qualquer erro; tratar os 54 typechecks Edge. Configurar as quatro identidades E2E e a conexão de auditoria.
8. Executar jornadas reais, concorrência, rollback e homologação dos provedores. Atualizar cada subetapa/checkpoint com comando, resultado, SHA, alvo e limite da evidência.
9. Recertificar os requisitos operacionais e as 22 dimensões somente após os P0/P1 pertinentes fecharem. Não converter testes unitários ou preview verde em nota 10/10.

Formato mínimo de aceite por item: `E50-ID/subitem | commit | objeto/caller | ambiente | teste positivo | teste negativo | resultado | evidência | pendência`. Um teste ausente ou pulado fica como **não comprovado**, nunca aprovado por inferência.
