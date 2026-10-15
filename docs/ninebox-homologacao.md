# Nine-Box — Roteiro de homologação (ambiente isolado)

> **Nada deste roteiro foi executado.** Ele é para um ambiente de **homologação
> isolado** (projeto Supabase separado ou branch de banco). Não rode em produção.
> Cada passo tem o resultado esperado e como reverter.

## 0. Pré-requisitos

| Item | Como conferir |
|---|---|
| Projeto de homologação identificado | `select current_database(), current_user;` (bloco **Q8** de `docs/ninebox-validacao-banco.sql`) |
| Papéis reais | **Q1** — esperado `admin`, `gestor`, `rh`, `user` |
| `user_roles` e helpers | **Q2/Q3** — `user_roles(user_id, role)` e `get_user_empresas(uuid)` |
| `audit_log` compatível | **Q4/Q4b/Q4c** — `acao` aceita `INSERT`/`UPDATE` e a tabela é append-only |
| Migration ainda não aplicada | **Q7** — os 3 objetos devem aparecer como `false` |
| Dois usuários de teste: um `rh` e um `admin` | **Q2b** |
| Duas empresas de teste (isolamento) | — |

## 0b. Validar o banco ANTES de aplicar (script `docs/ninebox-validacao-banco.sql`, blocos Q1–Q16)

O script é **somente leitura**: começa com `begin; set transaction read only;` e termina com
`rollback;` — qualquer escrita acidental falharia e nada persiste. Ele existe porque os tipos
gerados (`src/integrations/supabase/types.ts`) **não** provam como o banco está.

### Como executar (manualmente, por você)

1. Abra o **Supabase SQL Editor** do projeto de **homologação** (cliente/empresa correta!).
2. **New query** → cole o conteúdo **integral** de `docs/ninebox-validacao-banco.sql`.
3. **Run** (Ctrl/Cmd + Enter). O SQL Editor mostra um resultado por bloco.
4. **Não** altere o script e **não** remova o `rollback` do fim.
5. Alternativa por terminal (mesma coisa, sem interface):
   ```
   psql "<connection string do ambiente de homologação>" -f docs/ninebox-validacao-banco.sql
   ```

> ⚠️ Se o SQL Editor rodar os comandos em transação automática, o `begin` interno é ignorado;
> ainda assim nada é gravado, porque o `rollback` final é o que decide — e **não há nenhum
> `insert`/`update`/`delete`/`alter` no arquivo** (só `select`).

### O que cada bloco responde e o que deve aparecer

| Bloco | Pergunta | Resultado esperado |
|---|---|---|
| **Q1** | Valores reais do enum `app_role` | `admin`, `gestor`, `rh`, `user` — é o que as funções da migration comparam (`role::text in ('admin','rh')` e `= 'rh'`). **Qualquer outro conjunto bloqueia a aplicação** |
| **Q2 / Q2b** | Estrutura de `user_roles` e quantos vínculos por papel | colunas `user_id`/`role`; contagem mostra se existe alguém `rh` (sem `rh`, ninguém valida Potencial) |
| **Q3** | Como a empresa autoriza o usuário (helpers usados pelas policies) | deve existir `get_user_empresas` e/ou `get_auth_empresa_id`; `security_definer` conforme hoje |
| **Q3b** | Tabela que liga empresa ↔ usuário | a mesma que `get_user_empresas()` lê (origem do isolamento por tenant) |
| **Q4 / Q4b** | Estrutura de `audit_log` e os checks da coluna `acao` | a RPC grava `'UPDATE'`/`'INSERT'` — o check (se existir) precisa aceitar esses valores |
| **Q4c** | `audit_log` é append-only? | ideal: trigger que bloqueia `UPDATE`/`DELETE` |
| **Q5 / Q5b / Q5c** | Grants, policies e colunas de `feedbacks_360` **antes** da migration | é o retrato do que a etapa 1 (endurecimento) e a etapa 2 (revogação do INSERT) vão mudar |
| **Q6** | Quem depende dos objetos alterados | views/triggers que leem `feedbacks_360` (devem continuar funcionando) |
| **Q7** | Os objetos da migration já existem? | **todos `false`** — prova de que a migration **não** foi aplicada. Se algo vier `true`, **pare** e me avise |
| **Q8** | Contexto do projeto | confirma banco/usuário/versão — coloque no retorno para eu saber onde foi rodado |
| **Q9 / Q9b** | Matriz de privilégios (`INSERT`/`UPDATE`/`DELETE`) e dono/RLS | esperado: `authenticated` com `INSERT`/`SELECT` (o `INSERT` será revogado na etapa 2) e **sem** `UPDATE`; `DELETE` bloqueado |
| **Q10** | Qual policy controla cada operação e se fecha por empresa | `INSERT` com papel **e** empresa; `UPDATE`/`DELETE` inexistentes ou bloqueados |
| **Q11** | Caminhos que contornam o cancelamento auditado | **nenhum** caminho de escrita em `feedbacks_360` fora das RPCs/triggers esperados |
| **Q12** | Policies sem filtro de empresa (risco de vazamento) | lista do que a migration precisa corrigir; **compartilhe a lista inteira** |
| **Q13** | Papéis realmente em uso | precisa incluir `rh` **se** o RH for validar Potencial; deve incluir `admin` |
| **Q14 / Q14b** | Quem mais escreve em `feedbacks_360` (funções e triggers) | nada além do esperado (a RPC é transacional) |
| **Q15 / Q15b** | O usuário lê os próprios papéis? Policies de `user_roles` | se **não** permitir, justifica os helpers `SECURITY DEFINER` da migration |
| **Q16** | Os helpers da migration já existem? | **todos `false`** (`pode_gerir_avaliacoes`, `pode_validar_potencial`, `versao_avaliacao_feedback`) |

### O que compartilhar comigo

1. Os **16 blocos** (Q1…Q16) como o SQL Editor devolveu — texto colado ou print.
2. Se algum resultado divergir da tabela acima, diga **qual bloco** e o valor exato.
3. Principalmente: **Q1** (enum), **Q5/Q5b** (grants e policies atuais), **Q7** (nada existe ainda),
   **Q9/Q10/Q11/Q12** (privilégios e caminhos de contorno), **Q13** (existe `rh`?) e **Q16**.

### Checklist de decisão antes de seguir para o §1

- [ ] Q1 = `admin, gestor, rh, user`
- [ ] Q7 e Q16 = todos `false` (migration ainda não aplicada)
- [ ] Q13 mostra pelo menos um usuário `rh` (se o RH for validar Potencial)
- [ ] Q4b permite `'UPDATE'` e `'INSERT'` em `audit_log.acao`
- [ ] Q11 não revelou outro caminho de escrita em `feedbacks_360`
- [ ] Q5/Q9/Q10 conferem com a matriz descrita no §2b deste roteiro

Só depois deste checklist seguir para o **§1 (aplicação da migration)**.


```bash
# em homologação, com backup/point-in-time ativo
supabase db push
# ou: psql -f supabase/migrations/20261015090000_ninebox_finalizacao_e_potencial.sql
```
**Esperado:** cria 2 tabelas, 2 RPCs, 1 função de versão e 1 view; revoga `update` em `feedbacks_360`; **nenhum dado alterado**.
**Conferir:** rodar **Q7** de novo (os 3 objetos → `true`) e **Q5** (`authenticated` sem `UPDATE`).

## 2. Verificação das permissões

```sql
-- 2.1 anon: deve falhar com permission denied
-- 2.2 gestor/user: devem receber perfil_nao_autorizado
select public.finalizar_feedback('<uuid-teste>', 'concluir', null, 'op-perm-1');
-- 2.3 rh e admin: concluir/cancelar/reabrir funcionam
-- 2.4 admin NÃO valida potencial
select public.validar_potencial_avaliacao('<uuid-gestor>', 'op-perm-2', null);
```

| Caso | Resultado esperado |
|---|---|
| `anon` | `permission denied for function` |
| `gestor`/`user` | erro `perfil_nao_autorizado` |
| `rh` | sucesso |
| `admin` em concluir/cancelar/reabrir | sucesso |
| `admin` em validar potencial | erro `perfil_nao_autorizado` |
| outro tenant | erro `nao_autorizado` |
| `update` direto em `feedbacks_360` | negado |

### 2b. Matriz de autorização de ESCRITA direta (correções R2/R3)

Executar **com o token de cada papel** (REST/PostgREST ou SQL com `set role`), nos dois sentidos: empresa própria e empresa de terceiros.

| # | Operação | Papel | Resultado esperado |
|---|---|---|---|
| 1 | `POST feedbacks_360` (empresa própria) | `rh` | **201** — criação permitida |
| 2 | `POST feedbacks_360` (empresa própria) | `admin` | **201** |
| 3 | `POST feedbacks_360` (empresa própria) | `gestor` / `user` | **403** (RLS `with check` com `pode_gerir_avaliacoes()`) |
| 4 | `POST feedbacks_360` com `empresa_id` de terceiros | `rh`/`admin` | **403** (`empresa_id in (select get_user_empresas(auth.uid()))` falha) |
| 5 | `POST feedbacks_360` sem `empresa_id` | `rh`/`admin` | **400/403** (`empresa_id is not null`) |
| 6 | `DELETE feedbacks_360` | `rh`, `admin`, `gestor`, `user` | **403 em todos** — privilégio revogado e policy removida |
| 7 | `PATCH feedbacks_360` (status) | qualquer papel | **403** — só a RPC altera status |
| 8 | `GET feedbacks_360` de outra empresa | `rh`/`admin` | **0 linhas** (RLS) |
| 9 | `POST` em `feedbacks_360_operacoes` / `feedbacks_360_validacoes_potencial` | qualquer papel | **403** — somente leitura; escrita é da RPC |
| 10 | `rpc finalizar_feedback` com `p_acao` inválida | `rh` | erro `acao_invalida` |
| 11 | `rpc finalizar_feedback` sem `p_idempotencia` | `rh` | erro `idempotencia_ausente` |

## 3. Criação de registros de teste (só em homologação)

Por empresa/ciclo: colaborador **A** com 4 avaliações — **gestor** (4,5 + potencial 4), **par** (4,0), **auto** (3,5), **subordinado** (4,2), todas `pendente`; colaborador **B** com **apenas gestor**; colaborador **C** **sem gestor** (só par/auto).
**Esperado ao final:** A fecha em **4,26** (60/25/10/5).

## 4. Finalização de feedback

```
rpc finalizar_feedback(gestor, 'concluir', null, 'op-h1')  → { status_novo: 'concluido', auditoria_id, idempotente: false }
rpc finalizar_feedback(par,    'concluir', null, 'op-h2')
rpc finalizar_feedback(auto,   'concluir', null, 'op-h3')
rpc finalizar_feedback(sub,    'concluir', null, 'op-h4')
```
**Conferir:** 1 linha nova em `audit_log` por operação, com `dados_anteriores.status='pendente'`, `dados_novos.status='concluido'`, `campos_alterados=['status']` e `user_id` correto.

## 5. Validação de Potencial (RH)

```
rpc validar_potencial_avaliacao(gestor, 'op-h5', 'conferido com o gestor')
→ { ok: true, versao_avaliacao: '<id|updated_at|4|concluido>', potencial_validado: 4 }
```

| Caso | Esperado |
|---|---|
| gestor ainda `pendente` | `avaliacao_nao_concluida` |
| avaliação de par/auto | `nao_e_avaliacao_do_gestor` |
| sem `potencial` | `potencial_ausente_ou_invalido` |
| chamada por `admin` | `perfil_nao_autorizado` |
| repetir a MESMA `p_idempotencia` | resposta idêntica com `idempotente: true`, **sem nova linha** em `audit_log` |
| mesma chave + `p_observacao` diferente | `idempotencia_conflito` |

## 6. Consolidação de Desempenho

Consolidar com `consolidarNineBox360` (ou conferir o cálculo em SQL).
**Esperado:** `(4,5×60 + 4,0×25 + 3,5×10 + 4,2×5)/100 = 4,26`.
Colaborador **B** (sem subordinado): pesos `60/95`, `25/95`, `10/95` → `405/95 = 4,2631…` (não 4,26; ausência **nunca** vira zero).

## 7. Classificação nos nove quadrantes

| Desempenho | Potencial | Quadrante esperado |
|---|---|---|
| 4,26 | 4 | `3-3` — Estrela |
| 4,0 | 3,0 | `3-2` — Alto Profissional |
| 3,0 | 4,0 | `2-3` — Alto Potencial |
| 1,5 | 3,0 | `1-2` — Dilema |

**Conferir também:** colaborador **C** (sem gestor) → `classificavel: false` / `sem_gestor`; sem potencial validado → `potencial_sem_validacao`.

## 8. Reabertura e invalidação

```
rpc finalizar_feedback(gestor, 'reabrir', 'potencial informado incorretamente', 'op-h6')
```
**Esperado:** volta a `pendente`; a **versão muda** ⇒ a validação anterior deixa de valer e a consolidação passa a `potencial_sem_validacao`. A linha antiga **permanece** em `feedbacks_360_validacoes_potencial` (histórico). Nova validação só após reconcluir.
**Justificativa curta** (<10 caracteres) → erro `justificativa_obrigatoria`.

## 9. Cancelamento e auditoria

```
rpc finalizar_feedback(auto, 'cancelar', 'avaliação lançada em duplicidade', 'op-h7')
```
**Esperado:** status `cancelado`; o registro **permanece** (nenhum DELETE); a autoavaliação **sai** do cálculo — desempenho de A passa a `(4,5×60 + 4,0×25 + 4,2×5)/90`; `audit_log` com antes/depois; motivo retornado em `observacao`.
**Proibido:** `concluido → cancelado` direto → `transicao_invalida`.

## 10. Concorrência e idempotência

| Teste | Esperado |
|---|---|
| duas chamadas simultâneas `concluir` (chaves diferentes) | 1 sucesso + 1 `transicao_invalida` |
| duas simultâneas com a MESMA chave | 1 gravação; a segunda devolve `idempotente: true` sem nova auditoria |
| mesma chave + `p_acao` diferente | `idempotencia_conflito` |
| reenvio após sucesso | resposta idêntica; `audit_log` inalterado |

## 11. KPIs × dados persistidos

Com o modo real ligado (homologação), a tela deve mostrar **colaboradores classificados = pessoas únicas classificadas** (não nº de feedbacks), soma dos 9 quadrantes = classificados, não classificados contados à parte, e "Talentos em destaque"/"Insights" derivados da mesma lista. Comparar com:

```sql
select ciclo_id, count(distinct avaliado_id) as pessoas, count(*) as registros
from public.feedbacks_360 group by 1;
```

## 12. Isolamento entre empresas

Com usuário da empresa A, tentar operar/ler registros da empresa B: esperado `nao_autorizado` (RPC) e **zero linhas** (SELECT/RLS). Repetir com a view `vw_feedbacks_360_versao`.

## 13. Rollback

1. Rodar **manualmente** `supabase/rollback/20261015090000_ninebox_finalizacao_e_potencial.rollback.sql`
   (recria a policy e o `grant update`; remove as 2 RPCs, a view e a função de versão).
2. **Não** apagar `feedbacks_360_operacoes` / `feedbacks_360_validacoes_potencial` (histórico).
3. Conferir com **Q5** que `authenticated` voltou a ter `UPDATE`.
4. Status já gravados pelas RPCs **permanecem** — reverta manualmente se necessário, com auditoria.

## 15. Roteiro MÍNIMO de ativação (o caminho mais curto)

### 15.1 Homologação — dois caminhos, o mesmo SQL

**A) Com Docker funcionando (stack local, nada sai da máquina):**
```bash
supabase start                 # sobe Postgres + Auth + PostgREST locais
supabase db reset              # aplica as 649 migrations do repo (inclui o Nine-Box)
supabase test db               # roda supabase/tests (pgTAP), se aplicável
```
**B) Com o projeto Supabase de homologação (o que será fornecido):**
```bash
supabase link --project-ref <ref-do-homolog>
supabase db push               # aplica apenas o que falta (as 649 + Nine-Box)
# ou, sem CLI: cole o conteúdo de cada migration no SQL Editor, em ordem de nome
```
Nas duas opções, valide depois com `docs/ninebox-validacao-banco.sql` (Q1–Q16),
`docs/ninebox-verificacao-truncate.sql` (T1–T9 + `ACEITE`) e
`docs/ninebox-testes-seguranca.sql` (24 casos) — ver §0b.

### 15.2 Dependências já conferidas (offline)

As 649 migrations do repositório criam **tudo** que a migration do Nine-Box consome:

| Objeto exigido | Criado por |
|---|---|
| `app_role`, `user_roles` | `20251220135248_…` |
| `audit_log` | `20251220132737_…` |
| `get_user_empresas` | `20251220140409_…` |
| `colaboradores` | `20250102000000_dp_production.sql` |
| `feedbacks_360`, `ciclos_avaliacao` | `20260315220807_…` |
| `feedbacks_360_operacoes`, `feedbacks_360_validacoes_potencial`, `vw_feedbacks_360_versao` | **a própria** migration do Nine-Box (por isso Q7 deve vir tudo `false` antes) |

### 15.3 Banco PRINCIPAL — ordem obrigatória (só após homologação aprovada)

```bash
# 1) BACKUP / point-in-time ativo (obrigatório)
# 2) ETAPA 1 — endurecimento + RPCs + validação de Potencial
supabase link --project-ref <ref-principal>
supabase db push            # (ou SQL Editor, com 20261015090000_…)
# 3) Confirmar: Q1–Q16 de novo — agora Q7 e Q16 devem vir TRUE
# 4) Ligar o modo real no app: NINEBOX_MODO_REAL_ATIVO = true (nineBoxModo.ts)
# 5) ETAPA 2 — revogar o INSERT direto (só depois de o modo real estar em uso)
supabase db push            # (ou 20261016090000_ninebox_revoga_insert_direto.sql)
```

### 15.4 Rollback (preparado, testado na leitura)

| Situação | Arquivo |
|---|---|
| Voltar a etapa 2 (reautorizar INSERT direto) | `supabase/rollback/20261016090000_revoga_insert_direto_rollback.sql` |
| Desfazer a etapa 1 | `supabase/rollback/*rollback-operacional.sql` e `*rollback-seguranca.sql` |
| Emergência total | point-in-time / backup do passo 1 |

Ordem de rollback: primeiro a etapa 2, depois a etapa 1 — nunca o inverso (a
etapa 1 é pré-requisito da 2).

## 14. Critérios de aceite

Os 13 blocos acima com resultado esperado, nenhum erro 500 inesperado, **uma linha de auditoria por operação**, nenhum vazamento entre empresas e o **Nine-Box visual inalterado** (comparar screenshot antes/depois).
