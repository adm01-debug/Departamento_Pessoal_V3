# Revisão de implementação das 50 etapas — 12/09/2026

> **Registro histórico:** a revisão posterior à execução e ao merge da PR #100 está em [Revisão pós-execução das 50 etapas](REVISAO_POS_EXECUCAO_PLANO_50_2026-09-12.md). Ela acessou o canônico, conferiu main e atualiza os estados abaixo; preserve as evidências deste documento com seu SHA/data originais.

## Veredito

**Não implementamos nem validamos integralmente todas as melhorias. Não há evidência suficiente para encerrar qualquer etapa no checkpoint C4.** Há entregas locais reais, novas regressões confirmadas e validações remotas pendentes. Não é tecnicamente defensável declarar 10/10 ou liberar go-live.

Esta revisão atualiza a avaliação de 11/09, sem apagar o histórico e sem confundir ausência de comprovação com ausência de código.

- Código examinado: `cc6abb1cc929b4c055502ab2a94ac77dc4ae2e88`.
- Branch: `codex/e50-execution-20260911`.
- Main no GitHub: `1dfd6d3a7f29132b23d6e2dc6f4382a4dae515e3`.
- Branch contém 32 commits além de main; o PR #100 permanece aberto, no mesmo SHA local.
- O arquivo de plano contém 50 etapas, 500 subetapas e 200 checkpoints: 4 checkboxes marcados e 696 abertos. Isso mede a documentação, **não** o percentual funcional entregue.
- Existem atualmente 651 arquivos SQL em `supabase/migrations`; os números históricos 644/645 não descrevem o checkout atual. Não foi obtida nova contagem do ledger canônico.
- `AUDIT_REPORT.pdf` já estava modificado e foi preservado. Não houve alteração de código executável, banco, secrets, deploy, merge ou publicação nesta revisão.

Fonte dos requisitos: [plano de 50 etapas](PLANO_MELHORIAS_50_ETAPAS_2026-09-10.md). Foram lidos os objetivos e critérios positivos/negativos das 50 etapas e confrontados com código, histórico e evidências de execução. **Isso não significa executar os 700 itens como testes**, homologar todos os provedores ou testar todas as combinações de papéis e dados.

## Execução posterior à revisão — 12/09/2026

Esta seção é uma evidência de execução posterior ao veredito acima. Ela não
transforma as etapas em C4 nem altera as limitações de E2E, restore, provedores
externos ou do drift histórico.

| Item                 | Ação no canônico `frjbfeamybqsejlvmqbl`                                                                           | Evidência positiva                                                                                                                                | Controle/limite                                                                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0 hashes/Auth/folha | Aplicadas as migrações `p0_hash_trigger_search_path`, `p0_auth_lockout_contract` e `p0_payroll_upsert_contract`.  | Ledger: `20260912142449`–`20260912142520`; precondições e simulações descartáveis aprovadas.                                                      | Não foi executado `db push` nem `migration repair` em massa.                                                                                      |
| P0 `pgcrypto`        | Aplicada `p0_pgcrypto_routine_search_path` para 14 rotinas que chamavam `digest`/`gen_random_bytes`.              | A simulação reproduziu a falha de `digest()` e passou após o ajuste; o auditor canônico reporta zero referência a extensão fora do `search_path`. | O ajuste limita-se a `search_path`; não concede permissões nem altera corpos de função.                                                           |
| P0 views             | Aplicada `p0_views_revoke_public`.                                                                                | As 42 views existem; após a alteração, `0` sem `security_invoker` e `0` expostas a `anon`/`PUBLIC`; `v_audit_trail` perdeu acesso anon.           | `authenticated` permanece permitido apenas onde o contrato atual já o concede; matriz CRUD/T1/T2 ainda pendente.                                  |
| Caminho de busca     | Aplicadas `p0_secdef_search_path` (18 rotinas SECURITY DEFINER) e `p1_function_search_path` (9 helpers/triggers). | Simulações PG17 com duas aplicações idempotentes e pré-condição fail-closed; advisor canônico deixou de listar `function_search_path_mutable`.    | Não foram alterados corpos, permissões ou funções fora das allowlists.                                                                            |
| Edge Functions       | Publicadas `enviar-relatorio` v6, `alertas-dp` v7 e `processar-agendamentos` v6.                                  | CLI autenticado validou a ref canônica; teste OPTIONS hostil devolve 403. Vitest local: 468 arquivos, 4.897 testes aprovados e um skip.           | A URL Vercel disponível é preview, sem domínio de produção estável. Não sobrescrever `EXTRA_ALLOWED_ORIGINS` sem preservar os valores existentes. |

As migrações criadas nesta execução possuem testes descartáveis adicionados ao
job de CI: `migrations-p0-secdef-search-path.sh` e
`migrations-p1-function-search-path.sh`. O ledger canônico passou a registrar
as versões de execução emitidas pelo Supabase, que não devem ser confundidas
com uma reconciliação integral das 651 migrações locais.

## Evidências e limites

### GitHub verificado nesta revisão

- [PR #100](https://github.com/adm01-debug/Departamento_Pessoal_V3/pull/100): aberto, SHA igual ao local.
- [CI do SHA auditado](https://github.com/adm01-debug/Departamento_Pessoal_V3/actions/runs/34694084112): reprovado.
- [Playwright](https://github.com/adm01-debug/Departamento_Pessoal_V3/actions/runs/34694084127): abortou no pré-requisito, antes de executar as jornadas.
- [Build/preview](https://github.com/adm01-debug/Departamento_Pessoal_V3/actions/runs/34694084117): aprovado.
- [Security](https://github.com/adm01-debug/Departamento_Pessoal_V3/actions/runs/34694084166): aprovado; não equivale a pentest.

O ruleset `21934736` está ativo e exige uma aprovação. Há bypass permanente para um usuário; `Playwright E2E` e build não são required checks. `strict_required_status_checks_policy` está falso. O job de integridade do banco é obrigatório, mas reprova por configuração ausente.

### Banco canônico: não recertificado nesta rodada

O alvo correto continua `frjbfeamybqsejlvmqbl`. O auditor local de configuração passou. Entretanto:

1. `get_project_url` do conector Supabase retornou `bwwbeyolnnzppeuhgkcd`, **outro projeto**. Nenhum catálogo desse projeto foi usado como prova do canônico.
2. A chamada de identificação pelo gateway `supabase_producao` retornou `Management API 403`.
3. O CI não dispõe de `SUPABASE_DB_URL`; os quatro secrets E2E também faltam. A listagem de secrets de repositório mostrou somente os dois `VITE_SUPABASE_*`; o próprio run comprova os pré-requisitos efetivamente ausentes.
4. Os testes RPC do CI receberam `PGRST202`, em vez de `42501`, para `check_account_lockout` e `record_login_attempt`. Isso prova que o contrato esperado não foi atendido pela API consultada; **não prova isoladamente** se a causa é função ausente, assinatura divergente ou cache/exposição do PostgREST.

Os achados de catálogo de 11/09 — views expostas, SECURITY DEFINER, helpers ausentes, Storage, cron, constraints e diferenças de deploy — permanecem **pendências históricas sem comprovação atual de resolução**. Não os apresento como nova consulta SQL. A autorização prévia para trabalhar no canônico com dados descartáveis continua reconhecida; autorização não substitui conexão, recuperação e evidência.

### Testes e diagnósticos

| Verificação                                       | Resultado nesta revisão                                                   | Limite da evidência                                                                                                 |
| ------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `bun run typecheck`                               | Exit 0                                                                    | Aplicação local; não consulta o catálogo real                                                                       |
| `bun run typecheck:tests`                         | Exit 2, TS2554 em `edgeFunctionsService.test.ts:41`                       | Regressão reproduzida localmente e no CI                                                                            |
| `bun run typecheck:e2e`                           | Exit 0 local                                                              | O passo equivalente foi pulado no CI após falha anterior; não é execução de navegador                               |
| `bun run lint:ci`                                 | Exit 0, sem diagnósticos emitidos                                         | Configuração ainda permite 18 warnings e não cobre toda a superfície Edge                                           |
| Vitest direcionado                                | 6 arquivos, 51 testes aprovados                                           | Inclui alertas, backup, contrato de agenda, CNAB, férias e MorningBriefing; há warnings de `act` e mock de animação |
| Vitest integral no CI, mesmo SHA                  | 467 arquivos aprovados, 1 reprovado; 4.896 testes aprovados, 2 reprovados | As duas falhas são os contratos RPC; não declarei a suíte verde                                                     |
| Deno, seleção do CI, reexecutada localmente       | 78 testes aprovados, zero falhas                                          | Helpers/validações; não executa integralmente cada handler HTTP                                                     |
| Typecheck Edge no CI                              | Bridge aprovado; 18 outras funções com erro                               | O loop informativo não bloqueia o job                                                                               |
| `node scripts/validate-plan-50.mjs`               | 231 verificações aprovadas                                                | Verifica estrutura, IDs e dependências do documento; não verifica implementação                                     |
| `node scripts/audit-canonical-project.mjs`        | Aprovado                                                                  | Superfícies locais de configuração, não credenciais implantadas                                                     |
| `node scripts/tests/rebaseline-artifact.test.mjs` | Aprovado, cinco camadas/42 views                                          | Coerência do artefato; não restauração integral                                                                     |
| Simulação Deno do parser real                     | Clone após leitura falha; payload UTF-8 acima do limite aceito            | Reprodução local, sem chamada remota                                                                                |
| Simulação das funções reais de calendário/CSV     | Bordas incorretas reproduzidas                                            | Funções extraídas do source e avaliadas em memória; nenhum job/e-mail executado                                     |

O build local não foi repetido porque seu script regenera `AUDIT_REPORT.pdf`. Foi conferido o build remoto do SHA exato. A suíte integral não foi duplicada localmente: foram consultados seus resultados completos no CI e reexecutados os testes dirigidos. Não houve escrita de fixtures no canônico.

## Achados novos e remanescentes priorizados

### R12-01 — P1 confirmado: envio manual de relatórios termina em erro

Em `supabase/functions/enviar-relatorio/index.ts:198`, `parseJsonBody(req)` consome o corpo; na linha 249, o caminho humano chama `req.clone()`. O parser real usa `await req.text()` em `_shared/contract.ts:188`. Uma requisição válida chega a um clone de corpo já consumido, que lança exceção e cai no retorno 500, antes de completar a autenticação humana.

Simulação com o parser real: `bodyUsed=true`; `clone FAIL Body is unusable`.

Aceite: handler completo com request válido, inválido, CSRF ausente/inválido e sessão legítima; clonar antes de consumir ou validar CSRF sem reler o corpo. Cobrir explicitamente o caminho manual e o interno. Etapas 028/031/033/034.

### R12-02 — P1 confirmado: CNAB conserva configuração bancária de outra empresa

Em `src/components/folha/CNABDialog.tsx:35`, a configuração é carregada somente ao abrir o modal (`handleOpenChange`, linha 61). Trocar a empresa com o modal aberto não recarrega nem limpa os campos. `handleSaveConfig` usa a empresa atual, mas os campos podem continuar pertencendo à anterior. Quando `getConfig` retorna `null`, somente o nome é substituído e agência/conta/convênio antigos permanecem. Respostas assíncronas antigas também podem substituir o estado atual.

É um defeito de isolamento de estado confirmado no source, **não** relato de pagamento incorreto executado no banco. Cenário: abrir A, carregar sua conta, trocar para B, salvar; o caller combina ID B com configuração A. Os testes atuais mockam o diálogo sem reproduzir abertura/troca de tenant.

Aceite: identidade da empresa vinculada ao draft; reset e recarga ao mudar tenant; descarte de resposta obsoleta; salvar bloqueado enquanto o draft não corresponde ao tenant; testes A→B, B sem configuração e respostas invertidas. Etapas 021/028/036/041.

### R12-03 — P1 confirmado: limite de payload não mede bytes nem limita leitura

`_shared/contract.ts:188` lê todo o corpo e compara `raw.length`, que não é tamanho UTF-8. Sem `Content-Length`, JSON de 280.008 bytes foi aceito com limite de 262.144 bytes. A leitura integral também ocorre antes da rejeição por tamanho.

Aceite: limite por bytes durante streaming, independente da confiança em `Content-Length`; testes ASCII, caracteres multibyte, body sem comprimento e interrupção antecipada. Não foi executado teste de exaustão de memória. Etapas 031/032/039.

### R12-04 — P1 confirmado: agendador permite falso sucesso e efeitos duplicados

`processar-agendamentos/index.ts:221` responde `success:true` e `processados:resultados.length`, incluindo itens `erro` e `skipped`. A UI em `SystemHealthTab.tsx:127` transforma esse número em toast de sucesso. A atualização de `proximo_envio` não verifica o erro retornado. Não há aquisição atômica de um job/ocorrência antes de chamar o provedor.

Em `enviar-relatorio/index.ts:406`, a auditoria é gravada **depois** do envio; falha nessa gravação retorna 500 após o provedor aceitar a mensagem. Sem chave de idempotência, retry pode reenviar. `ultimo_envio` também é atualizado no caminho de falha de entrega, e os erros de log/update não são verificados.

Aceite: estados separados para selecionado, pulado, aceito, falho e confirmado; claim transacional/lease por ocorrência; outbox e chave idempotente; tratar erro pós-envio sem duplicar efeito; testes concorrentes e timeout pós-aceite. Etapas 016/028/036/045.

### R12-05 — P1 confirmado: calendário de agendamento perde ocorrências

`processar-agendamentos/index.ts:251` usa janela dentro da mesma hora e diferença absoluta de minutos. Em simulação com `TZ=UTC`, agenda diária 09:50 foi recusada às 10:00 e aceita às 09:40. Em `calcularProximoEnvio`, `setMonth` antes de `setDate` fez 31/01/2026 avançar para 31/03/2026, sem ocorrência em fevereiro.

Além disso, não há timezone de negócio explícito no cálculo. Aceite: definir política para dias 29–31, fuso e atrasos; usar ocorrência persistida; testar virada de hora/mês/ano, fevereiro e execução tardia. Não basta ajustar o exemplo de janeiro. Etapas 016/028/036.

### R12-06 — P1 confirmado: “sem alertas” vira erro; falha SQL pode virar ausência de alerta

`alertas-dp/index.ts:269` retorna `{message, alertas:[]}` quando não existem alertas. O contrato em `edgeFunctionsService.ts:39` declara `success` obrigatório, e `MorningBriefing.tsx:202`/`SystemHealthTab.tsx:114` interpretam sua ausência como falha de entrega. O caso legítimo “nenhum alerta pendente” vira erro para o usuário.

As consultas de ASO, colaboradores e anomalias capturam `data`, mas ignoram `error`; indisponibilidade/contrato SQL inválido pode seguir para o mesmo ramo “nenhum alerta”. A seleção de destinatários limita vínculos a 100 e e-mails a 50, sem explicitar truncamento.

Aceite: union discriminada de resultado, incluindo `no_alerts`, `accepted`, `unavailable`, `failed`; falha de coleta não é lista vazia; paginação/limite explícito de destinatários. Etapas 021/028/033/045.

### R12-07 — P1 confirmado localmente: CORS estático ainda aponta para Lovable

Relatórios, alertas e agendador importam o objeto estático `corsHeaders`. Em `_shared/contract.ts:100`, esse objeto é criado sem request e fixa a origem primária `https://unified-harmony-hub.lovable.app`. Acrescentar Vercel em `EXTRA_ALLOWED_ORIGINS` não faz esse objeto ecoar a origem Vercel.

O valor estático foi verificado na simulação. O impacto sobre o deploy depende de a chamada do browser ser direta ou mediada por proxy e da versão implantada; não foi apresentado como falha reproduzida no Vercel. Aceite: `getCorsHeaders(req)` em OPTIONS e em **todos** os retornos; teste de origem autorizada Vercel/customizada e origem hostil. Etapas 003/030/031/037.

### R12-08 — P1 a validar dinamicamente: autoria confiada ao registro de agendamento

O despacho interno lê `schedule.created_by` e o usa em `requireRh`. A criação web fornece `created_by`. As policies locais/baseline de `relatorios_agendados` verificam associação à empresa, sem demonstrar autoria imutável exclusivamente server-side. Isso exige investigar se um membro pode indicar um RH como criador e obter despacho com a autorização desse RH.

**Não foi demonstrada exploração no canônico.** O registro também não é confrontado pelo helper quanto a `ativo`, vencimento ou parâmetros completos. Aceite: autoria server-owned, controle de alteração de autor/destinatário, revalidação de ocorrência ativa e payload completo; teste de membro comum tentando forjar autoria. Etapas 006/023/028/035.

### R12-09 — P1 confirmado: relatórios ainda podem ser truncados ou conter fórmulas

`enviar-relatorio/index.ts:106/134/144` usa `.limit(5000)` sem paginação integral nem confronto de contagem. O relatório pode representar apenas um recorte sem avisar. Indicadores usam `count ?? 0` sem verificar erro. Em `toCsv`, a entrada sintética `=1+1` é emitida literalmente como célula; o quoting atual não neutraliza fórmulas em leitores de planilha.

Aceite: completude ou truncamento explícito no contrato, tratamento de erro de contagem, proteção de CSV para campos textuais não confiáveis e testes de aspas/CR/LF/fórmulas. Nenhuma fórmula maliciosa foi executada. Etapas 021/028/032/043.

### R12-10 — P1 confirmado: resumo diário não separa cache e consultas por empresa

`MorningBriefing.tsx:49` usa `queryKey:['morning-briefing']`; as consultas não incluem filtro da empresa selecionada. O tenant foi acrescentado à ação de disparar alertas, não à leitura do resumo. Para usuário autorizado a múltiplas empresas, isso pode agregar dados de várias delas ou manter cache da seleção anterior. Não é prova de bypass de RLS.

Erros de coleta são ignorados; ausência de eventos eSocial gera health 100. Aceite: tenant/usuário relevantes na chave, filtros explícitos, limpeza no logout/troca e estados de indisponibilidade distintos de zero. Etapas 021/023/043/045.

### R12-11 — P2 confirmado: cancelamento de férias não usa o reset criado

`NovaProgramacaoDialog.tsx:39` limpa mês/período manual no handler de fechamento, mas o botão Cancelar, linha 141, chama diretamente `onOpenChange(false)`. Fechamento externo também não passa pelo reset. Há comportamento inconsistente entre formas de fechar/reabrir; a seleção manual pode sobreviver ao novo `mesInicial`.

Aceite: política única para descarte/preservação do draft; teste de Cancelar, Escape, fechamento externo, sucesso e reabertura em outro mês. Os testes existentes passaram, mas emitiram warnings de atualização fora de `act`. Etapas 026/033/041.

### R12-12 — P1 de certificação: CI verde parcial não representa cobertura integral

O teste `src/services/__tests__/edgeFunctionsService.test.ts:41` chama `dispararAlertasDP()` sem argumento: TS2554 reproduzido. Em runtime, o mock aceita a chamada, por isso esse teste Vitest passa. Esse é um exemplo concreto de teste verde com contrato inválido.

O typecheck informativo das Edge tolera erros em 18 funções: `alertas-preditivos`, `assistente-ia`, `auditoria`, `calcular-folha`, `cnab-remessa`, `consultarCEP`, `consultarCNPJ`, `criptografia`, `distribuir-holerites`, `fechar-folha`, `gerar-ltcat-os`, `gerar-pgr`, `healthcheck`, `metricas`, `pix-lote`, `reabrir-folha`, `validar-biometria`, `webhook`.

Os 78 testes Deno não cobrem os handlers completos que contêm R12-01/04/06. Aceite: corrigir o contrato do teste, testar rotas ponta a ponta com doubles controlados, reduzir erros Edge até um gate obrigatório e executar E2E/DB reais. Etapas 020/031/033/034/037/041/047.

## Melhorias reais: o que não deve ser refeito por usar relatório antigo

| Entrega local                                      | Evidência atual                                                                                              | O que falta para encerramento                                                                                                          |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Backup rejeita resultado parcial                   | `backupService.ts`: `Promise.all`, erro propagado e contagem comparada às linhas; testes dirigidos aprovados | Snapshot transacional, restore, nomes de tabelas compatíveis e percurso server-side; não chamar export de recuperação completa         |
| Redator central de logs                            | `loggerService.ts`: texto/contexto/URLs/segredos redigidos antes dos sinks do logger                         | Auditar chamadas que não usam esse logger, retenção, Sentry e logs de Edge; revogação de credenciais é outro requisito                 |
| eSocial falha quando transporte produtivo falta    | Ramo produtivo não inventa sucesso; status HTTP de falha testado                                             | Transporte SOAP/homologação não implementado nesse ramo; simulação ainda produz protocolo aleatório e estado enviado quando habilitada |
| Metabase sem gráfico fictício de fallback          | Correções de UI e allowlist de dashboards 1–4 no branch                                                      | Deploy/configuração, autorização por capacidade e jornada real; allowlist de ID não comprova RBAC completo                             |
| Relatórios exigem aceite do provedor               | Resend exige resposta OK e ID não vazio; sem configuração falha                                              | Corrigir R12-01/04/07/09; aceite do provedor não é confirmação de entrega à caixa postal                                               |
| Alertas limitam destinatários ao tenant            | Interseção entre vínculos, papéis e perfis; requisito RH                                                     | R12-06/10, autorização real, destinatários completos e idempotência                                                                    |
| Folha corrige chave de conflito                    | `calcular-folha`: `empresa_id,competencia,tipo`; migration progressiva para chave de itens                   | Aplicação canônica, relação `contratos_trabalho`, provisões e testes transacionais completos                                           |
| Bridge reforça escopo/RLS do caller                | Commits de tenant/read/write; testes Deno aprovados                                                          | Bundle efetivamente implantado e matriz real por papel/operação/empresa                                                                |
| Hashes/Auth/rate limit têm migrations e simulações | SQL progressivo e job P0 aprovado no CI                                                                      | Aplicação e smoke canônico, pré-requisitos, reset legado e fluxo Auth direto                                                           |
| Gates de artefato/canônico estão ligados ao CI     | Job estático executa os scripts conferidos localmente                                                        | Não confundir gate estrutural com restore ou promoção                                                                                  |

## Matriz das 50 etapas

Legenda: **P** = parcial, há implementação/artefato mas falta objetivo/aceite; **B** = dependência externa de configuração/evidência; **NE** = objetivo integral não demonstrado. Nenhuma dessas classes equivale a C4. Referências de banco de 11/09 são históricas, não recertificadas.

| Etapa                          | Estado | Evidência e critério ainda pendente                                                                                                                                  |
| ------------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E50-001 Credenciais            | B      | Exposição conhecida; sem comprovação de revogação das antigas e atualização de todos os consumidores. Não registrar valores em evidências.                           |
| E50-002 Recuperação            | P      | Export/baseline e backup fail-closed locais; falta recuperação integral demonstrada do estado/configuração atuais.                                                   |
| E50-003 Canônico/Git           | P      | Auditor local passa; PR sincronizado com branch, não integrado à main; conector aponta outro projeto e gateway 403. Falta smoke do destino.                          |
| E50-004 Views                  | P      | Migration e fixture existem; fechamento de grants/views canônicos não recertificado. Exigir matriz real de leitura.                                                  |
| E50-005 SECURITY DEFINER       | P      | Remediação SQL existe; autorização interna e grants de todos os overloads sem validação remota atual.                                                                |
| E50-006 RLS/ACL                | P      | Rebaseline e guards existentes; faltam matriz CRUD/T1/T2 e teste de autoria de agendas, R12-08.                                                                      |
| E50-007 Hashes/triggers        | P      | Migration progressiva/simulação P0 aprovadas; corpos e triggers de folha canônicos não recertificados.                                                               |
| E50-008 Lockout/rate limit     | P      | SQL/Edge fail-closed e simulações presentes; duas RPCs não satisfazem o teste via API. Falta fluxo Auth real, CAPTCHA/reset/bypass.                                  |
| E50-009 Manifest físico        | P      | Inventários e hashes existem; sem comparação determinística completa do ambiente atual e gate de drift externo.                                                      |
| E50-010 Classificação do drift | P      | Classificações e revisões existem; falta decisão por diferença/capacidade e atualização do inventário após 32 commits.                                               |
| E50-011 ADR baseline           | NE     | Não comprovada estratégia formal aprovada/reproduzida de corte, preservação histórica e promoção. Artefato SQL não equivale a ADR aceita.                            |
| E50-012 Baseline               | P      | Cinco camadas/42 views no teste estrutural, agora no CI; sem restore integral atual comprovado.                                                                      |
| E50-013 RPCs/tabelas           | P      | Restauração parcial de contratos no SQL local; relações/helpers/PCS/provisões exigem catálogo e cenários reais.                                                      |
| E50-014 PCS                    | P      | Service/UI/RPC callers existem; ausência de objetos no snapshot anterior não foi revalidada nem há homologação funcional atual. Completar ou retirar explicitamente. |
| E50-015 Storage                | P      | Migrations/configs presentes; última evidência 18/19 buckets, sem `backups`; sem nova prova 19/19 ou testes de owner/MIME/bytes.                                     |
| E50-016 Cron                   | P      | Agendador implementado, mas R12-04/05; cron canônico e funções pendentes do snapshot anterior sem revalidação.                                                       |
| E50-017 Constraints/triggers   | P      | Artefatos corretivos presentes; 12 CHECKs/PK archive/triggers do snapshot anterior sem encerramento comprovado.                                                      |
| E50-018 Índices/EXPLAIN        | NE     | Inventários não demonstram melhoria de workload/P95/escrita com planos antes/depois. Não há novo benchmark nesta revisão.                                            |
| E50-019 Restore/ledger         | NE     | 651 SQLs locais; sem duas restaurações equivalentes nem reconciliação atual demonstrada. Não reparar ledger por contagem.                                            |
| E50-020 Tipos/contratos        | P      | App e E2E typecheck passam; teste falha com TS2554; codegen e contratos de banco ainda não certificados.                                                             |
| E50-021 Acesso a dados         | P      | Services existem, mas `viewsService` conserva 16 retornos vazios em erros e R12-06/10 persistem.                                                                     |
| E50-022 Sessão/MFA             | P      | Guards/estado e correções locais presentes; jornada login/MFA/recovery/logout não executada com identidades E2E; contrato Auth falha.                                |
| E50-023 RBAC/ABAC              | P      | Helpers e uso do caller no bridge presentes; autorização do deploy e autoria server-owned pendentes; R12-08.                                                         |
| E50-024 Engine de folha        | P      | Chaves corrigidas parcialmente; `contratos_trabalho` ainda é usado em lote e provisões requerem chave composta; sem conciliação/transação homologadas.               |
| E50-025 Ponto antifraude       | P      | Offline/selagem/idempotência têm código; sem matriz real de vínculo, replay, dispositivo e fechamento concorrente.                                                   |
| E50-026 Férias/benefícios      | P      | UI e documentos existem; `syncWithHub` continua somente SELECT com `recordsUpdated:0`; R12-11 e consolidação de fontes pendentes.                                    |
| E50-027 Rescisão/assinatura    | P      | Fluxos/PDF/guards locais; sem prova atual de token one-time, assinatura, autorização implantada e trilha até pagamento.                                              |
| E50-028 Integrações            | P      | Melhor fail-closed em e-mail/eSocial/BI; transporte eSocial produtivo ausente no ramo examinado; R12-01/02/04/06/07/09 e homologações pendentes.                     |
| E50-029 SST/LGPD               | P      | UI/SQL existentes; retenção/DSAR/ciência/acesso médico sem jornada real atual; pendências do catálogo não encerradas.                                                |
| E50-030 Deploy Edge            | P      | Comparação anterior existe; 32 commits recentes não têm paridade atual de bundles/config/secrets comprovada.                                                         |
| E50-031 Segurança Edge         | P      | Guards/helpers e 78 testes; R12-01/03/07/08 e 18 typechecks Edge com erro impedem aceite integral.                                                                   |
| E50-032 Validação/uploads      | P      | Schemas/limites parciais; falha UTF-8 e CSV reproduzidas; sem prova integral de magic bytes/quarentena/ZIP bomb.                                                     |
| E50-033 Testes por risco       | P      | 4.896 aprovados no CI, 2 falhas; handlers/regressões escapam dos helpers. Sem nova cobertura por risco ou mutation testing demonstrados.                             |
| E50-034 Integração real        | P      | Fixtures SQL e artefato passam; Auth/PostgREST/Storage/cron/baseline integrais não certificados.                                                                     |
| E50-035 Matriz RLS             | P      | Testes RPC agora bloqueiam contrato incorreto; matriz de todos os papéis/CRUD/T2 ainda não comprovada no canônico.                                                   |
| E50-036 Concorrência           | P      | Correções pontuais de upsert/idempotência; agendador sem claim/outbox e resposta tardia CNAB sem guarda, R12-02/04.                                                  |
| E50-037 E2E                    | B      | Quatro secrets ausentes; run aborta antes das jornadas. Typecheck/listagem não substituem execução.                                                                  |
| E50-038 Supply chain           | P      | Security/CodeQL aprovados; SBOM/licenças/rotação total e equivalência das dependências implantadas não demonstradas.                                                 |
| E50-039 Threat model/pentest   | NE     | Revisão de source e simulações não equivalem a laudo de pentest e reteste das cadeias de ataque por papel.                                                           |
| E50-040 Arquitetura            | P      | Refatorações pontuais presentes; sem gate atual de ciclos/clones/boundaries e sem eliminação integral de duplicação.                                                 |
| E50-041 Lint/tipos             | P      | Lint sem diagnósticos localmente; teste TS2554 e 18 Edge com erro. Mudança de efeitos não resolve isoladamente races de estado.                                      |
| E50-042 Bundle/PWA/mobile      | P      | Build/preview passa; budgets de navegação, service worker e entrega por plataforma ainda não demonstrados.                                                           |
| E50-043 Queries/paginação      | P      | Reset de filtros/cursor implementados parcialmente; recortes de relatório e cache de tenant persistem; sem benchmark real.                                           |
| E50-044 Logs/PII               | P      | Redator central agora existe; faltam todos os sinks, retenção/PII de Edge e teste operacional de redaction.                                                          |
| E50-045 Health/SLO/alertas     | P      | Matemática e falha do bridge melhoradas; resumo 100 sem dados, falso total de agendas e resultado no-alerts incoerente persistem.                                    |
| E50-046 Acessibilidade         | P      | Componentes/testes parciais; nenhuma auditoria completa atual de teclado, leitor, zoom, contraste e dispositivos.                                                    |
| E50-047 CI/proteção            | P      | Ruleset ativo; bypass permanente, 18 erros Edge tolerados, DB/E2E reprovados e E2E/build fora dos checks obrigatórios.                                               |
| E50-048 Staging/DR             | NE     | Canônico autorizado para massa descartável, mas sem prova atual de promoção imutável, PITR/restore/game day/RTO/RPO.                                                 |
| E50-049 Governança/docs        | P      | Planos e revisões existem; instruções e relatórios contêm métricas/afirmações superadas. Falta last-verified por capacidade/checkpoint e ownership.                  |
| E50-050 Go-live                | NE     | P1s confirmados, CI reprovado e banco não recertificado impedem decisão favorável. Não calculada nova nota.                                                          |

Resumo: **42 P, 2 B, 6 NE, 0 C4 comprovado**. A distribuição coincide com a revisão anterior, mas as evidências internas mudaram substancialmente; não significa ausência de progresso.

## Funções sugeridas, ausentes e parcialmente implementadas

- **Não implementado no caminho examinado:** transporte produtivo eSocial; sincronização efetiva de férias com o hub. Há código de simulação/leitura, não execução da capacidade prometida.
- **Parcial e com regressão:** envio manual de relatórios, agendamento, alertas, edição bancária CNAB, resumo por empresa e reset de férias.
- **Implementado localmente, promoção/aceite pendentes:** redaction do logger, backup fail-closed, chave de folha, endurecimento do bridge, migrations Auth/hash/rate limit, allowlist de Metabase.
- **Dependente de homologação/decisão:** PCS, liquidação PIX, FGTS Digital/DCTFWeb, gov.br, Bitrix/ERP, BI, IA/OCR/biometria e mensageria. Não foi obtida prova ponta a ponta de cada provedor nesta rodada; existência de Edge/CRUD não prova integração operacional.
- **Sugestões que precisam de escopo aprovado:** CAGED/RAIS, SMTP próprio, Telegram, Stripe e outras possibilidades históricas não devem virar obrigação de implementação apenas porque foram mencionadas. Registrar manter/implementar/substituir/arquivar antes de expandir escopo.

## Ajustes necessários no plano e ordem de retomada

1. Atualizar evidências por SHA/alvo/data; retirar afirmações atuais de “todos os typechecks passaram”, “54 Edge com erro”, “backup omite erros” e “logger sem redator”. Preservar essas afirmações apenas como histórico datado.
2. Resolver a inconsistência de meta: o plano escreve **≥8,0/10**, enquanto o pedido do owner é **10/10**. Definir critérios mensuráveis nas 22 dimensões; não subir nota por contagem de commits/testes.
3. Consolidar a exceção de ambiente: o cabeçalho reconhece autorização para canônico, mas regras/C4 ainda exigem staging genericamente. Documentar exceção e evidências equivalentes de teste/recuperação sem eliminar E50-048.
4. Garantir identidade/acesso do canônico e evidência de rotação/recuperação. Não usar outro projeto, relaxar gate ou pedir chaves em texto aberto para produzir aparência de conclusão.
5. Corrigir primeiro R12-01/02/03 e contratos de teste; adicionar regressões que falhem antes da correção. Em paralelo técnico futuro, tratar R12-04/05/06/07/08/09/10, com autoria server-owned antes de liberar despacho interno.
6. Preparar dependências SQL antes de implantar callers: Auth/authz/rate limit, chaves e relações de folha/provisões, views/RLS/hash. Repetir simulações e depois smoke real no alvo autorizado; não executar `db push`/`migration repair` em massa.
7. Completar fixtures E2E sintéticas e `SUPABASE_DB_URL` de auditoria restrita; executar positivos/negativos por papel e tenant. Resolver as duas falhas RPC sem enfraquecer a expectativa para aceitar qualquer erro.
8. Tornar segurança/tipos Edge progressivamente bloqueantes, reduzir permissões de bypass e incluir jornadas essenciais nos required checks conforme decisão do owner.
9. Exigir evidências de restore, concorrência, provedores e UX para C3/C4. Encerrar apenas os subitens efetivamente comprovados e não todas as etapas em bloco.

Formato de evidência recomendado: `E50/subitem | SHA | objeto/caller | alvo | comando/cenário | resultado | positivo/negativo | rollback | revisor | pendência`.

O Graphify foi usado para localizar relações; seu subgrafo truncado/histórico não foi usado para declarar funcionalidades inexistentes ou certificar implementação. As conclusões verificáveis se apoiam no source atual e nas execuções acima.
