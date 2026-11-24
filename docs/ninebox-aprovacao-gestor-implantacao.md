# Aprovação do gestor — implantação para a conta Abner

> Verificado por leitura no banco em **16/10/2026** (nenhuma escrita executada).
> Conta alvo: `2a1f0c4f-7587-49a7-81aa-e7e35cf0848d` (admin + gestor).

## 1. Código já implementado (o que existe e o que falta)

| Camada                                | Onde                                                                                                 | Estado                            |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------- |
| Regra única de estado                 | `aprovacaoGestor.estadoAprovacao` (+ `derivarPendencias`)                                            | ✅ pronto                         |
| Fila "Aguardando gestor" + contador   | `PendenciasAprovacao` / `FeedbacksFiltros`                                                           | ✅ pronto                         |
| Decisão no modal (Aprovar / Devolver) | `FeedbackAcoesRodape` (+ `FeedbackDetalheDialog` / `FeedbacksTab`)                                   | ✅ pronto                         |
| Vínculo (front)                       | `acoesFeedback.ehGestorResponsavel` + `avaliacaoService.listarVinculos`                              | ✅ pronto                         |
| Serviço/RPCs                          | `enviarAvaliacaoAoGestor`, `decidirAprovacaoGestor`, `listarConsolidacoes`, `listarAprovacoesGestor` | ✅ pronto (dependem da migration) |
| **Banco**                             | migrations abaixo                                                                                    | ❌ bloqueado                      |

## 2. Migration pendente (o bloqueio real)

Verificado por consulta direta (somente leitura), com a sessão autenticada:

| Objeto                                         | Resultado                         | Conclusão                         |
| ---------------------------------------------- | --------------------------------- | --------------------------------- |
| `feedbacks_360_validacoes_potencial` (colunas) | `ok`                              | `20261015090000` **aplicada**     |
| `feedbacks_360_operacoes` (colunas)            | `ok`                              | idem                              |
| `pode_gerir_avaliacoes()`                      | respondeu `true`                  | idem                              |
| `pode_validar_potencial()`                     | respondeu `false` (papel admin)   | idem                              |
| `versao_avaliacao_feedback()`                  | existe                            | idem                              |
| **`feedbacks_360_aprovacoes_gestor`**          | **PGRST205 — não existe**         | **`20261017090000` NÃO aplicada** |
| **`feedbacks_360_consolidacoes`**              | **PGRST205 — não existe**         | idem                              |
| **`pode_aprovar_colaborador(uuid)`**           | **PGRST202 — não existe/exposta** | idem                              |

→ **Migration pendente que habilita a aprovação formal:**
**`supabase/migrations/20261017090000_ninebox_aprovacao_gestor.sql`**
(ela cria `feedbacks_360_consolidacoes`, `feedbacks_360_aprovacoes_gestor`,
`pode_aprovar_colaborador`, `colaborador_id_do_usuario`,
`enviar_avaliacao_ao_gestor`, `decidir_aprovacao_gestor` e `situacao_aprovacao`).
Em seguida (opcional, para a conclusão ser exclusiva do gestor):
**`20261018090000_ninebox_conclusao_gestor.sql`**.

Sem a primeira: **não existe onde registrar a solicitação nem a decisão**, e o
front não tem como validar o vínculo (a fila só mostra o estado sintetizado da
demonstração). Por isso os botões Aprovar/Devolver não aparecem.

## 3. Vínculo necessário para a conta Abner

Verificado: `user_roles` = **admin + gestor** ✅ · empresas
`66104399-aba8-4105-bbd3-9bf67820c1d0` (default) e
`61e7d382-549f-4b17-afa4-4578ebc919f3` · `colaboradores.user_id = 2a1f0c4f-…`
→ **0 linhas** ❌ (é o segundo bloqueio).

`pode_aprovar_colaborador` exige `colaboradores.user_id = auth.uid()` **e**
(`alvo.supervisor_id = gestor.id` **ou** `alvo.id = gestor.id`). Logo o vínculo
mínimo é **uma linha**:

- **Vínculo 1 (recomendado, sem criar nada):** apontar `colaboradores.user_id`
  para o **descartável de homologação já existente** —
  `HOMOLOG-NB Colaborador Descartavel` (`0f303507-5b13-4ca2-aa76-16122b5b37e9`,
  CPF sentinela `00000000000`, empresa `66104399-…`, `user_id` **null**).
  Não cria colaborador nem avaliação e **não altera nenhuma outra conta**.
  Com ele, Abner é responsável pela avaliação **do próprio descartável**
  (`alvo.id = gestor.id`).
- **Vínculo 2 (opcional):** se a homologação precisar aprovar a avaliação de
  **outra pessoa**, apontar o `supervisor_id` desse avaliado para o descartável
  vinculado (1 UPDATE; o avaliado é escolhido pela consulta do arquivo).

SQL pronto (com conferência, guardas e rollback), **não executado**:
`docs/ninebox-aprovacao-gestor-vinculo-abner.sql`.

> Observação do ambiente: na sessão de teste atual `feedbacks_360` e
> `ciclos_avaliacao` retornam **0 linhas** (RLS por empresa) — os registros reais
> de homologação vivem na empresa da sua conta. O teste com Abner deve rodar na
> empresa onde a avaliação existe.

## 4. Procedimento mínimo (após autorização)

1. **Aplicar** `20261017090000_ninebox_aprovacao_gestor.sql` (janela de baixo uso;
   cria tabelas/policies/funções — nenhum DML de dados).
2. _(Opcional)_ **Aplicar** `20261018090000_ninebox_conclusao_gestor.sql`.
3. **Rodar** o PASSO 1 do `docs/ninebox-aprovacao-gestor-vinculo-abner.sql`
   (vínculo da conta ao descartável) e conferir com 1b/1c.
4. **Ligar o modo real** (`VITE_NINEBOX_MODO_REAL=true` no `.env.local`, local) e
   reiniciar o dev server — sem isso a tela permanece em demonstração.
5. **Criar a solicitação** pelo RH/admin: na fila "Aguardando gestor", botão
   _Enviar ao gestor_ (RPC `enviar_avaliacao_ao_gestor`).
6. **Entrar como Abner** e abrir a avaliação: o selo deve mostrar
   **"Aguardando gestor"** e o rodapé deve trazer **Aprovar** e **Devolver**
   (devolução exige justificativa ≥ 10 caracteres).
7. **Conferir as invariantes:** ao aprovar, a linha sai do filtro e o RH passa a
   poder **Validar Potencial**; só depois o Nine-Box classifica. A decisão fica em
   `feedbacks_360_aprovacoes_gestor` + `audit_log` (usuário, data e versão) e
   sobrevive ao F5.
8. **Rollback** (se necessário): seção final do arquivo SQL + reverter a flag.

## 5. O que precisa ser autorizado (explicitamente)

1. **Executar a migration `20261017090000_ninebox_aprovacao_gestor.sql`** no banco
   remoto (tabelas, policies, funções e grants — sem DML de dados).
2. _(Opcional)_ **Executar `20261018090000_ninebox_conclusao_gestor.sql`**
   (redefine `finalizar_feedback`: a conclusão passa a exigir o gestor responsável).
3. **Executar o PASSO 1** do SQL de vínculo (1 `UPDATE` em linha descartável,
   `user_id` nulo → conta Abner) e, se aplicável, o **PASSO 2** (`supervisor_id`
   do avaliado escolhido).
4. **Ligar `VITE_NINEBOX_MODO_REAL=true`** no ambiente do teste.

Nada disso foi executado: o diagnóstico foi **somente leitura** e o SQL está
comentado, aguardando a sua autorização.

---

## 6. Demonstração: as decisões ficam SALVAS LOCALMENTE (novo)

O bloqueio do banco não impede TESTAR o fluxo na vitrine. Em modo demonstração as
decisões dos registros fictícios (`mock-*`) são gravadas em **armazenamento local
separado**, com as MESMAS regras do servidor — sem tocar nos mocks e sem enviar
nada ao Supabase.

| Item         | Valor                                                                    |
| ------------ | ------------------------------------------------------------------------ |
| Módulo       | `src/components/avaliacao/aprovacaoLocal.ts`                             |
| Chave        | `localStorage['dp-desempenho-aprovacoes-demo']`                          |
| Conteúdo     | `{ decisoes, validacoes, historico }` por `colaboradorId::cicloId`       |
| Escrita      | só em modo demonstração; em registro REAL continua RPC oficial           |
| Persistência | sobrevive a **F5**, a novas abas e ao reabrir o navegador (mesmo perfil) |
| Limpeza      | `limparEstadoLocal()` (apaga SÓ essa chave; os mocks ficam intactos)     |

**Mesma máquina de estados do servidor** (`situacaoAprovacao`):

1. `em_preparacao` → **Enviar ao gestor** (RH/admin);
2. `aguardando_gestor` → **Aprovar avaliação** / **Devolver para correção** (gestor
   responsável; na vitrine, papel de gestão);
3. `aprovada_gestor` → **Validar Potencial** (exclusivo do **RH** — nem o admin
   valida, como no banco);
4. `concluida_validada` → só então o **Nine-Box classifica**.

Regras preservadas na demonstração:

- o **filtro/contador “Aguardando gestor”** e o **badge do modal** leem o MESMO
  estado (uma instância por avaliação);
- clicar em **Aprovar NÃO classifica** ninguém: até a validação do Potencial o
  colaborador sai da matriz do Nine-Box (`aplicarAprovacaoLocal`);
- mudar a decisão (ou **reenviar** depois de uma devolução) **invalida** a
  validação anterior — a validação vale para a **versão aprovada vigente**;
- a **devolução exige justificativa** (mínimo de 10 caracteres);
- cada operação entra no `historico` (operação, colaborador, ciclo, versão,
  justificativa, quem operou e quando).

### 6.1 Roteiro de teste na vitrine (mocks)

1. Aba **Feedbacks** → chip **“Aguardando gestor”** (âmbar) → escolher a avaliação
   → **Ver avaliação** (a fila reusa o modal do módulo).
2. No rodapé do modal: **Aprovar avaliação** → aviso confirma a gravação
   **local** (“salva localmente — nada foi enviado ao banco”).
3. **F5**: a decisão continua lá, o contador cai e a linha passa a
   **“Aprovada pelo gestor”**.
4. **RH** (conta com papel `rh`): **Validar Potencial** na fila → o Nine-Box volta
   a classificar o colaborador.
5. **Devolver para correção** (outra linha): justificativa → status
   **“Devolvida para correção”** → **Reenviar ao gestor** devolve a linha a
   `aguardando_gestor`.
6. Conferir em DevTools → `localStorage['dp-desempenho-aprovacoes-demo']` — e que
   **nenhuma** requisição de escrita das RPCs/tabelas do fluxo foi feita.

> Em registro **real** (UUID do banco) nada muda: a decisão é a RPC
> `decidir_aprovacao_gestor` (que exige a migration `20261017090000`), o vínculo é
> reconferido por `pode_aprovar_colaborador` e o armazenamento local não é usado.

---

## 7. Conta com VÁRIOS papéis (causa exata do "tratado só como admin")

### 7.1 Diagnóstico (leitura no banco em 16/10/2026 — nenhuma escrita)

| Fato verificado                                            | Resultado                                                |
| ---------------------------------------------------------- | -------------------------------------------------------- |
| `get_user_roles(2a1f0c4f-…)` (conta Abner)                 | **`['admin','gestor']`** — o banco está certo            |
| `colaboradores.user_id = 2a1f0c4f-…`                       | **0 linhas** ← nenhum vínculo de gestor                  |
| Descartável de homologação (`cpf = 00000000000`)           | `0f303507-5b13-4ca2-aa76-16122b5b37e9`, `user_id = null` |
| `feedbacks_360` com `tipo='gestor'` e `status='concluido'` | **0 linhas** (nenhuma avaliação real atribuível hoje)    |
| `pode_aprovar_colaborador`                                 | **PGRST202 — não existe** (migration pendente)           |

### 7.2 A CAUSA (100% no front, não no banco)

O front **reduzia a lista de papéis a UM valor por precedência** — `admin` vencia
`rh`, que vencia `gestor` — e testava **igualdade** nesse valor único:

- `AvaliacaoPage` → `papel` (usado na fila);
- `FeedbackAcoesRodape` → `papelStatus`.

Consequências para a conta `admin`+`gestor`:

1. a consulta de vínculo só rodava quando `papelStatus === 'gestor'`; com
   `papelStatus = 'admin'` ela **nunca rodava**, o "gestor responsável" nunca era
   provado e, em registro REAL, **Aprovar/Devolver não apareciam** (o gate exige
   `responsavel === true`);
2. na fila, `podeDecidirAprovacao(papel)` comparava `papel === 'gestor'` →
   `'admin'` ⇒ **sem botões Aprovar/Devolver**;
3. a validação de status (`concluir`) caía no perfil `admin_rh`, que a tabela de
   transições não autoriza a concluir.

O modo demonstração **mascarava** o defeito (a vitrine aceita `admin`), e o
`AppRole` do contexto sequer listava `'gestor'`/`'rh'` — o tipo mentia sobre o
que o `get_user_roles` devolve.

### 7.3 A CORREÇÃO (mínima, sem mexer em layout nem em permissões)

`src/components/avaliacao/papeisAvaliacao.ts` (**novo**, puro) é a fonte única:

- `normalizarPapeis(papeis)` / `temPapel(papeis, papel)` aceitam a **LISTA** do
  `get_user_roles` **ou** um papel único (compatibilidade dos chamadores);
- `capacidadesAvaliacao(papeis)` → `podeGerirAvaliacoes` (admin/RH),
  `podeDecidirAprovacao` (**gestor**), `podeValidarPotencial` (**rh**, sem admin)
  — **cada capacidade decidida pelo papel que a concede**, nunca por precedência.

Ligações:

| Onde                                   | O que mudou                                                                                                                                                                                                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AuthContext.AppRole`                  | passa a incluir `'gestor'` e `'rh'` (é o que o RPC devolve); `hasRole('gestor')` volta a ser válido                                                                                                                                                                       |
| `FeedbackAcoesRodape`                  | `temGestor = hasRole('gestor')‖capacidades.gestor`; a consulta de vínculos usa `temGestor` (não o papel único); a decisão REAL exige `responsavel && temGestor`; perfil das ações = `perfilOperadorComVinculo` (gestor responsável conclui; sem vínculo segue `admin_rh`) |
| `AvaliacaoPage`                        | calcula `papeis` (lista normalizada) e repassa; `papel` continua só como rótulo/precedência                                                                                                                                                                               |
| `FeedbacksTab` → `PendenciasAprovacao` | recebem `papeis`; as três capacidades vêm de `capacidadesAvaliacao(papeis)`                                                                                                                                                                                               |
| `aprovacaoGestor` / `acoesFeedback`    | `podeEnviarParaGestor`, `podeDecidirAprovacao`, `podeValidarPotencial` aceitam lista **ou** papel único                                                                                                                                                                   |

**Nada de segurança foi relaxado:** continua fail-closed sem vínculo, o RH não
decide, o admin sozinho não decide e o Potencial continua exclusivo do RH. A
autorização real segue no servidor.

### 7.4 Validação no navegador (A/B, mesma sessão)

`scripts/_tmp-validar-gestor-admin.mjs` (a sessão E2E é `admin@teste.local`; para
reproduzir a conta de homologação a resposta **de leitura** de `get_user_roles` é
interceptada — nenhuma permissão remota foi alterada):

| Cenário                                                         | Fila "Aguardando gestor"                   | Menu administrativo             |
| --------------------------------------------------------------- | ------------------------------------------ | ------------------------------- |
| A · papéis `['admin']` (como está no banco do usuário de teste) | só **Ver avaliação** (defeito reproduzido) | presente                        |
| B · papéis `['admin','gestor']` (a conta Abner)                 | **Devolver + Aprovar** + Ver avaliação     | **presente** (admin preservado) |

Evidências: `tmp-validacao-gestor-abner/01-fila-admin-sozinho.png`,
`02-fila-admin-gestor.png`, `03-modal-admin-gestor.png`, `relatorio.json`;
diagnóstico em `tmp-diagnostico-gestor-abner.json`.

### 7.5 O que falta para a APROVAÇÃO REAL (parado, aguardando autorização)

1. **Migration `20261017090000_ninebox_aprovacao_gestor.sql`** — cria
   `feedbacks_360_aprovacoes_gestor`, `feedbacks_360_consolidacoes`,
   `pode_aprovar_colaborador`, `enviar_avaliacao_ao_gestor`,
   `decidir_aprovacao_gestor` e `situacao_aprovacao`. **Não aplicada**
   (PGRST205/PGRST202 confirmados hoje) ⇒ hoje não existe onde persistir a
   decisão real.
2. **Vínculo da conta** — PASSO 1 de `docs/ninebox-aprovacao-gestor-vinculo-abner.sql`
   (1 `UPDATE` na linha descartável `0f303507-…`, hoje com `user_id` nulo;
   `empresa_id = 66104399-aba8-4105-bbd3-9bf67820c1d0`). Sem ele
   `pode_aprovar_colaborador` devolve `false` para qualquer avaliado.
3. **(Opcional) PASSO 2** — apontar o `supervisor_id` de um avaliado para o
   descartável, para Abner aprovar a avaliação de OUTRA pessoa.
4. **Avaliação atribuída** — hoje não há nenhuma `feedbacks_360` de gestor
   concluída visível à sessão de teste; a conta verá a fila real quando existir
   uma avaliação no ciclo da empresa dela.

## 8. Correções de 19/10/2026 (aprovação real + card)

### 8.1 Causa exata dos botões desabilitados

1. **Migration não aplicada no projeto `frjbfeamybqsejlvmqbl`** — probe read-only
   de hoje: `feedbacks_360_consolidacoes` → 404, `feedbacks_360_aprovacoes_gestor`
   → 404, `pode_aprovar_colaborador`/`situacao_aprovacao`/
   `versao_consolidada_avaliacao` → 404. Sem tabela/RPC não há onde gravar a
   decisão: o front só conseguia demonstrar.
2. **Conta sem vínculo em `colaboradores`** — `pode_aprovar_colaborador` exige
   `colaboradores.user_id = auth.uid()` + `supervisor_id` (ou o próprio). Sem
   linha vinculada o servidor devolve `false` e o front (fail-closed) desabilita
   Aprovar/Devolver.
3. **Rodapé antigo escondia a decisão fora de `aguardando_gestor`** — corrigido
   na padronização: os três controles obrigatórios existem sempre e só o estado
   muda.

### 8.2 Correções no backend (migration aditiva)

- `situacao_aprovacao` agora:
  - **isola empresa** (fora de `get_user_empresas` → `nao_autorizado`);
  - compara a validação do RH pela **versão canônica do feedback do gestor**
    (`versao_avaliacao_feedback`) — a mesma usada por
    `validar_potencial_avaliacao` e pelo Nine-Box. Antes comparava com a versão
    do CONJUNTO e nunca casava (o fluxo ficaria preso em `aprovada_gestor`).
- `validar_potencial_avaliacao` é **substituída** (mesma assinatura, mesmas
  validações) com o gate `situacao_aprovacao(...) = 'aprovada_gestor'`; sem o
  aval vigente do gestor a RPC recusa (`aprovacao_do_gestor_ausente`).
- `enviar_avaliacao_ao_gestor` **recusa** `gestor_nao_atribuido` (nada de fingir
  envio) e materializa `gestor_responsavel_colaborador_id/_user_id` na linha.
- Rollback atualizado: dropa trigger/funções da §7 e **restaura** a versão
  anterior de `validar_potencial_avaliacao`.

### 8.3 Card "Aguardando gestor" (única alteração visual autorizada)

Medição antes/depois (1440 px, DOM real):

| Métrica                | Antes                                  | Depois             |
| ---------------------- | -------------------------------------- | ------------------ |
| Altura do card (fila)  | 255 px                                 | **203 px**         |
| Altura do card (lista) | 287 px                                 | **203 px**         |
| Corpo                  | 174 px                                 | 122 px             |
| Rodapé                 | 43 px (fila) / 75 px (lista, 2 linhas) | **43 px, 1 linha** |

Causa: a coluna de responsáveis tinha dois blocos empilhados + chip em linha
própria (147 px internos) e ditava a altura; o rodapé quebrava em duas linhas na
lista (5 botões). Correção: avatares de 24 px, espaçamento `space-y-1`, tipo +
data na mesma linha e ações extras (Enviar/Validar) só nas etapas em que existem.
Nenhuma região foi removida; colaborador à esquerda, resultados e ações à
direita. Medido no DOM real em 1440 px e 1024 px (`tmp-aprovacao-real/`).

### 8.5 Edição nos filtros normais (19/10/2026)

- **Causa de os cards terem várias ações**: a lista e a fila compartilhavam o
  mesmo conjunto de aprovação. Agora a lista passa `acoes={['editar']}` e a fila
  mantém `ver/enviar/devolver/aprovar/validarPotencial`; o modal aberto na lista
  também não oferece decisão (`contexto='avaliacoes'`).
- **Formulário**: o MESMO `NovoFeedbackDialog` abre em modo edição (título/botão
  e aviso mudam; campos e layout intactos) com todos os dados originais.
- **Gravação real**: `avaliacaoService.editarFeedbackSeguro` → RPC
  `editar_feedback_seguro` (migration **`20261020090000_ninebox_edicao_feedback.sql`**,
  ainda NÃO aplicada). Ela exige RH/admin, confere empresa de TODOS os ids,
  valida tipo/notas, **reabre** registro concluído (`status='pendente'`), audita
  antes/depois e grava idempotência; o trigger de revisão invalida as aprovações
  anteriores.
- **Demonstração**: grava em `dp-desempenho-demo-registros` (patch + histórico),
  reencaminha a consolidação local e persiste após F5 — nada vai ao Supabase.
- **Provas**: `FeedbackEdicao.test.tsx`, e2e `feedbacks-padronizacao`
  (`edicao-form-preenchido.png`, `edicao-apos-salvar.png`, `edicao-apos-F5.png`).

### 8.8 Integração aprovação → Nine-Box (correção de 19/10/2026)

**Sintoma:** avaliação “APROVADA PELO GESTOR” (ex.: Beatriz, ciclo
“CICLO APENAS DE TESTE”) com a matriz Nine-Box vazia e **sem indicação** da
etapa pendente.

**Causa exata (demonstração e real):**

1. `aplicarAprovacaoLocal` retirava o quadrante de quem tinha decisão sem
   validação (`quadrante:null`) mas **não marcava o motivo**; o ponto saía de
   `pontosDoQuadrante` e não aparecia em nenhum lugar da aba.
2. `NineBoxFocoBanner` fazia `if (total <= 0) return null` — o total só somava
   risco/PDI; uma aprovação aguardando RH **não renderizava o banner**.
3. O serviço demonstrativo validava o Potencial com `versaoDemoDe(feedbackId)`
   (`demonstracao:<id>`) enquanto a decisão usava a versão do **conjunto** —
   `validarPotencialLocal` recusava por `versao_divergente` e o quadrante nunca
   voltava.
4. No modo real, o Nine-Box classificava apenas pela validação do RH, sem
   confrontar a **aprovação vigente/versão consolidada** da fila.
5. A validação do demo não invalidava a query `dp-desempenho-aprovacoes-demo`,
   então a aba só refletia o resultado após F5.

**Correções (sem novo componente/quadrante):**

- `PontoNineBox` ganhou `aguardandoValidacaoRh`, `aguardandoAprovacao` e
  `motivoNaoClassificado`; o ponto **continua na lista**, sem quadrante.
- `pontos360` (real) marca `potencial_sem_validacao` e aplica o gate
  **aprovação vigente × versão consolidada** (`aprovacoes`/`consolidacoes`);
  decisão antiga vira `aprovacao_pendente`, devolvida vira `aprovacao_devolvida`.
- `aplicarAprovacaoLocal` (vitrine) compara a decisão com a versão **atual** do
  grupo (mesma lista da aba Feedbacks): decisão antiga é **invalidada**.
- Banner e insights existentes mostram “N aprovada(s) pelo gestor aguardando a
  validação do Potencial pelo RH: **nomes**” e “N com aprovação pendente,
  devolvida ou invalidada: **nomes**”. `lerAtencao` separa essas pendências do
  “sem nota/potencial”.
- `servicoDemo.validarPotencialAvaliacao` usa a **versão da decisão aprovada** e
  invalida a query local no sucesso — atualização imediata, sem F5.

**Provas:** `NineBox360.test.tsx` (gate/versão), `AprovacaoLocal.test.ts`
(invalidação) e `NineBoxAprovacaoIntegracao.test.tsx` (contagem/banner);
scripts `_tmp-validar-ninebox-aprovacao.mjs` e
`_tmp-validar-ninebox-ciclo-novo.mjs` (T1–T11, `escritas: []`); capturas em
`tmp-ninebox-aprovacao/`.


**Sintoma:** cards equivalentes com Aprovar habilitado (William/Carlos) e
desabilitado (Lucas/Rafaela/Thiago — PAR, ciclo S2, sem gestor identificado).

**Causas encontradas (todas no caminho da decisão, não no CSS):**

1. `situacaoAprovacao` (front) e `situacao_aprovacao` (SQL) retornavam
   `sem_gestor` **antes** de ler a decisão — uma consolidação sem
   `supervisor_id` nunca saía de `sem_gestor`, mesmo aprovada.
2. `estadoAprovacao.podeDecidir` exigia `responsavel && gestorIdentificado &&
   avaliacaoGestorValida`; `getFeedbackActions` acrescentava `semGestor` e
   `semAvaliacaoGestor` como bloqueios **duros**. Resultado: PAR/Auto sem
   avaliação do gestor e qualquer colaborador sem vínculo ficavam presos.
3. `decidir_aprovacao_gestor` exigia uma avaliação `tipo='gestor'` concluída e
   aceitava apenas `situacao='aguardando_gestor'` (rejeitava `sem_gestor`).
4. `pode_aprovar_colaborador` exigia vínculo + papel `gestor`; RH/admin não
   tinham escopo (embora sejam autoridade de tenant).
5. O contador `Aguardando gestor` somava apenas `aguardando_gestor`, ignorando
   as linhas `sem_gestor` (fila e contador divergiam).

**Regra única implementada (front + SQL espelhados):**

- decisão vigente **prevalece** sobre `sem_gestor` (aprovar/devolver não é
  apagado pela falta de vínculo);
- `sem_gestor` é **pendente** (aviso de atribuição), não estado terminal;
- **conclusão do registro e tipo da avaliação não liberam nem bloqueiam** a
  aprovação; `avaliacaoGestorValida` é informativo;
- **escopo**: RH/admin (`pode_gerir_avaliacoes`) decidem com ou sem vínculo
  (tenant); gestor decide **somente o próprio time** (vínculo provado). Gestor
  sem vínculo não decide — e a interface explica ("disponível ao RH/admin");
- `decidir_aprovacao_gestor` usa o registro de referência (gestor, senão o mais
  recente não cancelado), aceita `aguardando_gestor` **e** `sem_gestor` e grava
  a decisão na consolidação; idempotência e auditoria preservadas;
- contador, fila, card e modal consomem `pendente` (inclui `sem_gestor`).

**Provas:** `270` testes unitários na área; e2e
`feedbacks-padronizacao > admin aprova em ciclos/tipos distintos` (aprovou
William — gestor vinculado — e Lucas — PAR sem gestor —, badge, F5 e nenhuma
escrita); `_tmp-validar-aprovacao-todos.mjs` (conta admin: **10/10** cartões
com Aprovar habilitado; aprovação de órfão 10→9; F5 mantém; `escritas: []`;
conta só-gestor: vinculados habilitados e órfãos bloqueados com motivo).


1. `20261017090000_ninebox_aprovacao_gestor.sql` (aprovação + encaminhamento +
   gate do Potencial).
2. `20261020090000_ninebox_edicao_feedback.sql` (edição auditada dos filtros
   normais).
3. _(Opcional)_ `20261018090000_ninebox_conclusao_gestor.sql`.

Rollbacks em `supabase/rollback/` para as duas primeiras.

**Autorize executar, no projeto `frjbfeamybqsejlvmqbl`, as migrations
`20261017090000_ninebox_aprovacao_gestor.sql` e
`20261020090000_ninebox_edicao_feedback.sql` e, em seguida, o PASSO 1 de
`docs/ninebox-aprovacao-gestor-vinculo-abner.sql`** (um `UPDATE` na linha
descartável `0f303507-5b13-4ca2-aa76-16122b5b37e9`, hoje com `user_id` nulo).
Depois disso, com `VITE_NINEBOX_MODO_REAL=true`, o fluxo real
cria → encaminha → aprova/devolve → RH valida → Nine-Box classifica e a edição
auditada podem ser homologados de ponta a ponta.
