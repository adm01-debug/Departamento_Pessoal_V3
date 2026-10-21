# Recuperação — feedbacks do ciclo TESTE DEFINITIVO

## Diagnóstico (2026-10-20)

O ciclo real `TESTE DEFINITIVO` é o UUID
`79bbf408-b400-4446-a9e2-50d13883379d` (empresa
`66104399-aba8-4105-bbd3-9bf67820c1d0`). Ele **não tinha nenhum feedback real
associado** no banco.

Os 6 feedbacks reais e as 3 aprovações existentes estavam em outros ciclos:

- `HOMOLOG-NB Ciclo Nine-Box` (`5fa9996e-1d18-4942-b037-cbf3c46827a1`): 5
  feedbacks e 2 aprovações;
- `CICLO APENAS DE TESTE` (`26ebc23c-1b5b-496a-87fc-723f675af2cc`): 1 feedback e
  1 aprovação.

Nenhum dos 6 feedbacks referencia `79bbf408-...`. Portanto, eles não foram
apagados: estão preservados e aparecem na interface quando o ciclo correto é
selecionado.

Validação no navegador autenticado (`ti@promobrindes.com.br`):

| Ciclo selecionado         | Cards exibidos |
| ------------------------- | -------------: |
| TESTE DEFINITIVO          |              0 |
| CICLO APENAS DE TESTE     |              1 |
| HOMOLOG-NB Ciclo Nine-Box |              5 |

## Armazenamento demonstrativo

A cópia do `localStorage` do perfil usado pela conta `ti@promobrindes.com.br`
continha:

- `dp-desempenho-demo-registros`: nenhum feedback completo em `criados`; havia
  apenas um patch de status para `demo-feedback-mvh3jync-y1fw9`;
- `dp-desempenho-aprovacoes-demo`: uma aprovação demonstrativa
  `mock-6::79bbf408-b400-4446-a9e2-50d13883379d`;
- nenhuma cópia dos 6 feedbacks reais e nenhum corpo do feedback demonstrativo
  `demo-feedback-mvh3jync-y1fw9`.

O patch sem o registro-base não contém dados suficientes para reconstruir o
feedback (avaliado, avaliador, tipo, notas e textos). Ele foi mantido intacto;
nada foi inventado ou substituído.

## Causa da persistência demonstrativa

`AvaliacaoPage.criarFeedback` fazia:

```ts
if (mockAtivo || criacaoDemonstrativa(d)) {
  // grava em localStorage
}
```

Com `VITE_DESEMPENHO_MOCK=true`, **até um feedback com ciclo, avaliado e
avaliador reais (UUID)** era gravado somente em `localStorage`. Isso explica o
desaparecimento de novos feedbacks criados com a vitrine ligada.

Correção aplicada:

```ts
if (criacaoDemonstrativa(d)) {
  // somente IDs fictícios/ausentes vão para o armazenamento local
}
```

Payload 100% UUID passa por `avaliacaoService.criarFeedbackSeguro`
(`criar_feedback_seguro`) mesmo com a vitrine habilitada.

Também foi corrigido o ciclo padrão do modal de criação: ele agora usa o ciclo
em foco no topo, e não o primeiro item da lista.

## Evidência de persistência real

O teste `_tmp-testar-criacao-real.mjs`, executado na cópia do perfil com
`VITE_DESEMPENHO_MOCK=true`, criou um feedback no ciclo `TESTE DEFINITIVO` e
capturou:

- `POST /rest/v1/rpc/criar_feedback_seguro`;
- payload com `p_ciclo_id = 79bbf408-...`, `p_avaliado_id` e
  `p_avaliador_id` UUID;
- retorno real `f3cb45cf-...` e consulta posterior confirmando o registro no
  banco.

O registro usado nesse teste foi removido em seguida com a service role, sem
tocar nos 6 feedbacks existentes.

## Persistência de leitura e sessão

- F5 no ciclo `HOMOLOG-NB`: 5 cards antes e 5 depois.
- Nova sessão (contexto novo a partir da cópia do perfil): 5 cards.
- Troca de ciclo: `TESTE DEFINITIVO` = 0, `CICLO APENAS DE TESTE` = 1,
  `HOMOLOG-NB` = 5.
- Logout/login nominal não foi executado porque a senha da conta
  `ti@promobrindes.com.br` não está disponível nesta sessão. A leitura é
  integralmente do Supabase; a nova sessão com a cópia autenticada confirmou os
  mesmos 5 registros.

## Backup

Cópias do `Local Storage` dos perfis Chrome/Edge foram feitas antes de abrir
qualquer sessão:

- `tmp-recuperacao-feedbacks/backup-localstorage-20261020-174741/`
- `tmp-recuperacao-feedbacks/localstorage-profile2.json`

O perfil original e o `localStorage` original **não foram apagados nem
reinicializados**.

## Regra de dados

Não houve movimentação de `ciclo_id` nem duplicação de feedbacks. Mover os 6
registros para `TESTE DEFINITIVO` quebraria o vínculo histórico com as
consolidações e aprovações dos ciclos `HOMOLOG-NB` e `CICLO APENAS DE TESTE`.
Para vê-los, selecione o ciclo correspondente no seletor do topo.
