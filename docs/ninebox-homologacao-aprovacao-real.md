# Homologação REAL da Aprovação do Gestor — runbook de implantação

> Diagnóstico por **leitura** no Supabase principal em 16/10/2026 (nenhuma
> escrita). Migration **pronta para revisão**; **não aplicada**.
> Relacionados: `docs/ninebox-aprovacao-gestor-implantacao.md` (contexto),
> `docs/ninebox-aprovacao-gestor-vinculo-abner.sql` (vínculo),
> `supabase/rollback/20261017090000_ninebox_aprovacao_gestor_rollback.sql`.

## 1. Estado real verificado agora (somente leitura)

| Item | Resultado | Leitura |
|---|---|---|
| Papéis de **Abner** `2a1f0c4f-7587-49a7-81aa-e7e35cf0848d` | `['admin','gestor']` | ✅ o banco já reconhece os dois papéis |
| Papéis de **RH** `rh.ninebox.teste@promobrindes.com.br` | `role = 'rh'` no `user_id` **`60767f3f-bb08-4917-9d74-17ce19ef8adb`** | ✅ usuário existe e tem o papel exigido por `pode_validar_potencial()` |
| `colaboradores.user_id = 2a1f0c4f…` | **0 linhas** | ❌ **sem vínculo** → `pode_aprovar_colaborador` seria `false` |
| Descartável de homologação (`cpf 00000000000`) | `0f303507-5b13-4ca2-aa76-16122b5b37e9`, `user_id` **nulo** | pronto para o PASSO 1 do vínculo |
| `feedbacks_360` gestor + `concluido` | **0 linhas** | não há avaliação real atribuível ainda |
| `feedbacks_360_consolidacoes` / `feedbacks_360_aprovacoes_gestor` | **PGRST205** (não existem) | migration pendente |
| `pode_aprovar_colaborador(uuid)` / `situacao_aprovacao(uuid,uuid)` | **PGRST202** (não existem) | migration pendente |

**Conclusão:** o bloqueio é 100% de implantação — **migration + vínculo** — e não
de código: a interface, as RPCs e a leitura do fluxo já estão implementadas.

## 2. Migration para revisão

`supabase/migrations/20261017090000_ninebox_aprovacao_gestor.sql`
(aditiva; a `20261015090000`, já aplicada, **não** é alterada).

**Cria**
- funções `colaborador_id_do_usuario(uuid)`, `pode_aprovar_colaborador(uuid)`,
  `enviar_avaliacao_ao_gestor(uuid,uuid,text)`,
  `situacao_aprovacao(uuid,uuid)`, `decidir_aprovacao_gestor(uuid,uuid,text,text,text)`;
- tabelas `feedbacks_360_consolidacoes` (1 linha por colaborador+ciclo) e
  `feedbacks_360_aprovacoes_gestor` (histórico **append-only**).

**Garantias de segurança (revisadas)**
- **Autorização no servidor**: a decisão exige papel `gestor` **e** vínculo
  (`alvo.supervisor_id = gestor.id` ou o próprio) — `admin`/`rh` recebem
  `perfil_nao_autorizado`; o RH **não** substitui a aprovação do gestor.
- **Isolamento por empresa**: `get_user_empresas(auth.uid())` em todas as RPCs e
  nas duas policies de `SELECT` (sem policy de escrita — gravação só por RPC
  `security definer`).
- **Âncora de versão**: a decisão guarda `versao_avaliacao` + `revisao`; reabrir
  ou alterar a avaliação invalida a aprovação **sem mecanismo novo**
  (`situacao_aprovacao` compara a versão vigente).
- **Idempotência por operação** (`feedbacks_360_operacoes.idempotency_key` único
  + comparativo de `hash_parametros`) e **auditoria** em `audit_log` com
  `empresa_id`, autor, e-mail e versão.
- **Validação do Potencial continua exclusiva do RH** e exige aprovação vigente
  (a `validar_potencial_avaliacao` da migration já aplicada passa a encontrar a
  aprovação `situacao_aprovacao = 'aprovada_gestor'`).

**Ajustes feitos nesta revisão (antes de aplicar)**
1. **`commit;` no fim** do arquivo (o `begin;` existia e o fechamento não) —
   envelope transacional íntegro, igual ao padrão da casa.
2. **CHECK de `feedbacks_360_operacoes.operacao` ampliado** (aditivo, descobre a
   constraint em `pg_constraint` e a recria) para aceitar
   `'decidir_aprovacao_gestor'` e `'enviar_avaliacao_ao_gestor'`. Sem isso a
   decisão do gestor **falharia** ao registrar idempotência (ou gravaria com
   rótulo enganoso — era o caso: usava `'validar_potencial'`).
3. **Rótulo correto** na trilha da decisão (`decidir_aprovacao_gestor`).
4. **Envio ao gestor agora é idempotente e auditável** (a chave existia e não era
   gravada).
5. **Privilégios mínimos** nas 4 funções restantes: `revoke ... from public, anon`
   + `grant execute ... to authenticated` (mesmo padrão da 20261015090000).

**Rollback pronto**: `supabase/rollback/20261017090000_ninebox_aprovacao_gestor_rollback.sql`
(apaga só o que esta migration criou, restaura o CHECK original e **preserva** o
`audit_log`; prova pós-rollback no fim do arquivo).

Opcional (não necessário para o fluxo de aprovação):
`supabase/migrations/20261018090000_ninebox_conclusao_gestor.sql`
(redefine `finalizar_feedback` para exigir o gestor responsável na conclusão).

---

## 3. Procedimento mínimo de implantação (após a SUA autorização)

**Janela:** baixo uso (cria tabelas e recria um CHECK — trava
`feedbacks_360_operacoes` por instantes).
**Nada de terceiros é alterado**: só objetos novos + o vínculo da linha
descartável de homologação.

| # | Passo | Comando / ação | Verificação |
|---|---|---|---|
| 0 | Backup lógico do alvo | `pg_dump` do schema `public` (ou snapshot do painel) | arquivo gerado |
| 1 | Aplicar a migration | `supabase db push` **ou** colar o arquivo no SQL Editor | §4.1 responde `200` |
| 2 | Vínculo de responsabilidade (Abner) | `docs/ninebox-aprovacao-gestor-vinculo-abner.sql` **PASSO 1** (1 `UPDATE` na linha `0f303507…`, `user_id` nulo → `2a1f0c4f…`) | §4.2 devolve 1 linha |
| 3 | (Opcional) responsabilidade sobre OUTRO avaliado | **PASSO 2** do mesmo arquivo (`supervisor_id` do avaliado → descartável) | §4.3 |
| 4 | Ligar o modo real na homologação | `VITE_NINEBOX_MODO_REAL=true` no `.env.local` **local** (os mocks continuam no código; a flag só troca a origem dos dados) + reiniciar o `vite dev` | a área passa a ler o banco |
| 5 | Roteiro real pela interface | §5 (R1…R15) | decisão sobrevive ao F5 |
| 6 | Se algo falhar | `supabase/rollback/20261017090000_ninebox_aprovacao_gestor_rollback.sql` | prova no fim do arquivo |

> O PASSO 4 é reversível: `VITE_NINEBOX_MODO_REAL=false` devolve o módulo à
> vitrine, **sem** perda das decisões reais já gravadas.

## 4. Comandos de verificação

### 4.1 A migration existe no banco? (PostgREST, com a sessão do app)

```bash
# tabelas novas (esperado: 200)
curl -s -o /dev/null -w '%{http_code}\n' "$SUPABASE_URL/rest/v1/feedbacks_360_consolidacoes?select=colaborador_id&limit=1" \
  -H "apikey: $ANON" -H "Authorization: Bearer $TOKEN"
curl -s -o /dev/null -w '%{http_code}\n' "$SUPABASE_URL/rest/v1/feedbacks_360_aprovacoes_gestor?select=colaborador_id&limit=1" \
  -H "apikey: $ANON" -H "Authorization: Bearer $TOKEN"
# RPC nova (esperado: 200; antes da migration: 404 PGRST202)
curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/pode_aprovar_colaborador" \
  -H "apikey: $ANON" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"p_colaborador_id":"0f303507-5b13-4ca2-aa76-16122b5b37e9"}'
```
Atalho pronto no repositório (somente leitura): `node scripts/_tmp-diagnostico-homologacao-real.mjs`
→ grava `tmp-homologacao-real/diagnostico.json`.

### 4.2 O vínculo de responsabilidade está correto? (SQL)

```sql
-- 1) O colaborador vinculado a Abner (esperado: 1 linha com user_id = 2a1f0c4f-…)
select id, nome_completo, empresa_id, user_id, supervisor_id
  from public.colaboradores
 where user_id = '2a1f0c4f-7587-49a7-81aa-e7e35cf0848d';

-- 2) Autorização NA SESSÃO DE ABNER (esperado: true só para o próprio/seus avaliados)
select public.pode_aprovar_colaborador('0f303507-5b13-4ca2-aa76-16122b5b37e9');  -- true
select public.pode_aprovar_colaborador('<uuid de colaborador alheio>');           -- false

-- 3) Estado do fluxo (fonte única do app)
select public.situacao_aprovacao('<colaborador>','<ciclo>');
-- em_preparacao | aguardando_gestor | devolvida | aprovada_gestor | concluida_validada
```

### 4.3 Efeitos observáveis (depois do roteiro real)

```sql
select colaborador_id, decisao, versao_avaliacao, revisao, decidido_por, decidido_em
  from public.feedbacks_360_aprovacoes_gestor order by decidido_em desc limit 5;

select operacao, idempotency_key, criada_em
  from public.feedbacks_360_operacoes
 where operacao in ('decidir_aprovacao_gestor','enviar_avaliacao_ao_gestor')
 order by criada_em desc limit 5;

select tabela, acao, registro_id, user_email, dados_novos
  from public.audit_log
 where tabela in ('feedbacks_360_aprovacoes_gestor','feedbacks_360_consolidacoes')
 order by created_at desc limit 10;

-- recusa do servidor quando quem executa NÃO é o gestor responsável
-- (rodar com a sessão do RH; esperado: erro 'perfil_nao_autorizado')
select public.decidir_aprovacao_gestor('<colaborador>','<ciclo>','aprovado',null,'prova-rh');
```

### 4.4 Integridade do SQL (sem banco)

`node scripts/_tmp-verificar-migration-aprovacao.mjs` → envelope `begin/commit`,
tabelas referenciadas × criadas, rótulos dentro do CHECK, `revoke/grant` das 5
funções e ausência de DML fora de função. **Resultado atual: OK.**

## 5. Roteiro real (R1–R15) e o que cada passo exige

| # | Passo | Exige |
|---|---|---|
| R1 | RH autentica (`rh.ninebox.teste@promobrindes.com.br`) | login do RH |
| R2 | Gestor autentica (Abner) | login de Abner |
| R3 | Gestor **incorreto** não acessa aprovação | 2ª sessão sem vínculo (servidor recusa) |
| R4 | RH cria a avaliação do gestor (Novo Feedback, tipo Gestor → **Concluir avaliação**) | migration + vínculo + colaborador real |
| R5 | O registro persiste após F5 | — |
| R6 | RH envia ao gestor (`enviar_avaliacao_ao_gestor`) | migration |
| R7 | Gestor aprova (`decidir_aprovacao_gestor`) | vínculo + papel `gestor` |
| R8 | A decisão permanece após F5 | — |
| R9 | RH vê a avaliação aprovada na fila | migration |
| R10 | RH valida o Potencial (`validar_potencial_avaliacao`) | papel `rh` (usuário `60767f3f…`) |
| R11 | Nine-Box classifica | R4–R10 concluídos |
| R12 | Reabrir invalida a decisão anterior | versão/revisão (já implementado) |
| R13 | Auditoria registra cada operação | §4.3 |
| R14 | Outro tenant não acessa | policies por empresa (já implementadas) |
| R15 | Sem permissão → recusa do servidor | `perfil_nao_autorizado` (§4.3) |

**Pré-requisito de DADOS:** não existe hoje nenhuma `feedbacks_360` de gestor
concluída na empresa `66104399-aba8-4105-bbd3-9bf67820c1d0` — o **R4 é o primeiro
passo real** (usa colaboradores já cadastrados; nada de terceiros é tocado).

## 6. O que NÃO muda

- **Layout:** `node scripts/verificar-layout-protegido.mjs` → **OK** (âncoras
  visuais intactas) e e2e protegido 6/6.
- **Mocks:** arquivos de fixture **inalterados**; a flag de modo real só troca a
  origem dos dados dentro do módulo.
- **Dados de terceiros:** a única escrita em `colaboradores` é a linha
  descartável de homologação (CPF sentinela `00000000000`) e, opcionalmente, o
  `supervisor_id` de UM avaliado escolhido por você.

## 7. Autorizações necessárias (uma linha cada)

1. **Aplicar** `20261017090000_ninebox_aprovacao_gestor.sql` no Supabase principal.
2. **Executar o PASSO 1** do vínculo (1 `UPDATE` na linha descartável).
3. *(Opcional)* **PASSO 2** do vínculo (responsabilidade sobre outro avaliado).
4. *(Opcional)* `20261018090000_ninebox_conclusao_gestor.sql`.

Sem (1) e (2) o fluxo real **não tem onde gravar** — e nenhuma prova de backend
é possível; com eles, o roteiro R1–R15 roda pela interface com as duas contas
cadastradas.


