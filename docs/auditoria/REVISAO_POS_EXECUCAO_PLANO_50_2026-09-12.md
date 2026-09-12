# Revisão pós-execução das 50 etapas — 12/09/2026

## Atualização executiva — lote de remediação validado às 21:23 UTC

O diagnóstico abaixo foi usado como entrada de uma nova rodada de implementação. Esta atualização é a fotografia mais recente e prevalece quando houver conflito com a seção histórica posterior.

**Resultado atual: o lote está aprovado localmente, mas o sistema ainda não possui aceite C4/10/10.** Código, migrations e gates foram corrigidos; a publicação no GitHub, a aplicação controlada no banco canônico, o deploy das Edge Functions e a regressão E2E pós-deploy são checkpoints separados e obrigatórios.

### Evidência local acumulada

| Gate                     | Resultado                                                                                                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript               | aplicação, testes e E2E sem erros                                                                                                                           |
| ESLint/formatação        | `lint:ci` e `format:check:changed` aprovados                                                                                                                |
| Vitest                   | 468 arquivos; 4.910 aprovados; 1 ignorado; cobertura real: 61,74% statements, 56,86% branches, 54,37% functions e 66,04% lines                              |
| Edge Functions           | 60/60 entrypoints aprovados no `deno check`; 95 testes Deno aprovados                                                                                       |
| Banco descartável        | 19/19 scripts PostgreSQL aprovados, incluindo reaplicação e preflight fail-closed                                                                           |
| Contrato de auditoria    | 24 inserts Edge validados por AST; frontend sem leitura direta de `audit_log`; autoria server-owned e isolamento por empresa simulados no PostgreSQL        |
| Contrato frontend/bridge | 76 RPCs literais de produção mapeadas; 87 allowlisted; 7 RPCs públicas limitadas a chave publicável; zero acesso do bridge às tabelas sensíveis verificadas |
| Build                    | Vite/PWA de produção aprovado; avisos de tamanho de chunks continuam sendo dívida de performance, não falha de compilação                                   |
| Workflows                | `actionlint` aprovado; inputs do operador tratados como dados; segredos administrativos removidos do contexto de PR                                         |

### Estado dos 16 impedimentos após a remediação

| Achado                      | Estado local                                                                                                                                                               | Checkpoint externo ainda necessário                                                 |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| RV-01 identidade/tenant     | helper deixa de confiar em `user_metadata`; authz usa vínculo persistido                                                                                                   | aplicar SQL e executar matriz T1/T2 no canônico                                     |
| RV-02 token enumerável      | tabela sem ACL de anon/authenticated; fluxo público somente por RPC com hash/expiração/consumo                                                                             | aplicar SQL e repetir enumeração/replay remoto                                      |
| RV-03 policies permissivas  | policies confirmadas foram removidas/substituídas e o auditor deixou de isentar token                                                                                      | aplicar SQL e rodar os cinco auditores vivos                                        |
| RV-04 RPCs ausentes         | RPCs de vínculo e gestão RH/pessoas entregues com grants mínimos                                                                                                           | aplicar SQL antes do deploy Edge                                                    |
| RV-05 Auth/rate limit       | reset público revogado e rate limiter transacional service-only entregue                                                                                                   | aplicar SQL, publicar Auth/Edge e testar concorrência remota                        |
| RV-06 trilha de auditoria   | RPC escopada por tenant e filtros; autoria derivada de `auth.uid()`; log unificado sem escrita direta; clientes migrados; 24 inserts Edge validados por AST                | aplicar e validar admin/RH/comum no canônico                                        |
| RV-07 provisões             | schema compatível, chave composta e substituição mensal/auditoria em uma transação                                                                                         | aplicar e reconciliar cálculo com casos legais homologados                          |
| RV-08 autoria de relatórios | autor server-owned/imutável, destino interno e tenant regravado por trigger                                                                                                | aplicar e repetir payload forjado remoto                                            |
| RV-09 agenda                | claim atômico, lease, cursor durável e chave idempotente do provedor                                                                                                       | deploy + teste concorrente e de falha do provedor                                   |
| RV-10 streaming             | cancelamento não é mais aguardado; teste de clone/stream aberto impede deadlock                                                                                            | teste de carga no runtime implantado                                                |
| RV-11 corrida CNAB          | geração por contexto/operação invalida A→B→A, fechamento e respostas obsoletas; testes com promises controladas                                                            | homologação sem envio bancário real                                                 |
| RV-12 CORS/erros            | request propagado aos erros e proxy local usa a origem canônica Vercel                                                                                                     | deploy e probes de todas as origens deliberadas                                     |
| RV-13 UI enganosa           | briefing por tenant/fail-closed, saúde sem eventos distinta de 100%, sync fictícia removida, paginação reiniciada e relatório recusa truncamento                           | E2E pós-deploy com duas empresas                                                    |
| RV-14 drift Edge            | todos os entrypoints compilam e workflow manual canônico fail-closed foi criado                                                                                            | credencial Management API com acesso ao projeto e execução do deploy                |
| RV-15 capacidades           | contrato PCS, bucket `backups`, destinatários internos e alvos dos três crons de segurança entregues                                                                       | aplicação, smoke real, eSocial homologado e restauração integral continuam externos |
| RV-16 gates falsos-verdes   | Edge agora bloqueante, agenda incluída, 19 SQL suites no CI, formatação real, contrato bridge/frontend e URL canônica validados; DB/E2E com segredo não rodam código de PR | checks remotos verdes e proteção de branch revisada                                 |

### Ordem de promoção, sem atalhos

1. Publicar o lote em branch e PR, mantendo `AUDIT_REPORT.pdf` fora do commit.
2. Executar o workflow canônico em modo `validate`, que aplica exatamente 12 migrations numa única transação revertida.
3. Executar o mesmo lote em modo `apply`; o CLI registra somente essas 12 versões no ledger — não há `db push` nem `migration repair` em massa.
4. Executar auditores e smoke tests contra o banco atualizado.
5. Publicar as 60 Edge Functions sem `--prune`; o job exige `SUPABASE_ACCESS_TOKEN` com acesso ao projeto canônico e falha antes de escrever caso a autorização não exista.
6. Executar Playwright com as quatro identidades sintéticas no SHA integrado e comparar o inventário remoto.
7. Manter como pendentes eSocial produtivo, transporte bancário real, restauração/PITR integral, MFA/e-mail real e metas de cobertura por domínio até existirem evidências próprias.

### Resultado da simulação E2E anterior ao deploy

A regressão contra o backend remoto ainda antigo terminou com **47 aprovados, 17 reprovados, 6 ignorados e 1 não executado**. Os erros reproduziram exatamente o drift que este lote corrige: `get_my_user_empresas` ausente/não allowlisted, leitura de `security_alerts` negada pelo bridge e CORS com origem Lovable obsoleta. Esse resultado não foi reclassificado como falha das correções locais e também não foi chamado de verde; ele obriga a repetição após SQL + Edge.

## Fotografia de auditoria anterior ao lote (histórico)

> As contagens e afirmações desta seção descrevem o canônico antes do lote acima. Elas permanecem para rastreabilidade, mas não representam o estado local mais recente.

**Não: todas as melhorias ainda não foram implementadas e validadas integralmente.** Há entregas relevantes comprovadas no GitHub e no banco, mas continuam existindo falhas de isolamento, contratos ausentes, diferenças de deploy e funcionalidades incompletas. O resultado é **42 etapas parciais, 2 dependentes de configuração/evidência externa, 6 sem demonstração integral do objetivo e nenhuma com C4 comprovado**. Isso não significa que nada foi entregue; significa que os critérios cumulativos de encerramento não foram satisfeitos.

Esta revisão substitui as afirmações de estado atual do relatório anterior, preservado como histórico. Inclui consulta direta ao Supabase canônico, comparação de bundles implantados, resultados do CI de main, revisão dos objetivos e testes positivos/negativos das 50 etapas e novas simulações. Não equivale à execução de todos os 700 checkboxes, pentest completo ou homologação fiscal/bancária.

- Corte de evidência: 12/09/2026, aproximadamente 16:45–16:54 UTC.
- Local: `a72b251ccb693f593fa147a48cb667e15553cdc6`.
- `origin/main`: `b2456863a41db5023c0604e99a25e6786e599e69`.
- Os dois commits têm a mesma árvore: `5d4e0818e74f4e140ccb586d386ff7f1dc2b71fc`. Os históricos diferem pelo merge; o conteúdo versionado é igual antes dos documentos desta revisão.
- [PR #100](https://github.com/adm01-debug/Departamento_Pessoal_V3/pull/100) integrada às 16:45:18 UTC. Não permanece aberta.
- Banco identificado pelo MCP correto: `frjbfeamybqsejlvmqbl`. Nesta rodada o banco **foi acessado**.
- Consultas remotas somente de diagnóstico; simulações de papel em transação READ ONLY/ROLLBACK, EXPLAIN sem ANALYZE e OPTIONS sem efeito de negócio. Não foram alterados dados, funções, migrations, secrets, deploys ou regras do GitHub.
- `AUDIT_REPORT.pdf`, já modificado, foi preservado. Não executei o build local que o regenera.

Requisitos: [plano de 50 etapas](PLANO_MELHORIAS_50_ETAPAS_2026-09-10.md). Snapshot sanitizado: [evidências estruturadas](REVISAO_POS_EXECUCAO_50_2026-09-12.evidencias.json). Os demais relatórios não devem ser usados como fotografia atual sem confrontar seus SHA, data e alvo.

## 1. O que está comprovadamente entregue

| Entrega                              | Evidência atual                                                                                                           | Limite do aceite                                                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Integração do código ao GitHub       | PR #100 MERGED; árvores local/main idênticas                                                                              | Não sincroniza automaticamente SQL ou bundles Edge                                                                        |
| Tipos da aplicação, testes e E2E     | Três passos de typecheck aprovados no CI de main                                                                          | Não valida os contratos reais do banco nem executa navegador                                                              |
| Testes unitários                     | 468 arquivos, 4.898 testes aprovados no CI de main                                                                        | Cobertura de statements 61,46%, branches 56,52%, funções 54,31%, linhas 65,72%; não demonstra a meta por domínio de risco |
| Lint                                 | Job aprovado                                                                                                              | Comando permite até 18 warnings e não cobre integralmente Edge                                                            |
| Helpers Edge                         | 81 testes no CI; 84 nesta revisão incluindo agenda                                                                        | Não são testes completos dos handlers HTTP                                                                                |
| Migrations P0                        | Nove scripts de simulação no CI aprovados                                                                                 | Fixture isolada não significa que todas as migrations foram implantadas                                                   |
| Sete migrations recentes no canônico | Ledger registra hashes, lockout, chave de folha, views e três ajustes de search_path                                      | Rate limit e vínculo de empresas ainda não implantados                                                                    |
| Hashes/pgcrypto                      | Search-path audit e smoke dos 13 triggers passaram no CI contra o canônico                                                | Smoke verifica ligação/resolução de digest; não todos os efeitos, dados e tentativas de adulteração                       |
| Lockout                              | `check_account_lockout(text)` e `record_login_attempt(text,boolean,text)` presentes e sem EXECUTE para anon/authenticated | Reset público, rate limit e Auth implantado ainda exigem correção                                                         |
| Chaves de folha                      | UNIQUE `(empresa_id,competencia,tipo)` em folhas e `(folha_id,colaborador_id)` em itens                                   | Não corrige o contrato separado de provisões                                                                              |
| Views endurecidas                    | 44 views públicas com security_invoker; as 42 da allowlist foram tratadas                                                 | Uma ACL anônima residual e uma regressão funcional detalhadas abaixo                                                      |
| Relatórios/alertas/agendador         | Bundles das versões 6/7/6 têm 27 ocorrências de arquivos exatamente iguais às locais                                      | Não comprova secrets, autorização real, entrega, CORS ou idempotência                                                     |
| CSV de relatório                     | Neutralização de fórmulas implementada, teste aprovado                                                                    | Truncamento e outros exportadores não certificados                                                                        |
| Relatório manual                     | Clone movido antes da leitura: defeito de bodyUsed corrigido                                                              | Novo caso de streaming aberto continua pendente                                                                           |
| Calendário e resultado de agenda     | Fuso explícito, fevereiro/dia 31, não antecipar e contagem de falhas corrigidos                                           | Virada de dia, recuperação de atraso e duplicidade continuam pendentes                                                    |
| Alertas                              | Ausência de alertas retorna sucesso sem prometer e-mail; consultas principais verificam erros                             | Autorização RH, limites de destinatários e respostas de erro ainda incompletos                                            |
| Logs e backup                        | Redator central e rejeição de backup parcial têm código e testes locais                                                   | Não há restore integral ou validação de todos os sinks/Storage                                                            |

O [CI de main](https://github.com/adm01-debug/Departamento_Pessoal_V3/actions/runs/34706193697) está **reprovado**, especificamente em RLS sobre PII. [Security](https://github.com/adm01-debug/Departamento_Pessoal_V3/actions/runs/34706193754) passou. [Playwright](https://github.com/adm01-debug/Departamento_Pessoal_V3/actions/runs/34706193740) abortou antes do navegador por falta dos quatro secrets E2E.

Há agora deploy Vercel marcado **Production/success**, associado ao SHA de main, deployment GitHub `6412002461`. Portanto, a afirmação anterior de “somente preview disponível” ficou superada. Deploy aprovado não é homologação funcional: o preflight do endereço desse deployment foi recusado, conforme RV-12.

## 2. Banco: progresso real e divergências remanescentes

O catálogo atual tem **363 tabelas públicas, 44 views, 206 overloads SECURITY DEFINER, 50 jobs cron ativos e 369 registros no ledger**. O checkout tem **654 arquivos SQL**. Não interpretei `654 - 369` como número de mudanças pendentes: versões, nomes e efeitos precisam ser reconciliados individualmente.

| Migration recente aplicada        | Versão no ledger canônico |
| --------------------------------- | ------------------------- |
| `p0_hash_trigger_search_path`     | `20260912142449`          |
| `p0_auth_lockout_contract`        | `20260912142506`          |
| `p0_payroll_upsert_contract`      | `20260912142520`          |
| `p0_views_revoke_public`          | `20260912143019`          |
| `p0_secdef_search_path`           | `20260912143239`          |
| `p1_function_search_path`         | `20260912143344`          |
| `p0_pgcrypto_routine_search_path` | `20260912144208`          |

Esses timestamps remotos diferem dos nomes locais porque foram atribuídos na aplicação pelo Supabase. O sucesso dessas sete aplicações não é uma reconciliação do histórico. `p0_restore_atomic_rate_limit` e `p0_bridge_membership_authorization` não aparecem no ledger; os objetos requeridos correspondentes também estão ausentes.

O advisor não aponta mais search_path mutável, mas há 23 rotinas SECURITY DEFINER executáveis por anon e 113 por authenticated. **Esses totais não são contagens de vulnerabilidades exploradas**: rotinas de token e triggers têm contratos diferentes. Existem oito tabelas com RLS sem policy, sete delas partições de auditoria; negar acesso direto à partição pode ser correto. Não criar policies permissivas para deixar o advisor verde. Persistem avisos de pgaudit em public e proteção contra senhas vazadas desativada. Consulte os [advisors de funções](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [RLS sem policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) e [proteção de senha](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## 3. Achados que impedem encerrar o plano

P0/P1 abaixo são prioridades de correção e impedimentos de go-live; não constituem relato de vazamento de dados reais. O owner declarou massa descartável, e não foram exportados registros pessoais.

### RV-01 — P0: tenant ainda derivado de metadata controlável pelo usuário

`public.user_empresa_id()` retorna primeiro `auth.jwt()->'user_metadata'->>'empresa_id'`, antes de consultar vínculos. Em transação READ ONLY, sob role authenticated e claims inteiramente sintéticas, retornou o UUID arbitrário informado, sem depender de vínculo. Há 13 policies que referenciam esse helper, incluindo admissões, folha, ponto, desligamentos, exames e benefícios.

Isso confirma a decisão insegura do helper no banco; não foi executada uma exploração HTTP completa nem lida PII de outro tenant. A documentação oficial distingue [user_metadata editável e app_metadata administrada](https://supabase.com/docs/guides/database/postgres/row-level-security). O `get_auth_empresa_id()` atual usa **app_metadata**, não user_metadata: não atribuir a ele a mesma vulnerabilidade sem examinar o emissor e a atualização dos claims.

Aceite: identidade/tenant server-owned e vínculos validados; nenhum fallback para metadata livre; testes reais de metadata adulterada, sem empresa, revogação de vínculo e T1/T2 por tabela/RPC. Etapas 005/006/023/035.

### RV-02 — P0: tokens públicos enumeráveis e falso negativo na allowlist do auditor

Em `medidas_ciencia_tokens`, anon pode selecionar a coluna token e atualizar used_at. A policy SELECT exige apenas `used_at IS NULL AND expires_at > now()`; a UPDATE permite a mesma seleção com `WITH CHECK used_at IS NOT NULL`. Não existe exigência server-side de apresentar o segredo correto. Não há policy restritiva compensatória.

Uma contagem sob role anon, sem fornecer token, executou e retornou **0 tokens ativos**. Não houve extração de tokens nem atualização. O conjunto estar vazio hoje não torna o predicado seguro para tokens futuros.

`scripts/audit-rls-pii.mjs:94` isenta a tabela com a justificativa de que o cliente sempre filtra pelo token. Essa justificativa é incorreta: um consumidor da API pode omitir o filtro. Assim, o próprio gate omite um risco relevante.

Aceite: retirar acesso direto anônimo à tabela; expor fluxo controlado que verifica segredo/hash, expiração, finalidade e consumo único atomicamente; listar colunas mínimas; testar listagem sem token, token inválido, replay e duas confirmações concorrentes. Corrigir a allowlist com teste que detecte o defeito. Etapas 006/027/029/035/039.

### RV-03 — P0: policies permissivas preservam leituras amplas

As tabelas `audit_log`, `cnab_configuracoes` e `historico_rescisoes` possuem SELECT para authenticated com predicado `true`, com grant de leitura efetivo. Em CNAB também há uma policy escopada por empresa, mas a policy permissiva aberta continua autorizando o caminho alternativo.

O CI encontrou **17 policies sobre PII sem isolamento comprovado**. Esse scanner é heurístico: não tratar todos os 17 itens como exploits, nem todos os usos de JWT como forjáveis. A presença de `auth.uid()` no texto também não prova correlação correta. Os três casos acima foram confrontados diretamente com ACL/RLS.

Aceite: substituir a policy aberta, revisar a combinação efetiva das policies e validar matriz de leitura/escrita por papel/tenant. Corrigir falsos positivos e negativos do scanner sem dispensar proteção. Etapas 004/005/006/035.

### RV-04 — P1: callers atuais dependem de RPCs não implantadas

Não existem no catálogo `get_my_user_empresas`, `set_own_default_empresa` e `admin_associar_usuario_empresa`. O hook `src/hooks/useEmpresas.ts:145`, `:275` e `:296` chama exatamente essas RPCs; a migração progressiva local já as define, mas não foi aplicada. A leitura de vínculos lança erro; seleção padrão/associação também não cumprem o novo contrato.

Também faltam `pode_gerir_rh_para` e `pode_gerir_pessoas_para`. `_shared/authz.ts:70` depende delas. `requireRh` nega quando a primeira RPC falha e só recupera pelo teste de admin global. Consequência: um RH legítimo não-admin não está homologado e pode ser recusado por relatórios/alertas já implantados. `is_admin` e `user_belongs_to_empresa` existem, mas não substituem os contratos ausentes.

Aceite: simular/aplicar dependências SQL específicas antes dos callers; confirmar assinaturas, grants e retorno; provar admin, RH, comum, sem vínculo e T2 via endpoint implantado. Não introduzir fallback privilegiado para ocultar erro. Etapas 003/013/020/022/023/030/034.

### RV-05 — P0/P1: Auth ainda não tem cadeia completa de proteção

O reset legado `reset_login_attempts(text,text)` é SECURITY DEFINER, executável por anon/authenticated, e atualiza o bloqueio do identificador recebido sem autorização interna. Não o executei. `edge_rate_limit_check` está ausente; o helper local usa fallback em memória por instância. Ele admite requisições degradadas e não garante limite distribuído — chamá-lo de fail-closed integral é impreciso.

Além disso, os quatro arquivos do bundle `auth-login` v19 diferem do local, inclusive AST. As correções novas não estão certificadas nesse endpoint remoto. A mera restauração das duas RPCs não fecha E50-008.

Aceite: remover reset público preservando recuperação legítima; rate limit atômico aplicado; deploy coordenado de Auth; testes de cinco falhas, expiração, reset autorizado, corrida, reinício de instância e acesso direto ao Auth. Etapas 005/008/013/022/030/036.

### RV-06 — P1: fechamento de views deixou uma regressão funcional

Todas as 44 views têm security_invoker. Há uma com SELECT anon: `v_system_health`, cuja definição exige admin; seu SELECT LIMIT 0 sob anon falhou com 42501 por `has_role`. Portanto, **ACL residual não prova exposição de dados**. A afirmação de “zero ACL anon em todas as views” seria incorreta; o resultado de zero era limitado às 42 tratadas.

`SELECT * FROM public.v_audit_trail LIMIT 0` sob authenticated falhou com **42501: permission denied for table users**. A view passou a depender das permissões do chamador sobre `auth.users`. Não conceder SELECT amplo em auth.users como atalho, apesar da sugestão genérica retornada pelo erro.

Aceite: decidir caller/contrato da view; projection pública minimizada e RLS ou RPC com autorização estrita; retestar papéis legítimos e indevidos. Não foi confirmado um caller ativo de v_audit_trail nesta rodada, portanto o alcance na UI permanece a mapear. Etapas 004/021/034/035.

### RV-07 — P1: provisões e cálculo em lote continuam incompatíveis com o catálogo

`src/services/folha/provisoesService.ts:80` grava em **provisoes_folha**, enviando `valor_total` e ON CONFLICT `(empresa_id,colaborador_id,competencia)`. A tabela existe, mas não tem essa coluna nem índice único composto. EXPLAIN do INSERT/ON CONFLICT, sem executar a escrita, reproduziu **42P10**. Não confundir essa tabela com `provisoes_mensais`.

`src/services/folha/calculoLoteService.ts:58` pede relação com `contratos_trabalho`, inexistente. A chave de folha corrigida não resolve essa consulta. No outro caminho, `calcular-provisoes/index.ts:201` faz DELETE e INSERTs em chamadas separadas, embora o comentário diga “atômico”; erro após DELETE ou dois processamentos concorrentes podem deixar resultado parcial/duplicado.

Aceite: escolher contrato/tabela canônicos, alinhar colunas/relacionamentos/chave, substituir múltiplas chamadas por operação transacional e provar reconciliação/retry/concorrência. Não certificar os cálculos legais só por testes aritméticos. Etapas 013/020/024/026/036.

### RV-08 — P1: autoria de agendamento não é controlada pelo servidor

`relatorios_agendados.created_by` não tem default, é inserível/atualizável por authenticated e não há trigger de autoria; somente updated_at. As policies controlam vínculo à empresa, não a identidade do autor. A UI preenche created_by, mas o chamador pode alterar o payload da API.

`enviar-relatorio/index.ts:241` usa o created_by persistido como identidade na autorização do despacho interno. Isso cria risco de personificação de RH/admin por agendamento. O fluxo também não compara integralmente ativo, ocorrência e parâmetros. Não foi executado envio forjado; o risco depende dos caminhos de despacho e papéis disponíveis.

Aceite: autoria server-owned e imutável, autorização de criação/edição/destino e revalidação de ocorrência; teste membro comum forjando autor/RH e alterando parâmetros. Etapas 006/023/028/035.

### RV-09 — P1: agenda continua sujeita a duplicidade e perda de ocorrência

Agora falhas contam como falhas, mas não existe claim transacional/lease/outbox por ocorrência em `processar-agendamentos/index.ts:150`. Dois processadores podem selecionar a mesma agenda antes de avançar proximo_envio. Em relatórios, auditoria é escrita depois do provedor; falha de auditoria retorna 500 após possível aceite do e-mail. Log/ultimo_envio ainda não verificam todos os erros e ultimo_envio também avança no caminho de falha.

Simulação do helper real: atraso de 10 minutos às 10:00 para agenda 09:50 é aceito; atraso de 10 minutos às 00:00 para agenda 23:50 é recusado. `shouldRunSchedule` reconstrói o horário no dia atual, perdendo a ocorrência do dia anterior. Atraso de 31 minutos também é recusado; ainda falta política explícita de recuperação/backlog.

Aceite: ocorrência persistida, claim único e transacional, chave idempotente no provedor, estados de aceite/entrega/erro distintos, retries seguros e testes concorrentes, virada de dia/semana/mês e indisponibilidade prolongada. Etapas 016/028/036/045.

### RV-10 — P1: limite de streaming ainda pode esperar indefinidamente pelo clone

O limite por bytes UTF-8 foi corrigido. Entretanto, `_shared/contract.ts:217` aguarda `reader.cancel()` após ultrapassar o limite. `enviar-relatorio/index.ts:189` mantém outra ramificação com req.clone(). Em streaming deixado aberto, com mais de 256 KiB já recebidos, o parser permaneceu pendente no teste de 300 ms; só retornou 413 quando a outra ramificação foi cancelada. Com corpo completo e fechado, retornou 413 normalmente.

Essa é uma simulação local do parser real em Deno, não um teste de carga contra o serviço. O caso representa cliente que continua a transmissão ou deixa o corpo aberto. Os dois testes atuais do parser não cobrem clone + stream aberto.

Aceite: rejeição e liberação de recursos com prazo limitado, sem depender de clone não consumido; teste de stream aberto, bytes excessivos, cliente lento, abort e conteúdo inválido. Etapas 031/032/033/039.

### RV-11 — P1: correção CNAB protege troca simples, mas não toda resposta obsoleta

`CNABDialog.tsx:43` compara apenas o ID atual antes de aceitar a resposta. Isso corrige A→B simples e impede salvar draft de outro tenant, porém não invalida request já iniciado ao fechar o modal nem distingue A→B→A ou duas cargas da mesma empresa. Uma resposta antiga de A pode substituir dados mais recentes de A. O comentário afirma invalidar fechamento, mas open/generation não são consultados após o await.

Os oito testes de CNAB somente verificam renderização; o mock de Dialog não implementa abertura/fechamento. Os 80 testes dirigidos passaram, mas isso não exercita essas corridas. Achado confirmado por análise de fluxo; não foi realizado pagamento nem mutação bancária.

Aceite: identidade de request/generation, descarte de respostas obsoletas no sucesso/erro/finally e testes com promises controladas, A→B→A, fechar/reabrir e save durante recarga. Etapas 021/028/033/036/041.

### RV-12 — P1: CORS e contratos de erro ainda não estão fechados

O código usa getCorsHeaders(req) em mais retornos, mas os três handlers retornam `rateLimitResponse(rl)` sem req. requireRh também produz erros sem request, e `validateRequest` perde req no erro de schema. Esses caminhos usam a origem primária estática. Em alertas, `parseJsonBody` tem errorResponse descartada: erro 400/413 pode ser apresentado como empresa obrigatória/422.

Probe somente OPTIONS em enviar-relatorio: a origem do deployment Vercel Production `https://departamento-pessoal-v3-mhejv14gc-juca1.vercel.app` recebeu **403 sem allow-origin**, assim como a origem hostil de controle. Isso comprova que essa URL específica não pode fazer a chamada cross-origin direta; não prova falha de todos os aliases nem de um eventual proxy same-origin. Os valores dos secrets de allowlist não foram consultados.

Aceite: estabelecer domínio canônico de browser, autorizar somente origens deliberadas e propagar request em todos os retornos 2xx/4xx/5xx; testar no deployment real. Não abrir wildcard nem liberar todos os previews. Etapas 003/028/031/032/037.

### RV-13 — P1: UI ainda pode apresentar dados agregados ou saúde enganosa

`MorningBriefing.tsx:49` usa cache sem empresa, queries sem filtro de empresa selecionada e ignora erros da coleta. Falta de eventos/erro vira saúde eSocial de 100. A empresa foi acrescentada à ação de envio, não à leitura. `services/tabelas/viewsService.ts` ainda tem 16 retornos vazios em catch. Falha de autorização/SQL pode parecer ausência legítima de dados.

`feriasService.syncWithHub():101` só faz SELECT limitado e retorna success/recordsUpdated=0; `FeriasPage` anuncia sincronização concluída. Não é sincronização efetiva. A página também preserva page ao trocar filtros/pesquisa; os handlers não chamam setPage(1). Relatórios mantêm limit(5000) sem contrato explícito de truncamento.

Aceite: cache/filtro por identidade e empresa, estados de indisponibilidade distintos de vazio, sync real ou capacidade renomeada/desativada, paginação/completude e testes de mudança de tenant, erro e página fora de faixa. Etapas 021/026/028/033/041/043/045.

### RV-14 — P1: deploy Edge não corresponde integralmente ao repositório

Há 60 entrypoints locais e 59 funções remotas; **metabase-embed ausente**. Foram comparados cinco bundles, 38 ocorrências de arquivos, não todos os 59. Os três bundles recém-publicados são exatamente iguais ao local. Auth-login difere nos quatro arquivos. Bridge difere em cinco de sete arquivos, incluindo index, validation, contract, CSRF e rateLimit; as diferenças não se restringem a comentários/formatação, pois as ASTs também divergem.

Doze funções estão com verify_jwt=false embora não façam parte das quatro exceções locais: alertas-dp, assistente-ia, consultarCEP, consultarCNPJ, external-db-bridge, folha-metrics, gerar-aej, importacao, metricas, processar-ponto, validar-biometria e alertas-preditivos. Webhook está true no remoto e false no contrato local, podendo impedir o contrato de autenticação externa pretendido. Flag false isolada não demonstra endpoint sem autenticação: verificar os guards internos.

Aceite: manifest de todos os bundles, dependências, JWT/import-map/config; SQL primeiro, deploy depois; decidir cada exceção e verificar retorno por caller. Os secrets também precisam de inventário de presença/fingerprint, sem valores. Etapas 003/009/013/030/031/047.

### RV-15 — P1: capacidades e rotinas de infraestrutura permanecem incompletas

- PCS: nenhuma tabela/relação `pcs_%` e nenhuma função `pcs_%` no canônico; `pcsService.ts` possui callers de planos, fatores, avaliações, grades e impacto. Frontend implementado não significa backend entregue.
- Storage: 18/19 buckets, faltando backups. Dos existentes, 17 privados e avatars público; vários sem limite próprio configurado. Não foram testados MIME/magic bytes, owner, links assinados ou limite global de Storage.
- Cron: 50 jobs ativos; no histórico disponível dos últimos sete dias, nove jobs registraram falhas, incluindo 29 de purge-rate-limits-hourly. Faltam as funções sec_audit_policies_scan, sec_policy_regressions_purge e sec_verify_seals_scan usadas pelos três jobs de segurança. Existência/ativação não comprova execução correta.
- Há 12 CHECKs NOT VALID e dois triggers de folhas_pagamento desabilitados: trigger_alerta_divergencia e trigger_gerar_provisao. NOT VALID não significa que novas gravações estejam livres da checagem; significa que o acervo não está validado. Não habilitar triggers sem testar efeitos e duplicação.
- Transporte produtivo eSocial não implementado no ramo examinado: simulação explícita existe e o ramo real falha fechado. Isso é contenção correta, não transmissão homologada.
- Não há nova prova nesta rodada de duas restaurações integrais equivalentes, recovery de Storage/Auth/config, PITR operacional ou reconciliação completa do ledger.

Aceite: completar ou desativar deliberadamente capacidades, recuperar dependências e comprovar execução/restore com manifest. Etapas 002/010/011/012/014/015/016/017/019/028/048.

### RV-16 — P1: os gates atuais não sustentam a declaração de 10/10

O CI de main reprovou em PII e pulou os auditores seguintes de menor privilégio, tenant-open, SECURITY DEFINER e embeds. Passos pulados não estão aprovados. O job Edge tolerou erros em 18 funções: alertas-preditivos, assistente-ia, auditoria, calcular-folha, cnab-remessa, consultarCEP, consultarCNPJ, criptografia, distribuir-holerites, fechar-folha, gerar-ltcat-os, gerar-pgr, healthcheck, metricas, pix-lote, reabrir-folha, validar-biometria e webhook.

O arquivo scheduleContract.test.ts tem três testes que passaram localmente, mas o glob do CI não inclui a pasta processar-agendamentos. Testar helper de idempotência com mock não comprova idempotência do agendador que não o utiliza. Cobertura global de 61,46% não deve virar pontuação de qualidade por si só.

O ruleset está ativo e pede uma aprovação, mas tem bypass permanente de usuário, strict_required_status_checks_policy=false, e E2E/build não são required checks. A PR foi integrada e a Vercel publicou mesmo com CI/E2E reprovados; não inferi qual mecanismo exato autorizou o merge. Instalação usa npm install; Actions/runtime não estão integralmente fixados por digest/SHA. O pipeline não é hermético.

SUPABASE_DB_URL agora existe, mas a presença no secret manager não prova role de menor privilégio. O job injeta a URL no ambiente e executa código do PR; não há verificação de que a role é somente auditora. Não obtive o conteúdo do secret. A conexão MCP desta revisão usa postgres com BYPASSRLS; isso não identifica automaticamente o usuário da URL do CI. Também não há prova atual de revogação das credenciais anteriormente expostas.

Aceite: role de auditoria restrita, confiança delimitada do workflow, ratchet bloqueante de tipos/testes reais, quatro identidades E2E, checks obrigatórios adequados e evidência de rotação. Nunca relaxar a asserção para aceitar erro de objeto ausente como negação válida. Etapas 001/033/034/035/037/038/041/047/050.

## 4. Matriz completa de revisão das 50 etapas

Legenda: **P** = implementação/artefato parcial; **B** = configuração ou comprovação externa pendente; **NE** = objetivo integral não demonstrado. NE não significa que nenhum arquivo exista. Nenhuma classe equivale a C4. Para as etapas sem nova execução ponta a ponta, a tabela explicita a limitação, em vez de inferir conclusão pela existência de código.

| Etapa                          | Estado | Entrega identificada e critério que falta                                                                                                                  |
| ------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E50-001 Credenciais            | B      | Segredos fora do relatório; revogação das antigas e atualização dos consumidores não comprovadas. RV-16.                                                   |
| E50-002 Recuperação            | P      | Export/baseline/runbooks e backup fail-closed existem; restore integral do estado atual e bloqueio de entrada de PII não demonstrados. RV-15.              |
| E50-003 Canônico/Git           | P      | MCP canônico e árvore main/local confirmados, PR integrada; SQL/Edge/CORS ainda divergentes. RV-04/12/14.                                                  |
| E50-004 Views                  | P      | 42 tratadas, 44 invoker; v_audit_trail quebra para authenticated e ACL health requer decisão. Falta matriz funcional. RV-03/06.                            |
| E50-005 SECURITY DEFINER       | P      | Search_path endurecido e RPCs lockout restritas; reset aberto, helper metadata e autorização não auditada em todos os 206 overloads. RV-01/05.             |
| E50-006 RLS/ACL                | P      | Gates/rebaseline existem; policies true, token enumerável e autoria livre impedem fechamento. RV-01/02/03/08.                                              |
| E50-007 Hashes/triggers        | P      | Migrações e smoke de 13 hashes passam; decidir dois triggers desabilitados e validar escrita/imutabilidade reais. RV-15.                                   |
| E50-008 Lockout/rate limit     | P      | Duas RPCs restauradas; remover reset público, implantar rate limiter e Auth atualizado, testar fluxo/distribuição. RV-05.                                  |
| E50-009 Manifest físico        | P      | Inventários e snapshot atual existem; falta fingerprint determinístico completo com diff bloqueante de DB/Edge/config. RV-14/15.                           |
| E50-010 Classificação de drift | P      | Histórico/classificação e nova revisão disponíveis; falta decisão individual por divergência/capacidade e cobertura integral de consumidores.              |
| E50-011 ADR baseline           | NE     | Runbook existe; não demonstrada aprovação/reprodução independente da estratégia final de corte, histórico e promoção.                                      |
| E50-012 Baseline               | P      | Teste estrutural de cinco camadas passa; não comprova DDL atual completo, ordem funcional ou restauração vazia integral. RV-15.                            |
| E50-013 RPCs/tabelas           | P      | Lockout/chaves aplicados; vínculos, authz, rate limit e contratos funcionais ainda faltam. RV-04/05/07/15.                                                 |
| E50-014 PCS                    | P      | UI/service/types presentes; tabelas e RPCs PCS ausentes no canônico. Completar ou retirar explicitamente. RV-15.                                           |
| E50-015 Storage                | P      | 18 buckets presentes; falta backups e testes 19/19 de owner, MIME, tamanho, path, links e remoção. RV-15.                                                  |
| E50-016 Cron                   | P      | 50 jobs existentes e helper de calendário melhorado; dependências ausentes, falhas recentes, duplicidade e virada de dia. RV-09/15.                        |
| E50-017 Constraints/triggers   | P      | Chaves de folha corrigidas; 12 CHECKs NOT VALID e dois triggers desabilitados, sem aceite de todos os efeitos. RV-07/15.                                   |
| E50-018 Índices/EXPLAIN        | NE     | Inventários e diagnóstico EXPLAIN disponíveis; não há benchmark antes/depois por workload, P95, escrita e locks.                                           |
| E50-019 Restore/ledger         | NE     | 654 SQLs/369 registros e sete aplicações comprovadas; duas restaurações equivalentes e reconciliação individual não demonstradas.                          |
| E50-020 Tipos/contratos        | P      | App/testes/E2E verdes; tipos não impedem RPC, coluna, FK e chave ausentes no ambiente real. Falta codegen/paridade certificada. RV-04/07.                  |
| E50-021 Acesso a dados         | P      | Services/guards existem; erros viram vazio, cache mistura contexto e faltam contratos uniformes. RV-06/11/13.                                              |
| E50-022 Sessão/MFA             | P      | Guards e contratos locais testados; Auth remoto antigo, reset público, RPCs ausentes e jornadas MFA/recovery não executadas. RV-04/05.                     |
| E50-023 RBAC/ABAC              | P      | Helper central implementado; RPCs de RH ausentes, autoria de agenda livre e metadata não confiável. RV-01/04/08.                                           |
| E50-024 Engine de folha        | P      | Upsert de folhas/itens alinhado; provisões/contratos em lote e transação da engine continuam pendentes. RV-07.                                             |
| E50-025 Ponto antifraude       | P      | Código/testes de validação e idempotência existentes; sem jornada real de offline, replay, dispositivo, vínculo e fechamento concorrente.                  |
| E50-026 Férias/benefícios      | P      | Fluxos/documentos existentes; sync é leitura, filtros preservam página e fontes/cálculos não conciliados integralmente. RV-07/13.                          |
| E50-027 Rescisão/assinaturas   | P      | Fluxos e pgcrypto corrigidos parcialmente; token público e ciclo one-time/pagamento não homologados. RV-02.                                                |
| E50-028 Integrações            | P      | Relatórios/alertas mais honestos; transporte eSocial real ausente, agenda/CNAB/CORS e provas de provedores pendentes. RV-07–15.                            |
| E50-029 SST/LGPD               | P      | UI/SQL existentes; policies de dados sensíveis/tokens e cron LGPD falham; DSAR/acesso médico/retenção não certificados. RV-02/03/15.                       |
| E50-030 Deploy Edge            | P      | Três bundles novos iguais; Auth/bridge divergentes, Metabase ausente, 13 diferenças de JWT e secrets não recertificados. RV-14.                            |
| E50-031 Segurança Edge         | P      | Helpers e gates implementados; dependências de authz, CORS, parser e flags remotas impedem aceite uniforme. RV-04/10/12/14.                                |
| E50-032 Validação/uploads      | P      | Bytes UTF-8 e CSV corrigidos; stream/clones, propagação de erro e scanner/quarentena/magic bytes sem aceite integral. RV-10/12.                            |
| E50-033 Unitários por risco    | P      | 4.898 testes CI, 80 dirigidos e 84 Deno passam; regressões escapam dos testes e faltam mutation/coverage por risco. RV-09–13/16.                           |
| E50-034 Integração real        | P      | SQL catálogo, role simulations, EXPLAIN e smokes reais executados; baseline/Auth/Storage/cron/handlers completos não certificados.                         |
| E50-035 Matriz RLS             | P      | Scanner CI reprova e simulações confirmam problemas; matriz completa de papéis/CRUD/T1/T2/HTTP ainda não demonstrada. RV-01–06/08.                         |
| E50-036 Concorrência           | P      | Helper e chaves pontuais testados; agenda sem claim, provisões não transacionais, token/CNAB sem provas concorrentes completas. RV-02/07/09/11.            |
| E50-037 E2E                    | B      | Workflow existe e falha fechado; quatro secrets/identidades ausentes, nenhuma jornada executada neste run. RV-16.                                          |
| E50-038 Supply chain           | P      | Security/CodeQL aprovados; instalação não hermética e SBOM/licenças/rotação/artefato implantado sem aceite integral nesta rodada.                          |
| E50-039 Threat model/pentest   | NE     | Revisão adversarial e reproduções existem; não houve pentest completo nem reteste de todas as cadeias e papéis.                                            |
| E50-040 Arquitetura            | P      | Refatorações locais presentes; não demonstrados boundaries/ciclos/clones integralmente bloqueantes e decomposição por domínio.                             |
| E50-041 Lint/tipos             | P      | Regressão TS2554 anterior resolvida e três typechecks verdes; 18 Edge com erros tolerados, any/supressões e races remanescentes. RV-11/16.                 |
| E50-042 Bundle/PWA/mobile      | P      | Build/preview anteriores aprovados e deploy Production atual; LCP/INP/CLS, cold cache, SW e entrega mobile não homologados.                                |
| E50-043 Queries/paginação      | P      | Selects/limites/cursors parciais; truncamento de relatório e cache/contexto; sem P95/EXPLAIN de workload grande. RV-13.                                    |
| E50-044 Logs/PII               | P      | Redator central tem testes locais; falta comprovar redaction em todos os sinks/Edge, retenção e operação.                                                  |
| E50-045 Health/SLO/alertas     | P      | Contagens de agenda e no-alerts melhoradas; falso 100 no briefing, jobs falhos e incidentes/SLO sem homologação integral. RV-09/13/15.                     |
| E50-046 Acessibilidade         | P      | Componentes/testes existem; sem prova completa de axe, teclado, foco, leitores, contraste, zoom e dispositivos.                                            |
| E50-047 CI/proteção            | P      | Ruleset ativo e gates SQL adicionados; main/Production publicados com CI/E2E vermelhos, bypass, tipagem tolerada e secrets/instalação a restringir. RV-16. |
| E50-048 Staging/DR             | NE     | Canônico autorizado para massa descartável, mas essa autorização não demonstra PITR, restore, rollback, RTO/RPO ou promoção imutável.                      |
| E50-049 Governança/docs        | P      | Planos/revisões existem; atualizar fatos por SHA/data/objeto, ownership e critérios, eliminando contradições entre versões.                                |
| E50-050 Recertificação         | NE     | P0/P1 atuais, CI/E2E reprovados e testes operacionais pendentes impedem encerramento. Não foi atribuída nova nota.                                         |

## 5. Funções sugeridas, não entregues e parcialmente entregues

| Classe                                                          | Capacidades                                                                                      | Decisão necessária                                                                                                                  |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Código local, dependência canônica ausente                      | Vínculos de empresa, autorização RH, rate limiter, PCS, Metabase                                 | Preparar SQL/contratos, testar e implantar; não anunciar capacidade operacional só pelo frontend                                    |
| Promessa sem operação implementada no caminho examinado         | Sync de férias com hub; transporte produtivo eSocial                                             | Implementar transporte real ou renomear/desabilitar com indisponibilidade explícita                                                 |
| Implementação parcial com defeitos confirmados                  | Provisões/lote, agenda/relatórios, CNAB assíncrono, briefing, tokens de ciência                  | Corrigir os RV acima e adicionar testes que primeiro reproduzam o defeito                                                           |
| Entregas concretas, aceite integral pendente                    | Hashes, views, lockout, logs redigidos, backup fail-closed, CSV, contratos de entrega            | Preservar as correções; completar testes de comportamento, autorização e operação                                                   |
| Integração externa não homologada nesta revisão                 | FGTS Digital, DCTFWeb, PIX, gov.br, Bitrix/ERP, WhatsApp/e-mail, BI, IA/OCR/biometria e webhooks | Evidência de sandbox/provedor, recibo, isolamento, timeout/replay e recuperação; distinguir preparar arquivo de transmitir/liquidar |
| Sugestão histórica sem requisito de produto aprovado localizado | CAGED/RAIS, SMTP próprio, Telegram, Stripe e possibilidades adicionais                           | Decidir escopo em E50-010; não transformar menção em obrigação ou defeito automaticamente                                           |
| Entrega transversal não demonstrada integralmente               | Mobile, i18n, BPMN/BI completos, acessibilidade e DR                                             | Definir aceites observáveis por plataforma/capacidade antes de declarar pronto                                                      |

## 6. Ajustes do plano e ordem recomendada de retomada

1. **Conter os P0:** rotação comprovada, RLS/metadata, tokens enumeráveis, reset público. Não receber dados reais enquanto os riscos persistirem.
2. **Fechar dependências antes do deploy:** vínculos, authz RH, rate limit e contratos de provisões/folha. Simular cada migration delimitada e provar assinatura/grants/rollback; não fazer db push ou repair massivo.
3. **Retestar as regressões:** view de auditoria, streaming clonado, calendário/ocorrência, autoria/concorrência de agenda, CNAB A→B→A, briefing e erros de coleta.
4. **Convergir runtime:** comparar todos os bundles/flags/imports e preservar secrets existentes; confirmar domínio e CORS real. Não usar sucesso de Vercel como aceite do Supabase.
5. **Recuperar capacidades incompletas:** cron/dependências, Storage 19/19, PCS e sync/fiscal; completar ou desabilitar deliberadamente.
6. **Fortalecer prova permanente:** remover falso negativo de tokens no auditor; diferenciar user_metadata de claims administradas; incluir testes da agenda e handlers no CI; fazer auditores reportarem todos os resultados sem ignorar falhas.
7. **Configurar E2E seguro:** identidades sintéticas e secrets, matriz de papel/tenant, escrita descartável delimitada, sem credenciais no chat/relatório. Verificar role restrita de SUPABASE_DB_URL, não apenas sua existência.
8. **Recuperação e aceite:** duas restaurações, manifest físico/ledger/config, dados/Auth/Storage, testes de concorrência e provedor, rollback e operação. A autorização para o canônico é reconhecida; não substitui essas evidências.
9. **Governança:** substituir links de “revisão vigente”, resolver a meta escrita de ≥8,0 versus pedido de 10/10 com rubrica objetiva, explicitar como a exceção de ambiente atende aos checkpoints e definir executor/revisor por item. Não inventar nota nem fechar C4 por deploy.
10. **Recertificar no mesmo artefato:** CI, Security, E2E, SQL, Edge e browser em versões rastreáveis; registrar aceites positivos e negativos, decisão de go/no-go e pendências sem disfarçá-las como concluídas.

### Regra de conclusão de cada etapa

Cada item precisa registrar `E50/subitem → SHA/objeto → ambiente → cenário positivo/negativo → resultado → rollback → revisor → link`. Uma migration aplicada pode encerrar sua implementação delimitada sem encerrar a etapa inteira. A contagem atual do documento é 4 checkboxes marcados e 696 abertos; isso mede manutenção documental, não percentual funcional. Nenhum checkbox foi marcado em massa nesta revisão.

## 7. Verificações executadas e limites finais

- Git: fetch de origin/main, status, identidade de árvores, PR, ruleset, runs, deployment e nomes de secrets. Nenhum push/merge ou secret escrito.
- Banco: identificação, ledger, functions/ACL/RLS, triggers, constraints/índices, Storage e cron; simulações SQL somente leitura e EXPLAIN sem executar INSERT. Sem exportação de PII ou credenciais.
- Edge: lista completa de 59 remotas e 60 locais; download/comparação de cinco bundles; comparação exata e AST das 38 ocorrências. Não certifica hashes de todos os bundles nem secrets.
- CI no SHA de main: 4.898 testes, três typechecks e lint aprovados; PII falha, E2E bloqueado, 18 erros Edge tolerados. CI e Security são evidências distintas.
- Local: seis arquivos Vitest/80 testes; 84 Deno; validação estrutural do plano/231 checks; auditor de alvo canônico; teste estrutural de baseline. As simulações adicionais expuseram streaming e virada de dia apesar das suítes verdes.
- Não repetido: restore completo, aplicação de todas as 654 migrations, full schema diff, escrita de fixtures no canônico, teste de provedor financeiro/fiscal, pentest, acessibilidade manual ou jornadas de navegador. Por isso os respectivos aceites permanecem abertos.
- Graphify foi utilizado para localizar relações; seu subgrafo truncado/histórico não foi usado como prova de ausência ou conclusão. As conclusões acima se apoiam no source e nas evidências executadas.

**Decisão: plano ainda em execução; não há suporte técnico para declarar 10/10 ou encerrar o go-live. O avanço está demonstrado, e as lacunas restantes estão separadas de funcionalidades realmente ausentes e de validações ainda não realizadas.**
