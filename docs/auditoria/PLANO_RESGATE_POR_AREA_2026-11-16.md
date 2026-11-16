# Plano de resgate por área — branch `muri`

Roteiro produzido em 2026-11-16 por auditoria por área, com **verificação
adversarial de cada veredito de "recuperar"**: um segundo agente tentou refutar
cada decisão lendo o código das duas pontas. Cada grupo é uma unidade que entra
ou sai junto, e o plano de cada um é executável sem reler a branch inteira.

**Totais: 9 áreas, 108 grupos, 539 arquivos classificados** — 62 RECUPERAR_COM_MERGE, 25 RECUPERAR, 18 OBSOLETO, 3 JA_EM_MAIN.

Decisões:

- **RECUPERAR** — arquivos novos; a `main` não tem nada nesse caminho.
- **RECUPERAR_COM_MERGE** — a `main` também mexeu ali. O ganho da `muri` entra
  **por cima** do que a `main` corrigiu, nunca substituindo.
- **JA_EM_MAIN** — a `main` já tem, com outro nome ou outra forma.
- **OBSOLETO** — descartar.

> Este documento é o roteiro, não a execução. Nada foi aplicado por ele.

## Por que não existe atalho

A `main` avançou 582 commits desde o merge-base (2026-07-30) e a `muri` 54,
parando em 2026-10-26. As duas mexeram nos mesmos arquivos em direções
diferentes: a `main` ganhou funcionalidade, a `muri` ganhou layout sobre o estado
de julho. O caso mais concreto está em Admissões — a versão da `muri` **traz de
volta três defeitos que a `main` já corrigiu**: arrastar para "Concluída" no
kanban deixa de criar o colaborador, o botão de transmitir o S-2200 volta a
mandar o id da admissão no lugar do id do evento, e o envio do link ao candidato
volta a dizer "enviado com sucesso" sem enviar e-mail. Por isso o veredito
dominante é RECUPERAR_COM_MERGE, e não cópia.

## Regra que vale para todos os grupos

**Tabela nova só fica acessível depois de entrar no catálogo da bridge.** O
`supabase` que a aplicação importa não é o cliente PostgREST: é o proxy da
`external-db-bridge` (`src/integrations/supabase/client.ts`), que é
deny-by-default pelo `TABLE_ALLOWLIST` de
`supabase/functions/external-db-bridge/tableCatalog.ts`. Sem a entrada lá, a
consulta volta HTTP 403 `TABLE_NOT_CATALOGED`
(`external-db-bridge/index.ts:464-471`) por mais correta que esteja a RLS, e
serviços que tratam erro silenciosamente devolvem lista vazia — a tela fica em
branco sem nenhum sinal de falha.

Isso já apareceu em dois grupos desta auditoria (`training_images` e
`colaborador_lotacoes`). Catalogar é mexer no gateway, item da regra 8 do
`AGENTS.md`: aprovação do dono, validação pelo cliente real da aplicação, e
nunca contornar com `supabaseBase`.

## Áreas

| área                                                                                                     | grupos | a recuperar | arquivos | detalhe                                                                                                                    |
| -------------------------------------------------------------------------------------------------------- | ------ | ----------- | -------- | -------------------------------------------------------------------------------------------------------------------------- |
| Camada de aplicacao de training images (edge functions, services, hook, scripts)                         | 12     | 9           | 80       | [resgate/camada-de-aplicacao-de-training-images-edge-func.md](resgate/camada-de-aplicacao-de-training-images-edge-func.md) |
| UI de treinamentos (src/components/treinamentos, src/pages/TreinamentosPage.tsx) — exceto trainingImages | 11     | 10          | 72       | [resgate/ui-de-treinamentos-src-components-treinamentos-s.md](resgate/ui-de-treinamentos-src-components-treinamentos-s.md) |
| Recrutamento e selecao                                                                                   | 11     | 9           | 52       | [resgate/recrutamento-e-selecao.md](resgate/recrutamento-e-selecao.md)                                                     |
| Dossiê do colaborador                                                                                    | 11     | 10          | 68       | [resgate/dossie-do-colaborador.md](resgate/dossie-do-colaborador.md)                                                       |
| Premiacoes e simulador de ROI                                                                            | 8      | 6           | 41       | [resgate/premiacoes-e-simulador-de-roi.md](resgate/premiacoes-e-simulador-de-roi.md)                                       |
| Admissoes, onboarding e kanban                                                                           | 13     | 11          | 33       | [resgate/admissoes-onboarding-e-kanban.md](resgate/admissoes-onboarding-e-kanban.md)                                       |
| Hooks, services e lib                                                                                    | 18     | 16          | 104      | [resgate/hooks-services-e-lib.md](resgate/hooks-services-e-lib.md)                                                         |
| Desligamentos, organograma e dashboards                                                                  | 13     | 9           | 59       | [resgate/desligamentos-organograma-e-dashboards.md](resgate/desligamentos-organograma-e-dashboards.md)                     |
| Documentacao                                                                                             | 11     | 7           | 30       | [resgate/documentacao.md](resgate/documentacao.md)                                                                         |

A lista completa de arquivos de cada grupo também está em formato de dados em
`PLANO_RESGATE_POR_AREA_2026-11-16.json`.
