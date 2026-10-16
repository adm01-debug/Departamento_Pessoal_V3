# Aprovação do gestor — implantação para a conta Abner

> Verificado por leitura no banco em **16/10/2026** (nenhuma escrita executada).
> Conta alvo: `2a1f0c4f-7587-49a7-81aa-e7e35cf0848d` (admin + gestor).

## 1. Código já implementado (o que existe e o que falta)

| Camada | Onde | Estado |
|---|---|---|
| Regra única de estado | `aprovacaoGestor.estadoAprovacao` (+ `derivarPendencias`) | ✅ pronto |
| Fila "Aguardando gestor" + contador | `PendenciasAprovacao` / `FeedbacksFiltros` | ✅ pronto |
| Decisão no modal (Aprovar / Devolver) | `FeedbackAcoesRodape` (+ `FeedbackDetalheDialog` / `FeedbacksTab`) | ✅ pronto |
| Vínculo (front) | `acoesFeedback.ehGestorResponsavel` + `avaliacaoService.listarVinculos` | ✅ pronto |
| Serviço/RPCs | `enviarAvaliacaoAoGestor`, `decidirAprovacaoGestor`, `listarConsolidacoes`, `listarAprovacoesGestor` | ✅ pronto (dependem da migration) |
| **Banco** | migrations abaixo | ❌ bloqueado |

## 2. Migration pendente (o bloqueio real)

Verificado por consulta direta (somente leitura), com a sessão autenticada:

| Objeto | Resultado | Conclusão |
|---|---|---|
| `feedbacks_360_validacoes_potencial` (colunas) | `ok` | `20261015090000` **aplicada** |
| `feedbacks_360_operacoes` (colunas) | `ok` | idem |
| `pode_gerir_avaliacoes()` | respondeu `true` | idem |
| `pode_validar_potencial()` | respondeu `false` (papel admin) | idem |
| `versao_avaliacao_feedback()` | existe | idem |
| **`feedbacks_360_aprovacoes_gestor`** | **PGRST205 — não existe** | **`20261017090000` NÃO aplicada** |
| **`feedbacks_360_consolidacoes`** | **PGRST205 — não existe** | idem |
| **`pode_aprovar_colaborador(uuid)`** | **PGRST202 — não existe/exposta** | idem |

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
2. *(Opcional)* **Aplicar** `20261018090000_ninebox_conclusao_gestor.sql`.
3. **Rodar** o PASSO 1 do `docs/ninebox-aprovacao-gestor-vinculo-abner.sql`
   (vínculo da conta ao descartável) e conferir com 1b/1c.
4. **Ligar o modo real** (`VITE_NINEBOX_MODO_REAL=true` no `.env.local`, local) e
   reiniciar o dev server — sem isso a tela permanece em demonstração.
5. **Criar a solicitação** pelo RH/admin: na fila "Aguardando gestor", botão
   *Enviar ao gestor* (RPC `enviar_avaliacao_ao_gestor`).
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
2. *(Opcional)* **Executar `20261018090000_ninebox_conclusao_gestor.sql`**
   (redefine `finalizar_feedback`: a conclusão passa a exigir o gestor responsável).
3. **Executar o PASSO 1** do SQL de vínculo (1 `UPDATE` em linha descartável,
   `user_id` nulo → conta Abner) e, se aplicável, o **PASSO 2** (`supervisor_id`
   do avaliado escolhido).
4. **Ligar `VITE_NINEBOX_MODO_REAL=true`** no ambiente do teste.

Nada disso foi executado: o diagnóstico foi **somente leitura** e o SQL está
comentado, aguardando a sua autorização.
