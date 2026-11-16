# Camada de aplicacao de training images (edge functions, services, hook, scripts)

A infraestrutura de banco para capas de treinamento esta viva e rodando em producao hoje: as 3 tabelas (training_images, training_image_requests, training_image_settings), as 8 funcoes RPC, os 5 triggers (inclusive enqueue_training_image_course em catalogo_cursos e enqueue_training_image_learning_path em trilhas_aprendizado) e o bucket privado training-images existem — e a main nao tem UMA LINHA de codigo que use nada disso (git ls-tree -r --name-only origin/main \| grep -E 'trainingImages\|training-image' retorna vazio). A muri tem a metade de cima inteira e de boa qualidade: 2 Edge Functions, 13 modulos compartilhados Deno, a camada de leitura no cliente, um hook e um arsenal de testes/scripts, tudo coerente com o schema real (todas as colunas lidas pelo pipeline existem em producao, verificado). O risco aqui NAO esta no codigo de training images (que a main nao tem) e sim nos 3 arquivos de raiz e no _shared/rateLimit.ts que a muri arrasta junto: esses sao versoes ANTERIORES as correcoes de novembro e rebaixariam a main se copiados.

| decisão             | esforço | arq. | grupo                                                                                           |
| ------------------- | ------- | ---- | ----------------------------------------------------------------------------------------------- |
| RECUPERAR           | baixo   | 13   | G1 — Nucleo compartilhado do pipeline (Deno, _shared/trainingImages)                            |
| RECUPERAR_COM_MERGE | medio   | 5    | G2 — Edge Functions training-image-generate e training-image-dispatch + registro no config.toml |
| RECUPERAR_COM_MERGE | medio   | 1    | G3 — Rate limit duplo (empresa + usuario) em _shared/rateLimit.ts                               |
| RECUPERAR_COM_MERGE | medio   | 8    | G4 — Camada de LEITURA de capas no cliente (service + hook)                                     |
| OBSOLETO            | baixo   | 7    | G5 — Sub-camada de GERACAO no cliente (provider/request/briefing/hash) — morta por construcao   |
| RECUPERAR_COM_MERGE | alto    | 6    | G6 — Testes Vitest que cobrem o pipeline do servidor e o SQL ja aplicado                        |
| RECUPERAR           | baixo   | 13   | G7 — Bateria de testes SQL em Postgres efemero local                                            |
| RECUPERAR_COM_MERGE | baixo   | 6    | G8 — Roteiro de homologacao (scripts + pg_cron + e2e Playwright)                                |
| RECUPERAR_COM_MERGE | baixo   | 1    | G9 — Variaveis de ambiente de exemplo (.env.example)                                            |
| RECUPERAR_COM_MERGE | alto    | 3    | G10 — Onde a capa aparece na tela (TrainingCover + ligacao na TreinamentosPage)                 |
| OBSOLETO            | baixo   | 3    | G11 — Arquivos de configuracao de raiz da muri (package.json, tsconfig.json, vitest.config.ts)  |
| OBSOLETO            | baixo   | 14   | G12 — Artefatos descartaveis de captura (tmp-training-images/)                                  |

## G1 — Nucleo compartilhado do pipeline (Deno, _shared/trainingImages)

`RECUPERAR` · esforço baixo · 13 arquivos

**Valor para o negócio.** E o motor que decide quando gastar dinheiro com a API de imagem e quando nao gastar. Sem ele, qualquer implementacao futura de capas comeca sem protecao contra cobranca duplicada.

**Risco de regressão.** Nenhum: a main nao tem arquivo com esse caminho, nada e sobrescrito. O unico efeito colateral e que `npm run typecheck:edge` e `npm run audit:edge-syntax` (gates reais da main, package.json) passam a cobrir 13 arquivos novos — se algum nao compilar no deno check, a CI reprova a PR, nao a producao.

**Evidência.** Diretorio inexistente na main: `git ls-tree -r --name-only origin/main \| grep -E 'trainingImages\|training-image'` => saida vazia. Coerencia com o schema real verificada no canonico frjbfeamybqsejlvmqbl: supabaseDeps.ts:36 le catalogo_cursos(id,nome,descricao,categoria,modalidade,carga_horaria,obrigatorio,empresa_id) e supabaseDeps.ts:62 le trilhas_aprendizado(id,nome,descricao,nivel,empresa_id) + trilhas_cursos(ordem,curso_id) — information_schema.columns confirma TODAS essas colunas. storagePath.ts:17-22 PASTA_POR_TIPO = courses/learning-paths/training-sessions/certificates e identico ao v_pasta do SQL em 20261023120000_training_images_infrastructure.sql (migration ja na main). Nenhum global Deno fora de quotas.ts e allowlist.ts (no allowlist.ts a mencao esta so em comentario, linha 15).

**Plano.** 1) Copiar os 13 arquivos verbatim de origin/muri para supabase/functions/_shared/trainingImages/ (git show origin/muri:<caminho> > <caminho>). Nao editar conteudo. 2) Rodar `npm run typecheck:edge` e `npm run audit:edge-syntax`. Se o deno check reclamar do pin de supabase-js em supabaseDeps.ts:14 (https://esm.sh/@supabase/supabase-js@2.45.0), alinhar o pin ao usado pelas outras funcoes da main antes de insistir — nunca afrouxar o gate. 3) Nao mexer em deno.lock sem necessidade: scripts/typecheck-edge.sh:22 exporta DENO_NO_PACKAGE_JSON=1 e usa --frozen. 4) Este grupo sozinho nao faz nada rodar: ele so vira codigo vivo com o G2.

<details><summary>Arquivos (13)</summary>

- `supabase/functions/_shared/trainingImages/allowlist.ts`
- `supabase/functions/_shared/trainingImages/briefing.ts`
- `supabase/functions/_shared/trainingImages/estadoCapa.ts`
- `supabase/functions/_shared/trainingImages/hash.ts`
- `supabase/functions/_shared/trainingImages/imageValidation.ts`
- `supabase/functions/_shared/trainingImages/openaiProvider.ts`
- `supabase/functions/_shared/trainingImages/pipeline.ts`
- `supabase/functions/_shared/trainingImages/quotas.ts`
- `supabase/functions/_shared/trainingImages/simulatedProvider.ts`
- `supabase/functions/_shared/trainingImages/storagePath.ts`
- `supabase/functions/_shared/trainingImages/supabaseDeps.ts`
- `supabase/functions/_shared/trainingImages/types.ts`
- `supabase/functions/_shared/trainingImages/uuid.ts`

</details>

## G2 — Edge Functions training-image-generate e training-image-dispatch + registro no config.toml

`RECUPERAR_COM_MERGE` · esforço medio · 5 arquivos

**Valor para o negócio.** E o unico caminho pelo qual uma capa chega a existir. Hoje nenhuma chega. As duas respondem 503 e nao gastam nada enquanto TRAINING_IMAGE_GENERATION_ENABLED / TRAINING_IMAGE_AUTOQUEUE_ENABLED / OPENAI_API_KEY nao estiverem configurados no servidor (training-image-generate/index.ts, bloco 'integracao desligada por padrao'; training-image-dispatch/index.ts, bloco de flags que responde 503 ANTES de reivindicar a fila).

**Risco de regressão.** O risco nao esta nos index.ts e sim no config.toml. `.github/workflows/canonical-edge-functions.yml:4-8` faz auto-deploy em push para main quando `supabase/functions/**` muda, e a linha 96 do proprio workflow avisa: se `supabase/config.toml` tambem mudar, o deploy real republica o INVENTARIO COMPLETO de Edge Functions, nao so as duas novas. Isso toca toda a producao de uma vez. Alem disso config.toml e `.github/` sao caminhos de code owner (AGENTS.md secao 6) e mexer em deploy e item da regra 8 do Fluxo Git.

**Evidência.** As duas funcoes nao existem na main (ls-tree vazio). A main tem TODOS os helpers compartilhados que elas importam, com assinatura compativel: _shared/contract.ts:122 handlePreflight(req), :131 createErrorResponse(message,status,code,fields?,req?) — a chamada em training-image-generate/index.ts usa exatamente 5 argumentos; :170 parseJsonBody(req,maxBytes) devolve {body?,errorResponse?}; _shared/csrf.ts:37 verifyCsrf(req). O UNICO import incompativel e checkRateLimitDuplo/rateLimitDuploResponse, que e o G3. config.toml: origin/muri:supabase/config.toml:8-13 tem os dois blocos ([functions.training-image-generate] verify_jwt=true e [functions.training-image-dispatch] verify_jwt=false com a justificativa na linha 11); origin/main:supabase/config.toml nao tem nenhuma mencao a training (grep vazio). project_id identico nas duas pontas (frjbfeamybqsejlvmqbl).

**Plano.** 1) Copiar os 4 arquivos das duas pastas de funcao verbatim. 2) NAO substituir supabase/config.toml: abrir o arquivo da main e APENDAR apenas os dois blocos de origin/muri:supabase/config.toml:8-13, preservando o resto (project_id, demais [functions.*]). Manter o comentario de justificativa do verify_jwt=false — AGENTS.md secao 5 exige justificativa no config.toml. 3) Validar: `npm run typecheck:edge`, `npm run audit:edge-syntax`, `npm run lint:edge`. 4) Este grupo NAO compila sem o G3 (checkRateLimitDuplo nao existe na main). Fazer G3 na mesma PR ou antes. 5) PR DEIXAR ABERTA para o dono (regra 8): o merge dispara republicacao do inventario completo de Edge Functions por causa do config.toml. Escrever isso explicitamente no corpo da PR com o link para canonical-edge-functions.yml linha 96. 6) Nao configurar nenhum segredo de OpenAI nesta tarefa: as duas funcoes ficam em 503 e isso e o estado desejado.

<details><summary>Arquivos (5)</summary>

- `supabase/functions/training-image-generate/index.ts`
- `supabase/functions/training-image-generate/README.md`
- `supabase/functions/training-image-dispatch/index.ts`
- `supabase/functions/training-image-dispatch/README.md`
- `supabase/config.toml`

</details>

## G3 — Rate limit duplo (empresa + usuario) em _shared/rateLimit.ts

`RECUPERAR_COM_MERGE` · esforço medio · 1 arquivos

**Valor para o negócio.** Sem isso um usuario sozinho consegue consumir a cota de geracao de imagem da empresa inteira, e uma empresa consegue consumir a cota de outra. O teto por tenant e o que protege a fatura.

**Risco de regressão.** ALTO se copiado inteiro: a main perde a validacao da resposta do RPC, volta a ter o bug do reset no fallback, volta a queimar token da janela principal em rejeicao de burst, e dezenas de Edge Functions param de compilar por causa da assinatura de rateLimitResponse. Nenhum se feito como merge aditivo.

**Evidência.** ESTE E O FALSO POSITIVO DA AREA. O arquivo da muri e 236+/107- linhas diferente da main e PARECE melhor (tem o rate limit duplo que a main nao tem), mas e uma versao ANTERIOR as correcoes da main em 3 pontos concretos, todos no diff `git diff origin/main:supabase/functions/_shared/rateLimit.ts origin/muri:...`: (a) a main tem `isValidRpcResult(value, expectedLimit)` validando a resposta do RPC; a muri faz `const rpc = data as RpcResult` (cast cego). (b) a main reserva o token de burst ANTES da janela do banco, com o comentario 'A request rejected for a full burst must not consume one token from the database-backed main window'; a muri consome a janela principal mesmo quando o burst rejeita. (c) no fallback em memoria a main devolve `reset: slot.windowStart + opts.windowSec` com o comentario 'Return the end of the active fallback window, not `now`'; a muri devolve `windowStart + opts.windowSec` onde windowStart = now - windowSec, ou seja `now` — o bug que a main corrigiu. (d) assinatura: origin/main:supabase/functions/_shared/rateLimit.ts:188 `rateLimitResponse(result, req?)`; a muri removeu o parametro req. `git grep -n 'rateLimitResponse(' origin/main -- supabase/functions` lista dezenas de chamadas com 2 argumentos (OCR/index.ts:94, adiantamento-salarial/index.ts:72, auth-login/index.ts:63 e :95, calcular-folha/index.ts:100, ...). Substituir o arquivo quebraria todas. Lado bom: o RPC que o codigo novo chama JA EXISTE em producao — pg_proc tem `edge_rate_limit_check_dual(p_empresa_key text, p_empresa_limit integer, p_usuario_key text, p_usuario_limit integer, p_window_sec integer, p_now bigint)` — e a migration `20261023140000_edge_rate_limit_dual.sql` JA ESTA NA MAIN (com sidecar .verify.sql que a muri nem tem).

**Plano.** PROIBIDO `git checkout origin/muri -- supabase/functions/_shared/rateLimit.ts`. Partir do arquivo da MAIN e APENAS ACRESCENTAR, no fim dele, os 4 simbolos novos extraidos de origin/muri:supabase/functions/_shared/rateLimit.ts: `RateLimitDuploOptions` (linha 141), `RateLimitDuploResult` (150), `RpcDuploResult`, o helper `slotDeMemoria`, `checkRateLimitDuplo` (191) e `rateLimitDuploResponse` (290). Regras do transplante: (1) manter intactos checkRateLimit, isValidRpcResult, memoryFallback, consumeBurst e a assinatura `rateLimitResponse(result, req?)` da main; (2) NAO trocar o import `getCorsHeaders` da main pelo `corsHeaders` da muri — em rateLimitDuploResponse usar `getCorsHeaders(req)` e, para isso, acrescentar um parametro `req?: Request` nessa funcao nova e passar `req` nas duas chamadas (training-image-generate/index.ts usa `return rateLimitDuploResponse(rateLimit)`); (3) reaproveitar o `RateLimitRpcClient` que a main ja tem em vez de redeclarar; (4) aplicar em checkRateLimitDuplo a mesma validacao de forma que a main usa em checkRateLimit, em vez do cast cego. Verificar com `npm run typecheck:edge` (deve compilar as ~60 funcoes da main, nao so as duas novas). Nenhuma migration e necessaria: o RPC dual ja esta em producao.

<details><summary>Arquivos (1)</summary>

- `supabase/functions/_shared/rateLimit.ts`

</details>

## G4 — Camada de LEITURA de capas no cliente (service + hook)

> **Pré-requisito que faltava neste plano.** O `supabase` que o serviço importa
> **não é o cliente PostgREST**: é o proxy da `external-db-bridge`
> (`src/integrations/supabase/client.ts`, `dbBridgeProxy`), e a bridge é
> deny-by-default pelo `TABLE_ALLOWLIST` de
> `supabase/functions/external-db-bridge/tableCatalog.ts`. Sem `training_images`
> nesse catálogo, a leitura volta HTTP 403 `TABLE_NOT_CATALOGED`
> (`external-db-bridge/index.ts:464-471`), o serviço engole o erro e devolve
> mapa vazio — ou seja, com a flag ligada **nenhuma capa apareceria**, por mais
> correto que estivessem GRANT e RLS. Catalogar a tabela é mexer no gateway, item
> da regra 8: vai com aprovação do dono, e **nunca** contornando a bridge com
> `supabaseBase`. Já corrigido na PR que recupera esta área.

`RECUPERAR_COM_MERGE` · esforço medio · 8 arquivos

**Valor para o negócio.** E o que faz a capa aparecer para o usuario: uma consulta por empresa, URLs assinadas de 1h renovadas antes de expirar, e heranca automatica (turma e certificado usam a capa do curso, entao nunca se paga imagem por turma).

**Risco de regressão.** Baixo no comportamento (desligado por padrao pela flag), alto na CI se copiado verbatim por causa do ratchet de any. src/hooks/index.ts precisa de merge de UMA linha, nao substituicao: a versao da main tem 8 exports (useDebounce...useIsMobile) e a da muri e de antes.

**Evidência.** Nenhum desses arquivos de trainingImages existe na main. O caminho de leitura e enxuto e fecha-falha: service.ts `carregarImagensDaEmpresa` filtra status='succeeded', valida que o storage_path comeca pelo empresa_id (validarCaminhoDaEmpresa) e devolve MAPA_IMAGENS_VAZIO em qualquer erro; useTrainingImages.ts fica com `enabled: habilitado && Boolean(empresaId)` e config.ts:imagensDeTreinamentoHabilitadas() le VITE_TRAINING_IMAGES==='true' — sem a flag NENHUMA consulta sai. Coerente com producao: a tabela tem as 5 colunas lidas (content_type, content_id, source_content_id, storage_path, status) e `GRANT SELECT ON public.training_images TO authenticated` esta na migration ja aplicada. BLOQUEIO CONCRETO DE CI: service.ts faz `await (supabase as any).from('training_images')` porque training_images nao esta em src/integrations/supabase/database.types.ts (grep 'training_image' nos types das DUAS pontas => vazio). A main roda `audit:ratchet-any` no ci:verify e scripts/.any-baseline.json e `{"types": 1}` — ou seja, orcamento ZERO de any para src/services e src/hooks. scripts/ratchet-any.mjs:9 'Nenhum diretorio pode subir'. Esse unico `as any` reprova a PR.

**Plano.** 1) Copiar verbatim config.ts, paths.ts, types.ts. 2) Copiar storage.ts e REMOVER dele `enviarImagemGerada` e `validarArquivoDeCapa` (so servem a sub-camada morta do G5); manter urlAssinadaDoCaminho e assinarCaminhosDaEmpresa. 3) Copiar service.ts e REMOVER `solicitarGeracaoImagem`, os mapas `emAndamento`/`tentativas`, `podarControle`, `chaveControle`, `limparControleDeGeracao`, `TENTATIVAS_MAX` e os imports de ./provider e ./request; manter carregarImagensDaEmpresa, resolverImagemDoMapa, mensagemSeguraDoErro, MAPA_IMAGENS_VAZIO. 4) MATAR O `as any`: trocar `(supabase as any).from('training_images')` por um shim tipado local, sem `any` — por exemplo declarar `type LinhaImagem = {...}` (ja existe no arquivo) e chamar `supabase.from('training_images' as never).select(...)` com o retorno estreitado por `as unknown as { data: LinhaImagem[] \| null; error: unknown }`. Depois rodar `npm run audit:ratchet-any` e confirmar que src/services continua em 0. 5) Reescrever src/services/trainingImages/index.ts para reexportar SO o que ficou (remover os blocos de provider, briefing, request e os exports enviarImagemGerada/validarArquivoDeCapa/solicitarGeracaoImagem/TENTATIVAS_MAX/limparControleDeGeracao). 6) src/hooks/index.ts: acrescentar UMA linha `export { useTrainingImages } from "./useTrainingImages";` ao arquivo da main, sem tocar nas outras 8. 7) Rodar `npm run typecheck && npm run typecheck:tests && npm run lint:ci` (lint:ci da main e --max-warnings=1, muito mais apertado que o 18 da muri). 8) Sem o G10 esta camada le dados que nenhuma tela mostra — util so se o G10 ou o grupo do Hub de Treinamentos entrar.

<details><summary>Arquivos (8)</summary>

- `src/services/trainingImages/config.ts`
- `src/services/trainingImages/paths.ts`
- `src/services/trainingImages/types.ts`
- `src/services/trainingImages/storage.ts`
- `src/services/trainingImages/service.ts`
- `src/services/trainingImages/index.ts`
- `src/hooks/useTrainingImages.ts`
- `src/hooks/index.ts`

</details>

## G6 — Testes Vitest que cobrem o pipeline do servidor e o SQL ja aplicado

`RECUPERAR_COM_MERGE` · esforço alto · 6 arquivos

**Valor para o negócio.** Sao a unica prova automatizada de que o dinheiro nao vaza: pipeline.test.ts tem suites de 'concorrencia e idempotencia' e 'autorizacao e isolamento'; migration.test.ts tem a suite 'migration — nao destrutiva'. Sem eles o G1 e o G2 entram sem rede.

**Risco de regressão.** Dois pontos reais. (1) typecheck: como a main typechecka testes e a muri nao, os 6 arquivos podem acusar erros que nunca apareceram na muri — e preciso rodar e corrigir, nao presumir verde. (2) cobertura: `npm run test` da main usa vitest.config.ts com thresholds lines 72 / functions 57 / branches 61 / statements 68 (ratchet da main); a muri baixou para 65/53/55/60. NUNCA trocar o vitest.config.ts (ver G11) — rodar com o da main e conferir que a cobertura nao caiu abaixo do gate.

**Evidência.** Nao sao testes de codigo inexistente: 4 deles cobrem o G1 e o SQL que JA ESTA em producao. pipeline.test.ts:9 importa ../../../../supabase/functions/_shared/trainingImages/simulatedProvider; openaiProvider.test.ts:8-10 importa simulatedProvider e types do _shared; allowlist.test.ts:4-5 importa allowlist e uuid do _shared; migration.test.ts le com readFileSync os 3 arquivos SQL (:16 20261023120000_training_images_infrastructure.sql, :199 20261023130000_training_image_autoqueue.sql, :259 20261023140000_edge_rate_limit_dual.sql) — os TRES ja estao na main. Os imports cruzando para supabase/functions sao seguros: varri briefing/hash/imageValidation/types/pipeline/simulatedProvider/openaiProvider/allowlist/uuid/estadoCapa/storagePath e nao ha nenhum global Deno real nem import remoto https:// (a unica mencao a Deno.env em allowlist.ts esta no comentario da linha 15); quem importa esm.sh e so supabaseDeps.ts, que nenhum desses testes importa. Atencao a diferenca de gate: origin/muri:tsconfig.json EXCLUI `src/**/*.test.ts` e `src/**/__tests__/**` do typecheck; origin/main:tsconfig.json NAO exclui, e a main ainda roda typecheck:tests com tsconfig.tests.json. Ou seja: na muri esses testes nunca foram typecheckados, na main serao.

**Plano.** 1) Copiar os 6 arquivos para src/services/trainingImages/**tests**/. 2) trainingImages.test.ts: remover as partes que exercitam a sub-camada morta (imports de definirTrainingImageProvider e solicitarGeracaoImagem e os casos das linhas ~138-230 e ~381-407); manter o que cobre carregarImagensDaEmpresa, resolverImagemDoMapa, isolamento por empresa e o trainingImagesQueryKey/invalidarCapasDeTreinamento (linhas 4 e 464). 3) guardrails.test.ts: as assercoes que leem src/services/trainingImages/provider.ts (:51) e o trecho de solicitarGeracaoImagem em service.ts (:57) precisam ser reapontadas para supabase/functions/_shared/trainingImages/openaiProvider.ts, ou removidas; a assercao que le .env.example (:64) depende do G9. 4) Rodar, nesta ordem, `npm run typecheck`, `npm run typecheck:tests`, `npm run test` e `npm run audit:ratchet-any-tests`. Corrigir o que aparecer — a main typechecka testes, a muri nao typecheckava. 5) Nao tocar em vitest.config.ts nem em tsconfig.json.

<details><summary>Arquivos (6)</summary>

- `src/services/trainingImages/__tests__/pipeline.test.ts`
- `src/services/trainingImages/__tests__/openaiProvider.test.ts`
- `src/services/trainingImages/__tests__/allowlist.test.ts`
- `src/services/trainingImages/__tests__/migration.test.ts`
- `src/services/trainingImages/__tests__/guardrails.test.ts`
- `src/services/trainingImages/__tests__/trainingImages.test.ts`

</details>

## G7 — Bateria de testes SQL em Postgres efemero local

`RECUPERAR` · esforço baixo · 13 arquivos

**Valor para o negócio.** Prova, antes de ligar a geracao paga, que duas execucoes simultaneas nao geram (e nao cobram) duas imagens do mesmo curso. E o teste que o dono mais vai querer ter rodado antes de autorizar gasto.

**Risco de regressão.** Nenhum no sistema: diretorio novo, fora de todo gate, com banco proprio em 127.0.0.1. O unico cuidado e nao copiar o package.json da muri (ver G11).

**Evidência.** Nenhum existe na main. Nao toca producao: run-tests.mjs sobe um Postgres proprio e fala so com 127.0.0.1 (linhas 18 'Requisitos: binarios do PostgreSQL (initdb, pg_ctl, psql)', 122-125 psqlBase com host 127.0.0.1), e os testes de concorrencia usam 2 sessoes psql simultaneas (:12). Sao os unicos testes que exercitam o claim atomico e o FOR UPDATE SKIP LOCKED de verdade — o que o Vitest nao consegue fazer. Nenhum gate da main lint/typechecka scripts/: lint:ci e `eslint src --ext ts,tsx` e tsconfig.json tem include:["src"].

**Plano.** 1) Copiar os 13 arquivos verbatim para scripts/training-images-local/. 2) No package.json DA MAIN, acrescentar APENAS estas 3 entradas em scripts, sem tocar em mais nada: "test:images:local": "node scripts/training-images-local/run-tests.mjs", "test:images:pipeline": "npx --yes deno run -A scripts/training-images-local/pipeline-e2e.ts", "test:images:http": "node scripts/training-images-local/edge-http-test.mjs". Nao usar bun em lugar nenhum (AGENTS.md secao 8: npm unico). 3) NAO acrescentar nenhum desses 3 scripts ao ci:verify da main — eles exigem binarios de Postgres e de Deno na maquina. 4) Rodar `npm run test:images:local` uma vez localmente e reportar o resultado real (passou / faltou binario), sem afirmar verde sem ter rodado.

<details><summary>Arquivos (13)</summary>

- `scripts/training-images-local/bootstrap.sql`
- `scripts/training-images-local/seed.sql`
- `scripts/training-images-local/claim.test.sql`
- `scripts/training-images-local/autoqueue.test.sql`
- `scripts/training-images-local/rate-limit.test.sql`
- `scripts/training-images-local/rls.test.sql`
- `scripts/training-images-local/concurrency-autoqueue.sql`
- `scripts/training-images-local/concurrency-claim.sql`
- `scripts/training-images-local/concurrency-dual.sql`
- `scripts/training-images-local/concurrency-rate-limit.sql`
- `scripts/training-images-local/run-tests.mjs`
- `scripts/training-images-local/edge-http-test.mjs`
- `scripts/training-images-local/pipeline-e2e.ts`

</details>

## G8 — Roteiro de homologacao (scripts + pg_cron + e2e Playwright)

`RECUPERAR_COM_MERGE` · esforço baixo · 6 arquivos

**Valor para o negócio.** E o procedimento passo a passo que permite ligar a geracao sem queimar dinheiro: valida Auth, RLS, Storage, fila e o 503 com as flags desligadas ANTES de existir qualquer OPENAI_API_KEY.

**Risco de regressão.** Os 3 .sql do scheduler NAO podem ser aplicados nesta tarefa: criam funcao e job pg_cron em producao. AGENTS.md secao 5 proibe DDL fora do canonical-migrations.yml e a regra 8 do Fluxo Git exige o dono. O e2e, se copiado sem o G10, fica como teste de um atributo que nenhum componente emite — permanentemente skipado, mas e teste de codigo inexistente.

**Evidência.** Nenhum existe na main. Os arquivos sao conservadores por desenho: o README declara que scheduler-enable.sql e homolog.mjs 'nao executam agora' e que homolog.mjs exige HOMOLOG_CONFIRM=SIM. O e2e e auto-desligado: `const habilitado = process.env.E2E_TRAINING_IMAGES_HOMOLOG === '1'` e `test.skip(!habilitado, ...)` — a main ja tem 15 specs em e2e/authenticated/ e um tsconfig.e2e.json com gate typecheck:e2e. DUAS DEPENDENCIAS EXTERNAS AO GRUPO: (a) o README aponta para docs/treinamentos-imagens-homologacao.md, que existe na muri mas NAO na main (`git ls-tree origin/main \| grep treinamentos-imagens` => vazio) — link quebrado se o grupo de docs nao entrar; (b) o spec procura `[data-training-cover][data-training-cover-estado="imagem"]`, atributo emitido pelo TrainingCover, que e o G10. Observacao de banco: scheduler-enable.sql cria a ponte dispatch_training_image_worker() e um job pg_cron a cada 2 min — isso e DDL em producao.

**Plano.** 1) Copiar os 5 arquivos de scripts/training-images-homolog/ verbatim — sao arquivos de roteiro, nao execucao. NAO rodar scheduler-enable.sql nem homolog.mjs. 2) No README, se o grupo de docs nao entrar na mesma leva, trocar o link `docs/treinamentos-imagens-homologacao.md` por uma nota de uma linha dizendo que o procedimento detalhado esta na branch muri — nao deixar link morto. 3) e2e/authenticated/training-images-homolog.spec.ts: copiar SOMENTE se o G10 entrar na mesma PR ou antes; caso contrario deixar de fora e anotar como pendencia (seria teste de componente inexistente). Se copiar, rodar `npm run typecheck:e2e` e confirmar que ele e skipado sem E2E_TRAINING_IMAGES_HOMOLOG=1, para nao pintar a suite de vermelho. 4) Os 3 scheduler-*.sql ficam no repositorio como procedimento documentado e sao item da regra 8: PR aberta, decisao do dono, e quando autorizado a ativacao vai por canonical-migrations.yml, nunca por psql ou MCP.

<details><summary>Arquivos (6)</summary>

- `scripts/training-images-homolog/README.md`
- `scripts/training-images-homolog/homolog.mjs`
- `scripts/training-images-homolog/scheduler-status.sql`
- `scripts/training-images-homolog/scheduler-enable.sql`
- `scripts/training-images-homolog/scheduler-disable.sql`
- `e2e/authenticated/training-images-homolog.spec.ts`

</details>

## G9 — Variaveis de ambiente de exemplo (.env.example)

`RECUPERAR_COM_MERGE` · esforço baixo · 1 arquivos

**Valor para o negócio.** E a unica documentacao de qual interruptor liga o que. Sem ela ninguem sabe que existe VITE_TRAINING_IMAGES, nem que a chave da OpenAI e de servidor.

**Risco de regressão.** Substituir o .env.example da main perderia as variaveis que a main acumulou em 582 commits. Tem de ser append.

**Evidência.** origin/main:.env.example nao tem NENHUMA mencao a training (grep -i training => vazio). origin/muri:.env.example:34-58 documenta VITE_TRAINING_IMAGES=false (linha 41) e, comentadas, as 9 variaveis de servidor (TRAINING_IMAGE_GENERATION_ENABLED, _MODEL, _SIZE, _QUALITY, _TIMEOUT_MS, _RATE_LIMIT, _RATE_LIMIT_EMPRESA, _AUTOQUEUE_ENABLED, _DISPATCH_SECRET, _DISPATCH_BATCH) — exatamente as lidas por training-image-generate/index.ts e training-image-dispatch/index.ts. guardrails.test.ts:64 LE o .env.example e faz assercao sobre ele, entao sem este bloco aquele teste do G6 falha.

**Plano.** Abrir o .env.example da MAIN e APENDAR no fim o bloco de origin/muri:.env.example linhas 34-58, verbatim. Manter VITE_TRAINING_IMAGES=false e manter as 9 variaveis de servidor COMENTADAS. Nenhum valor real de segredo entra no arquivo (AGENTS.md secao 2, item 8). Nao remover nem reordenar nada do que ja esta la. Conferir depois que guardrails.test.ts (G6) passa.

<details><summary>Arquivos (1)</summary>

- `.env.example`

</details>

## G10 — Onde a capa aparece na tela (TrainingCover + ligacao na TreinamentosPage)

`RECUPERAR_COM_MERGE` · esforço alto · 3 arquivos

**Valor para o negócio.** E o unico ponto onde o dono VE o resultado. Sem este grupo, toda a cadeia G1-G4 funciona e grava capas que ninguem olha.

**Risco de regressão.** Substituir src/pages/TreinamentosPage.tsx pela versao da muri (1129 linhas contra 936 da main) seria a pior regressao possivel desta area: joga fora 582 commits de correcoes de novembro na pagina de Treinamentos para ganhar 2 blocos de useMemo. Tem de ser enxerto, nunca troca. E trazer TrainingCover.tsx isolado nao compila (2 imports ausentes).

**Evidência.** ESTE E O GRUPO QUE NAO FECHA SOZINHO — e a resposta direta a 'onde a UI mostra a capa': hoje, em lugar nenhum. (1) TrainingCover.tsx:5-6 importa `estiloCategoriaTreinamento` de ./TreinamentoBadges e `normalizarTexto` de ./treinamentosDerivacoes — os DOIS estao ausentes da main: `git ls-tree -r --name-only origin/main \| grep 'src/components/treinamentos'` devolve UM unico arquivo, TrilhaCursosSection.tsx. (2) Quem renderiza TrainingCover na muri sao 4 cards do Hub (CertificadoCard.tsx:42, TreinamentoCursoCard.tsx:92, TrilhaBanner.tsx:147, TurmaCard.tsx:110), todos ausentes da main. (3) A pagina da main nao tem onde encaixar capa: `grep -nE '<img\|cursos\.map' origin/main:src/pages/TreinamentosPage.tsx` nao acha nenhum <img> e mostra cursos sendo renderizados em <Table> (linha 665); as mesmas 6 abas existem (linhas 376-381), mas em tabela, nao em card. (4) A ligacao em si e minuscula e portavel: origin/muri:src/pages/TreinamentosPage.tsx:24 importa chaveConteudo, :26 importa useTrainingImages, :201 `const imagensTreinamento = useTrainingImages(empresaAtual?.id)`, :203-209 cursosComImagem e :222-227 trilhasComImagem. A main ja tem o que isso precisa: `const { empresaAtual } = useEmpresas()` na linha 121 e as queries de catalogo_cursos (149) e trilhas (154). (5) `imagem_url` e campo so em memoria — confirmado no canonico: catalogo_cursos e trilhas_aprendizado NAO tem coluna de imagem (consulta a information_schema => 0 linhas), coerente com o comentario da propria migration ('NENHUMA coluna nova em catalogo_cursos / trilhas_aprendizado').

**Plano.** Fazer em DUAS etapas, e a primeira depende de outro grupo. ETAPA A (bloqueada): TrainingCover.tsx so entra junto com TreinamentoBadges.tsx e treinamentosDerivacoes.ts — que pertencem ao grupo do Hub de Treinamentos (os ~60 arquivos de src/components/treinamentos/ da muri). Coordenar com quem avaliar aquele grupo; se o Hub nao entrar, NAO trazer TrainingCover nem o TrainingCover.test.tsx nem o e2e do G8, e registrar como pendencia explicita. ETAPA B (enxerto na pagina da main, 4 edicoes pontuais, so depois da A): no src/pages/TreinamentosPage.tsx DA MAIN — (i) acrescentar `import { chaveConteudo } from '@/services/trainingImages';` e `import { useTrainingImages } from '@/hooks/useTrainingImages';` aos imports existentes; (ii) logo depois da linha 121 (`const { empresaAtual } = useEmpresas()`), inserir `const imagensTreinamento = useTrainingImages(empresaAtual?.id);`; (iii) copiar os dois useMemo de origin/muri:src/pages/TreinamentosPage.tsx:203-209 e 222-227 adaptando os nomes de variavel aos da main (`cursos` da query da linha 149 e `trilhas` da 154) e trocando os casts `as CursoCatalogo[]`/`as TrilhaRegistro[]` por tipos que nao introduzam `any` — o ratchet nao permite; (iv) passar cursosComImagem/trilhasComImagem onde a main hoje usa cursos/trilhas. NAO reescrever a pagina, NAO renomear nada, NAO converter a tabela em cards nesta tarefa. Rodar `npm run typecheck`, `npm run lint:ci`, `npm run audit:ratchet-any` e, se rota ou menu tiverem mudado (nao devem), `npm run inventario:rotas`.

<details><summary>Arquivos (3)</summary>

- `src/components/treinamentos/TrainingCover.tsx`
- `src/components/treinamentos/__tests__/TrainingCover.test.tsx`
- `src/pages/TreinamentosPage.tsx`

</details>

## Descartado nesta área

- **G5 — Sub-camada de GERACAO no cliente (provider/request/briefing/hash) — morta por construcao** (`OBSOLETO`) — Codigo que nunca executa, nem na propria muri. `git grep -n 'definirTrainingImageProvider' origin/muri -- src` fora de provider.ts so acha testes (trainingImages.test.ts linhas 80,90,168,179,198,218,381,399) e um comentario em config.ts:10 e o reexport em index.ts:42 — nenhuma chamada em codigo de aplicacao. provider.ts:58 tem `configured: false` como padrao, e service.ts tem `if (!provider.configured) return { aceito: false, motivo: 'integracao_desativada' }`. Logo `solicitarGeracaoImagem` SEMPRE devolve integracao_desativada no navegador. `git grep -n 'solicitarGeracaoImagem' origin/muri -- src e2e scripts` confirma: so testes e o proprio service.ts. A logica real vive no servidor, em _shared/trainingImages/briefing.ts e hash.ts (G1), que e por onde a geracao de fato passa.
- **G11 — Arquivos de configuracao de raiz da muri (package.json, tsconfig.json, vitest.config.ts)** (`OBSOLETO`) — As tres versoes da muri sao anteriores e mais fracas, com evidencia no diff. package.json: a muri tem `"lint:ci": "eslint src --ext ts,tsx --max-warnings=18"` contra `--max-warnings=1` da main, e o ci:verify da muri e `bun run typecheck && bun run typecheck:tests && bun run typecheck:e2e && bun run lint:ci && bun run format:check:changed && bun run verificar:tipografia` — usa BUN (proibido, AGENTS.md secao 8: npm unico) e perde 10 gates que a main tem no ci:verify (audit:plan50, audit:canonical-project, audit:bridge-contract, audit:edge-audit-log, audit:edge-syntax, typecheck:edge, test:rebaseline, audit:ratchet-any, audit:types-drift, format:check:changed), alem de nao ter lint:edge, typecheck:edge, inventario:rotas, test:migrations* nem test:db-audit-contract. tsconfig.json: a muri ACRESCENTA ao exclude `src/**/*.test.tsx`, `src/**/*.test.ts` e `src/**/__tests__/**`, ou seja desliga o typecheck dos testes. vitest.config.ts: a muri BAIXA os thresholds de cobertura (lines 72->65, functions 57->53, branches 61->55, statements 68->60), troca @vitejs/plugin-react por -swc, volta `import.meta.dirname` para `__dirname` e remove o reporter json-summary.
- **G12 — Artefatos descartaveis de captura (tmp-training-images/)** (`OBSOLETO`) — `git ls-tree -r -l origin/muri \| grep training-image` mostra 12 PNGs somando ~2,5 MB (de 68 KB a 381 KB cada) num diretorio chamado literalmente tmp-, mais 2 scripts de apoio (capturar.mjs 2739 bytes, verificar-rede.mjs 1282 bytes). Nao aparecem na lista de ausentes que recebi e nenhum codigo de src/ ou supabase/ os referencia. Sao screenshots de captura manual em 3 resolucoes (1600x900, 768x1024, 390x844) das 4 abas, nao capas geradas pelo pipeline.

## Perda se a área for descartada inteira

Fica em producao uma infraestrutura paga e ativa que nao serve para nada: bucket privado criado, 3 tabelas, 8 RPCs, 2 triggers disparando em todo cadastro de curso e trilha (guardados por flag, autoqueue_enabled=false hoje) — e nenhum software que leia ou escreva nelas. Zero capa, zero geracao, zero leitura. Alem disso perde-se todo o aparato de controle de custo que foi o trabalho mais delicado dessa area: claim atomico, idempotencia por content_hash, politica conservadora de cobranca (resultado_desconhecido nunca e retentado automaticamente), rate limit duplo empresa+usuario, allowlist server-side de teste e um roteiro de homologacao com pg_cron. Reescrever esse conjunto do zero com o mesmo cuidado sobre dinheiro gasto em API de imagem e trabalho de semanas, nao de dias.
