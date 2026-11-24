# Nine-Box — estabilização e reconciliação com o Supabase principal

**Branch:** `muri`
**Data:** 21/10/2026
**Supabase principal:** `frjbfeamybqsejlvmqbl`
**Regra:** nenhuma alteração foi executada no banco principal nesta rodada.

## Situação real do banco (verificada em 21/10/2026)

A verificação foi feita por catálogo e por chamadas somente leitura à API do
projeto. O principal **não está simplesmente “sem as migrations 20261021/22/25/26”**:
ele contém uma aplicação parcial, feita fora do histórico local, e possui uma
correção remota adicional em `decidir_aprovacao_gestor` que não existe no
repositório.

| Item                                                                                                                                                                 | Estado no principal                                                                                                                    | Conclusão                                                                |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Colunas `desempenho_proposto`, `potencial_proposto`, `desempenho_aprovado`, `potencial_aprovado`, `aprovado_por`, `aprovado_em`, `aprovacao_id`, `snapshot_aprovado` | Todas existem, com as constraints `fbc_*` de escala                                                                                    | Equivalente à parte estrutural de `20261021090000`; **não reaplicar**    |
| `sincronizar_consolidacao_avaliacao`                                                                                                                                 | Existe; contém `desempenho_proposto`, limpa snapshot quando a versão muda                                                              | Equivalente à versão de `20261021090000`; **não substituir**             |
| `decidir_aprovacao_gestor`                                                                                                                                           | Existe; sem `separacao_de_funcoes`; contém a checagem remota adicional `empresa_ciclo_colaborador_inconsistentes`                      | Correção remota mais nova que o repositório; **preservar integralmente** |
| `20261025090000` (autoria)                                                                                                                                           | Função normalizada é idêntica à de `20261021090000`                                                                                    | **Não há objeto novo**; migration redundante, não reaplicar              |
| `pode_finalizar_feedback`                                                                                                                                            | **Ausente** (`PGRST202`)                                                                                                               | Criar                                                                    |
| `finalizar_feedback`                                                                                                                                                 | Existe, mas é a versão antiga (carrega a linha antes da autorização e não usa o helper)                                                | Substituir pela versão autorizada                                        |
| `editar_feedback_seguro`                                                                                                                                             | **Ausente** (`PGRST202`)                                                                                                               | Criar                                                                    |
| CHECK de `feedbacks_360_operacoes`                                                                                                                                   | Lista apenas `concluir`, `cancelar`, `reabrir`, `validar_potencial`, `criar`, `decidir_aprovacao_gestor`, `enviar_avaliacao_ao_gestor` | Acrescentar `editar_feedback`                                            |
| Policies de INSERT/DELETE de `ciclos_avaliacao`                                                                                                                      | Apenas `empresa_id in (get_user_empresas(auth.uid()))`; não exigem `pode_gerir_avaliacoes`                                             | Substituir                                                               |
| Trigger `ciclos_bloqueio_exclusao_com_dependencias`                                                                                                                  | **Ausente**                                                                                                                            | Criar                                                                    |
| Grants de `feedbacks_360`                                                                                                                                            | `authenticated` não tem UPDATE nem TRUNCATE; `anon` não tem TRUNCATE                                                                   | Já corretos; não reaplicar bloqueios antigos                             |
| Consolidações aprovadas                                                                                                                                              | 3 registros aprovados                                                                                                                  | Dados existentes; não alterar                                            |

As migrations remotas `20261021000000`, `20261021010000`, `20261022000000` e
`20261023000000` existem apenas no histórico do principal. A função remota de
`decidir_aprovacao_gestor` foi preservada exatamente como está; nenhuma tentativa
de sobrescrevê-la foi feita.

## O que já estava implantado e NÃO será reaplicado

- Estrutura de snapshot e constraints de `20261021090000`.
- `sincronizar_consolidacao_avaliacao` com limpeza de snapshot na mudança de versão.
- `decidir_aprovacao_gestor`, incluindo a validação remota de consistência
  empresa × ciclo × colaborador.
- Revogações de UPDATE/TRUNCATE de `feedbacks_360`.
- `20261025090000`: funcionalmente idêntica à versão de 210; não acrescenta objeto.
- `20261022090000` nas partes de UPDATE/TRUNCATE (já refletidas em migrations
  anteriores); somente o helper e a RPC de conclusão faltam.

## Migration incremental preparada

**Arquivo:** `supabase/migrations/20261027090000_ninebox_reconciliacao_incremental.sql`

Contém somente o que falta:

1. `pode_finalizar_feedback` + permissões mínimas.
2. Versão autorizada de `finalizar_feedback` (RH/admin, avaliador designado ou
   gestor responsável/exceção).
3. `pode_editar_feedback` e `editar_feedback_seguro`: RH/admin por empresa ou
   gestor responsável/exceção, sem conceder acesso entre tenants.
4. Máquina de estados da edição: `pendente` permanece pendente; `concluído`
   reabre para `pendente` e invalida a aprovação pela nova versão; `cancelado`
   NÃO é reativado; status desconhecido é bloqueado.
5. Ampliação do CHECK de operações para `editar_feedback`.
6. Policies de INSERT/DELETE de ciclos com `pode_gerir_avaliacoes()`.
7. Função e trigger `ciclos_bloqueio_exclusao_com_dependencias`, incluindo
   dependências de feedbacks, consolidações, aprovações, validações de Potencial,
   metas e histórico de auditoria. PDI não possui `ciclo_id` (FK para
   `colaboradores`/`empresas`), portanto não é dependência do ciclo.
8. `notify pgrst, 'reload schema'` para expor as RPCs criadas.

A migration **não**:

- recria colunas, constraints ou índices já existentes;
- substitui `decidir_aprovacao_gestor` ou `sincronizar_consolidacao_avaliacao`;
- altera dados, notas, consolidações ou histórico;
- altera layout, mocks, frontend ou permissões de outros módulos.

**Rollback:** `supabase/rollback/20261027090000_ninebox_reconciliacao_incremental_rollback.sql`.
O rollback restaura a definição **exata capturada do principal** para
`finalizar_feedback` (não a versão histórica do repositório), remove os objetos
novos e restaura as policies anteriores. O CHECK restaura a definição anterior
exata quando não existem linhas `editar_feedback`; se existirem, mantém o rótulo
para preservar o histórico de idempotência. Nenhum feedback, ciclo, aprovação ou
auditoria é apagado.

## Teste PostgreSQL/PGlite

Executado com PGlite (`@electric-sql/pglite`, PostgreSQL WASM) sobre um schema
equivalente ao principal:

```text
OK — helper pode_finalizar_feedback criado
OK — finalizar_feedback substituída
OK — editar_feedback_seguro criado
OK — decidir remoto preservado
OK — sincronizar remoto preservado
OK — CHECK aceita editar_feedback
OK — policies de ciclo exigem pode_gerir_avaliacoes
OK — trigger de bloqueio de ciclo criado
OK — RH conclui preparação pela RPC autorizada
OK — avaliador designado conclui sem supervisor_id
OK — usuário sem vínculo é bloqueado
OK — avaliador não executa ação administrativa de reabrir
OK — edição reabre o registro
OK — edição é idempotente
OK — operação editar_feedback foi gravada uma vez
OK — gestor responsável edita
OK — gestor não responsável é bloqueado
OK — usuário comum é bloqueado
OK — usuário de outra empresa é bloqueado
OK — gestor com exceção temporária válida edita
OK — exceção expirada é bloqueada
OK — edição de concluído reabre e invalida pela nova versão
OK — edição NÃO reativa feedback cancelado
OK — reabertura administrativa de cancelado é permitida com justificativa
OK — gestor não reabre cancelado por conta própria
OK — status desconhecido é bloqueado
OK — ciclo sem dependências pode ser excluído
OK — ciclo com feedback é bloqueado
OK — ciclo com aprovação é bloqueado
OK — ciclo com consolidação é bloqueado
OK — ciclo com validação é bloqueado
OK — ciclo com meta é bloqueado
OK — ciclo com histórico de auditoria é bloqueado
OK — ciclo com dependências é bloqueado
OK — rollback remove o helper
OK — rollback remove o helper de edição
OK — rollback remove o helper de edição por colaborador
OK — rollback remove a edição segura
OK — rollback remove o trigger de ciclo
OK — rollback restaura policies sem ampliar privilégios
OK — rollback restaura a definição remota anterior de finalizar_feedback
OK — rollback preserva decidir remoto
OK — rollback preserva feedbacks, auditoria e idempotência
OK — rollback restaura CHECK anterior exato sem histórico de edição
→ Todas as verificações passaram
```

A migration foi aplicada **duas vezes** no teste para comprovar idempotência.
O teste também cria stubs de `decidir_aprovacao_gestor` e
`sincronizar_consolidacao_avaliacao` e confirma que ambos permanecem intocados.

## Testes locais anteriores preservados

- 524 testes unitários focados em Nine-Box, Feedbacks, aprovação, serviços e auth.
- Playwright `feedbacks-padronizacao`: 5/5.
- Playwright `layout-protegido-desempenho --workers=1`: 6/6.
- `npm run build`: OK.
- `node scripts/verificar-layout-protegido.mjs`: OK.
- `tsc --noEmit`: sem erros nos arquivos alterados; erros preexistentes em
  módulos não relacionados (`AdminDiagnosticoMigracaoPage`, `vinculoService`,
  `tabelasReferenciaService`) permanecem fora do escopo.

## Segurança e dependências

- A migration foi escrita para `SECURITY DEFINER`, com `search_path` fixo.
- `pode_finalizar_feedback` exige autenticação, empresa do registro e uma das
  três provas: RH/admin, avaliador designado ou gestor responsável/exceção.
- `pode_editar_feedback` aplica a mesma régua para edição, sem alterar
  `pode_gerir_avaliacoes()`, sem UUID/e-mail fixo e sem permitir acesso entre
  tenants. O gestor que tentar mover o feedback para colaborador fora de sua
  responsabilidade é bloqueado. Exceções temporárias vêm de
  `ninebox_permissoes_homologacao` e expiram pelo servidor.
- Cancelamento é terminal para edição. Reabrir exige a RPC administrativa
  `finalizar_feedback(..., 'reabrir', justificativa, ...)`, com auditoria.
- A aprovação consolidada continua exclusiva de `decidir_aprovacao_gestor`;
  a migration não cria um segundo caminho de aprovação.
- O trigger de ciclo verifica feedbacks, consolidações, aprovações, validações
  de Potencial, metas e histórico de auditoria antes do DELETE. PDI não tem
  `ciclo_id`; suas FKs apontam para colaborador/empresa e não são dependência
  do ciclo.
- Na rodada de reconciliação descrita acima não houve aplicação no principal.
  Após autorização, `20261027090000` e `20261028090000` foram aplicadas no
  principal; o fechamento desta rodada **não executou** DDL/DML no Supabase.
  Nenhuma credencial ou segredo foi gravado no repositório.

## Riscos remanescentes

- A função remota `pode_aprovar_colaborador` contém um UUID fixo de homologação
  além da tabela `ninebox_permissoes_homologacao`. Ela **não foi alterada** por
  esta migration (restrição de não sobrescrever funções já corrigidas no
  principal); o helper de edição **não a utiliza**, justamente para não herdar
  esse UUID fixo.
- A exceção temporária de edição é registrada por usuário, sem escopo por
  colaborador, porque a tabela remota não possui essa coluna. O acesso continua
  limitado à empresa e ao papel `gestor`, com expiração.
- PDI não possui `ciclo_id`; se o negócio exigir bloquear ciclo por PDI, será
  necessário criar um vínculo explícito PDI × ciclo em tarefa separada.
- O lock de concorrência é `SELECT ... FOR UPDATE` na linha do feedback; a
  idempotência por operação foi testada, mas o ambiente local PGlite é
  single-connection e não executa duas transações concorrentes reais.

## Transferência entre colaborador/ciclo

O trigger remoto `trg_feedbacks_360_consolidacao` foi confirmado no principal e
sincroniza **os dois grupos** quando `avaliado_id` ou `ciclo_id` mudam:
`new.avaliado_id/new.ciclo_id` e, na sequência, `old.avaliado_id/old.ciclo_id`.
A atualização ocorre na mesma transação da edição; se a sincronização falhar, a
edição é desfeita. Por isso a transferência foi mantida permitida, com
autorização para o colaborador de destino.

Teste real em PostgreSQL 17 isolado (banco descartável, sem Supabase):

- transferência de COLAB/CICLO_A para TARGET/CICLO_B;
- retorno `ok=true`, `status=pendente`;
- snapshot/aprovação do grupo antigo limpo;
- histórico de aprovação preservado;
- chamadas de sincronização registradas para o grupo antigo e o novo;
- rollback posterior removeu as RPCs novas e preservou 1 feedback e 1 operação
  de idempotência.

## Compatibilidade do rollback com o frontend

O frontend atual chama `editar_feedback_seguro` para feedbacks reais. Se o SQL
de rollback for aplicado mantendo o bundle novo, a edição real passará a
responder `PGRST202`. Portanto o rollback completo é **aplicação anterior +
SQL**, nesta ordem:

1. Identificar o build/tag/commit estável anterior à introdução da dependência
   de `editar_feedback_seguro`.
2. Publicar esse bundle anterior (ou manter uma janela de manutenção).
3. Invalidar cache/CDN/PWA e confirmar que o bundle antigo está ativo.
4. Aplicar o rollback SQL.
5. Verificar que nenhuma tela chama `editar_feedback_seguro`,
   `pode_editar_feedback` ou `pode_editar_colaborador`.
6. Revalidar login/F5 e o fluxo de edição disponível na versão anterior.

Se não existir um bundle anterior sem essa dependência, **não aplicar o rollback
SQL isoladamente**: mantenha a RPC ou faça o rollback do frontend na mesma janela.

## Encerramento da estabilização — 21/10/2026

### Estado do banco

- `20261027090000_ninebox_reconciliacao_incremental.sql` e
  `20261028090000_ninebox_justificativa_historico.sql` foram aplicadas no
  principal `frjbfeamybqsejlvmqbl` após autorização explícita.
- Esta rodada de encerramento **não executou migrations, DDL, DML ou qualquer
  escrita SQL** no Supabase.
- As funções remotas `decidir_aprovacao_gestor` e
  `sincronizar_consolidacao_avaliacao` foram preservadas.

### Homologação funcional confirmada

| Cenário | Resultado |
| --- | --- |
| Fluxo principal RH → Gestor → Nine-Box | **Homologado pelo usuário** |
| Cancelamento de feedback REAL (UUID) | **Confirmado no banco** |
| Justificativa do cancelamento | Visível no card e no histórico |
| Persistência após F5 | Confirmada |
| Novo login | Confirmado na homologação do usuário |
| Registro demonstrativo | Continua separado, salvo somente no navegador |
| Histórico da avaliação | Atualizado imediatamente e após recarregar |

O cancelamento real foi operado sobre um registro **REAL/PENDENTE** da empresa
TIME PROMO, no ciclo `HOMOLOG-NB Ciclo Nine-Box`
(`5fa9996e-1d18-4942-b037-cbf3c46827a1`). O UUID de referência do roteiro de
homologação foi `6a606a8a-3019-4a41-aebb-903b190b2958` (Camila Pereira Dias).
A confirmação de origem veio do painel temporário e do retorno da RPC
`finalizar_feedback` com `ok:true`, `status_novo=cancelado` e `auditoria_id`.

A justificativa foi gravada em `audit_log` e exibida no card e no histórico. O
registro não foi apagado. A distinção real × demonstração foi mantida: os IDs
`mock-*`/`demo-*` nunca são convertidos em UUID nem enviados ao Supabase.

### Painel de origem

- O componente `OrigemHomologacao` foi preservado para futuras homologações.
- `VITE_HOMOLOG_ORIGEM=false` no `.env.local`; sem essa flag explícita em DEV o
  painel retorna `null` e não é exibido aos usuários.
- O painel fica fora da árvore dos cards e não alterou o layout aprovado.
- Verificação no navegador após desativar a flag: `PAINEL_ATIVO 0`.

### Regressão final

Executada em 21/10/2026, com `VITE_HOMOLOG_ORIGEM=false`:

| Suíte | Resultado |
| --- | --- |
| Unitários de Feedbacks/execução/edição/histórico/aprovação/Nine-Box | **251/251** |
| Painel de origem (testes dedicados) | **3/3** |
| `feedbacks-historico.spec.ts` | **1/1 cenário** |
| `feedbacks-padronizacao.spec.ts` | **4/4 cenários** |
| `ninebox-aprovacao.spec.ts` | **1/1 cenário** |
| `layout-protegido-desempenho.spec.ts` | **5/5 cenários** |
| Playwright combinado (inclui setup de autenticação) | **12/12** |
| `npm run build` | **OK** |
| `npm run verificar:layout` | **OK — nenhuma âncora visual alterada** |

O teste E2E de Nine-Box foi alinhado ao contrato homologado atual: a aprovação
do gestor classifica diretamente a matriz, **sem etapa posterior de validação
do RH**. A versão anterior do teste ainda esperava o fluxo legado
“aprovada pelo gestor aguardando RH” e foi corrigida apenas no teste; nenhuma
funcionalidade do módulo foi alterada.

### Resultado final

**HOMOLOGADO E ESTÁVEL.** O fluxo RH → Gestor → Nine-Box e o cancelamento real
foram confirmados; a persistência, a justificativa, o histórico, o F5 e o novo
login foram validados. A migration foi aplicada no principal e o encerramento
não introduziu novas alterações de banco.

Critérios de manutenção:

1. Manter `VITE_HOMOLOG_ORIGEM=false` fora de uma sessão de homologação.
2. Não reaplicar as migrations já aplicadas.
3. Preservar `decidir_aprovacao_gestor` e `sincronizar_consolidacao_avaliacao`.
4. Rollback SQL somente com o bundle frontend compatível.
5. Repetir a regressão de Feedbacks, aprovação, Nine-Box e histórico antes de
   novo deploy.
