# Nine-Box — Aprovação do gestor na interface (subaba "Aguardando gestor")

> Área: **Gestão de Desempenho → Feedbacks** · implementado em **16/10/2026**
> Banco: migration **`20261017090000_ninebox_aprovacao_gestor.sql`** (aditiva).
> Layout: alteração visual **autorizada** e registrada em
> [`docs/protegido/DESEMPENHO-LAYOUT-PROTEGIDO.md`](protegido/DESEMPENHO-LAYOUT-PROTEGIDO.md).

## Fluxo (o que a tela implementa)

| # | Passo | Onde na interface |
|---|---|---|
| 1 | RH registra as avaliações 360° | aba **Feedbacks** → "Novo Feedback" (inalterado) |
| 2 | RH conclui os feedbacks individuais | modal **Ver Feedback** → rodapé operacional (inalterado) |
| 3 | RH envia a avaliação consolidada | subaba **Aguardando gestor** → `Enviar ao gestor` |
| 4 | Gestor aprova ou devolve (justificativa obrigatória) | subaba → `Aprovar` / `Devolver` |
| 5 | RH corrige e **reenvia** | subaba → `Reenviar ao gestor` |
| 6 | RH valida o **Potencial** | subaba → `Validar Potencial` (somente papel `rh`) |
| 7 | **Nine-Box classifica automaticamente** | o quadrante aparece no card quando o fluxo chega em `concluida_validada` |

## As duas visualizações internas

A aba Feedbacks agora tem um seletor de visualização (chips do Design System):

- **Avaliações** — a tela aprovada, preservada integralmente (default);
- **Aguardando gestor** — a fila de aprovação, com **contador dinâmico** das
  avaliações que aguardam o gestor.

Cada linha da fila mostra: **colaborador avaliado** (nome + cargo ·
departamento), **ciclo**, **gestor responsável**, **desempenho consolidado**
(motor 360°, com a faixa de nota aprovada), **potencial atribuído**, **data de
envio** e **status da aprovação** — mais a ação `Ver avaliação`, que abre o
MESMO modal de detalhe já existente.

**Tipos × status:** `gestor`/`par`/`auto`/`subordinado` são CATEGORIAS de
avaliação; `aguardando_gestor`, `devolvida`, `aprovada_gestor`,
`concluida_validada` (e `em_preparacao`) são STATUS DE APROVAÇÃO. As duas listas
nunca se misturam (há teste para isso).

## Arquivos

| Arquivo | Papel |
|---|---|
| `src/components/avaliacao/aprovacaoGestor.ts` | Camada pura: status, rótulos, tons, permissões, `situacaoAprovacao` (espelho exato da função SQL) e `derivarPendencias` |
| `src/components/avaliacao/PendenciasAprovacao.tsx` | A fila (card aprovado + ações + diálogo de devolução) |
| `src/components/avaliacao/FeedbacksTab.tsx` | Seletor das visualizações + derivação (reusa o motor do Nine-Box) |
| `src/services/avaliacaoService.ts` | `listarConsolidacoes`, `listarAprovacoesGestor`, `enviarAvaliacaoAoGestor`, `decidirAprovacaoGestor` |
| `src/pages/AvaliacaoPage.tsx` | Leituras do modo real, papel do usuário e mutations com chave de idempotência por operação |
| `src/components/__tests__/AprovacaoGestor.test.ts` | 20 testes das regras e da derivação |

## Autorização e proteção

- **Front** só evita OFERECER o que o servidor recusaria: `podeEnviarParaGestor`
  (RH/admin), `podeDecidirAprovacao` (**só** gestor — o RH não aprova),
  `podeValidarPotencial` (só `rh`). A RPC revalida papel, vínculo
  gestor↔colaborador (`supervisor_id` ou o próprio), empresa e versão.
- **Idempotência por operação**: chave nova por tentativa, reaproveitada em
  retentativa e trocada após sucesso (`criarChaveIdempotente`).
- **Nenhum dado fictício é gravado**: em demonstração os controles ficam
  desabilitados e a guarda `exigirEscritaOperacional` recusa IDs `mock-*`.
- **Mocks intactos**: fora do modo real a fila é derivada da MESMA lista já
  carregada (nenhuma fixture nova, nenhum mock desligado).

## Modo real × demonstração

- **Real** (`VITE_NINEBOX_MODO_REAL=true`): lê `feedbacks_360_consolidacoes` e
  `feedbacks_360_aprovacoes_gestor`, usa a versão canônica de
  `vw_feedbacks_360_versao` e habilita os controles de escrita.
- **Demonstração** (padrão): a view de versão não existe, então a avaliação do
  gestor **concluída** é tratada como "pronta" (versão sintetizada) e a data do
  registro vale como data de envio — a MESMA regra, somente leitura.

## Conclusão da avaliação — exclusiva do GESTOR responsável (16/10/2026)

Regra: a ação **"Concluir avaliação"** só é oferecida a quem PROVA o vínculo —
papel autenticado `gestor` **e** responsabilidade sobre o colaborador avaliado
(`supervisor_id` = colaborador do usuário, ou ele próprio). O `tipo` do feedback
(`gestor`/`par`/`auto`/`subordinado`) identifica a ORIGEM da avaliação e **não**
autoriza nada.

| Camada | Onde | O que faz |
|---|---|---|
| Decisão pura | `statusFeedback.TRANSICOES` (`pendente → concluido` = `['gestor']`) | a conclusão deixa de ser oferecida a `admin_rh`/`avaliador` |
| Vínculo (front) | `acoesFeedback.ehGestorResponsavel` + `avaliacaoService.listarVinculos` (`id`, `user_id`, `supervisor_id`) | sem vínculo comprovado o controle não aparece (fail-closed) |
| Servidor | RPC `finalizar_feedback` (migration aditiva **`20261018090000_ninebox_conclusao_gestor.sql`**) | `p_concluir` exige `pode_aprovar_colaborador(avaliado_id)`; `cancelar`/`reabrir` seguem admin/RH; auditoria grava identidade, data, `revisao` e a **versão** concluída |

⚠️ **Migration PENDENTE de autorização.** Até aplicá-la, o servidor ainda aceita
`concluir` de `admin`/`rh` (a RPC antiga autorizava `pode_gerir_avaliacoes()`);
o front já não oferece o controle a esses perfis e, para o gestor, a RPC devolve
`perfil_nao_autorizado` — nenhum sucesso falso é anunciado. A ordem de aplicação
é: `20261015090000` → `20261017090000` → `20261018090000`.

## Como validar

```bash
npm run verificar:layout        # âncoras visuais protegidas
npm run test:e2e:layout         # fila, contador, modal, e layout congelado
npm run capturar:referencias    # atualiza docs/protegido/referencias/
npx vitest run src/components/__tests__/AprovacaoGestor.test.ts
```
