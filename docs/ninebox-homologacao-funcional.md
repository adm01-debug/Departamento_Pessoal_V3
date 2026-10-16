# Nine-Box — Roteiro de homologação funcional (v2 — corrigido)

> **NADA AQUI FOI EXECUTADO.** Roteiro do banco principal, pronto para rodar.
> - ⛔ Não aplicar a migration 2 (`20261016090000`).
> - ⛔ Não alterar layout, mocks, componentes, regras de negócio ou migrations.
> - ✅ Cada bloco é **autocontido**: cria a própria tabela de resultado no MESMO
>   script. **Não** reaproveita tabela temporária de execução anterior.
> - ✅ Sem placeholders manuais: os identificadores abaixo já estão fixos.

**Identificadores confirmados**
- `usuario_rh` = `60767f3f-bb08-4917-9d74-17ce19ef8adb`
- `empresa_id` = `66104399-aba8-4105-bbd3-9bf67820c1d0`
- Marcador de teste = `HOMOLOG-NB` (em `pontos_fortes`, em `idempotency_key` e em `observacao`)

**Dois tipos de bloco — não se confundem**
| Bloco | Onde roda | Papel da sessão | O que prova |
|---|---|---|---|
| **L1 / L2** (lógica) | SQL Editor | dono (bypassa RLS) | Regras de negócio, máquina de estados, idempotência, versão canônica |
| **A** (autorização/RLS) | sessão **autenticada do RH** (`set role authenticated` + claims) | `authenticated` | RLS por empresa, `EXECUTE` das RPCs, papéis |

> O SQL Editor roda como dono e **não** exerce RLS. Por isso os testes de isolamento
> e permissão ficam EXCLUSIVAMENTE no Bloco A, na sessão autenticada.

---

## 0. Contexto (somente leitura)

```sql
-- 0.1 RH, empresa e razão social (a coluna `nome` não existe em `empresas`)
select u.user_id as usuario_rh, ue.empresa_id, ue.is_default, e.razao_social
from public.user_roles u
join public.user_empresas ue on ue.user_id = u.user_id
left join public.empresas e on e.id = ue.empresa_id
where u.user_id = '60767f3f-bb08-4917-9d74-17ce19ef8adb';

-- 0.2 Objetos da migration (tudo precisa ser `true`)
select 'criar_feedback_seguro' as objeto,
       to_regprocedure('public.criar_feedback_seguro(uuid,uuid,uuid,text,numeric,numeric,uuid,text,text,text,text)') is not null as existe
union all select 'finalizar_feedback',
       to_regprocedure('public.finalizar_feedback(uuid,text,text,text)') is not null
union all select 'validar_potencial_avaliacao',
       to_regprocedure('public.validar_potencial_avaliacao(uuid,text,text)') is not null
union all select 'versao_avaliacao_feedback',
       to_regprocedure('public.versao_avaliacao_feedback(uuid)') is not null
union all select 'trigger_revisao',
       exists (select 1 from pg_trigger where tgname = 'trg_feedbacks_360_revisao' and not tgisinternal)
union all select 'view_versao',
       to_regclass('public.vw_feedbacks_360_versao') is not null;
```

---

## 1. Fixtures descartáveis (colaborador + ciclo)

Autocontido. Reaproveita se já existir **e for o nosso** descartável; se o CPF
sentinela pertencer a outro registro, **aborta** (nunca reutiliza dado real).
`ciclos_avaliacao.tipo = '360'` (valor previsto no CHECK).

```sql
drop table if exists pg_temp._nb_fix;
create temporary table _nb_fix (passo int, caso text, esperado text, obtido text, ok boolean);

do $$
declare
  v_empresa uuid := '66104399-aba8-4105-bbd3-9bf67820c1d0';
  v_tag     text := 'HOMOLOG-NB';
  v_exist   uuid;
  v_colab   uuid;
  v_ciclo   uuid;
begin
  -- 1) Colaborador descartável (CPF sentinela de 11 dígitos; nunca é CPF real)
  select id into v_exist from public.colaboradores where cpf = '00000000000';
  if v_exist is not null then
    if exists (select 1 from public.colaboradores
                where id = v_exist and nome_completo like v_tag || '%') then
      v_colab := v_exist;
    else
      raise exception
        'CPF sentinela 00000000000 pertence ao registro % (nao e o descartavel). Abortando para nao tocar dado real.', v_exist;
    end if;
  else
    insert into public.colaboradores
      (empresa_id, nome_completo, cpf, data_nascimento, sexo, nome_mae,
       data_admissao, cargo, departamento, salario_base, email, status)
    values
      (v_empresa, v_tag || ' Colaborador Descartavel', '00000000000', date '1990-01-01',
       'masculino', v_tag || ' Mae Descartavel', current_date,
       v_tag || ' Cargo', v_tag || ' Departamento', 1.00,
       'homolog-nb@example.invalid', 'ativo')
    returning id into v_colab;
  end if;

  -- 2) Ciclo de homologação (tipo '360' respeita o CHECK existente)
  select id into v_ciclo
    from public.ciclos_avaliacao
   where empresa_id = v_empresa and nome like v_tag || '%'
   order by created_at desc limit 1;
  if v_ciclo is null then
    insert into public.ciclos_avaliacao (empresa_id, nome, descricao, data_inicio, data_fim, status, tipo)
    values (v_empresa, v_tag || ' Ciclo Nine-Box', 'Ciclo descartavel de homologacao',
            current_date, current_date + 30, 'ativo', '360')
    returning id into v_ciclo;
  end if;

  insert into pg_temp._nb_fix values
    (0, 'fixtures', 'colaborador e ciclo descartaveis',
     'colaborador=' || v_colab || ' | ciclo=' || v_ciclo, true);
end $$;

select * from pg_temp._nb_fix;
```

---

## 2. Bloco L1 — T1 a T10 (lógica · SQL Editor)

Autocontido. Ao final, a avaliação do **gestor fica `concluido` e validada na versão
v3** — pronta para ser vista na matriz. **Ainda NÃO reabre nem cancela** (isso é o L2).

```sql
drop table if exists pg_temp._nb_l1;
create temporary table _nb_l1 (passo int, caso text, esperado text, obtido text, ok boolean);

do $$
declare
  v_empresa uuid := '66104399-aba8-4105-bbd3-9bf67820c1d0';
  v_rh      uuid := '60767f3f-bb08-4917-9d74-17ce19ef8adb';
  v_tag     text := 'HOMOLOG-NB';
  v_run     text := to_char(now(), 'YYYYMMDDHH24MISS');
  v_colab   uuid;
  v_ciclo   uuid;
  v_g       uuid;
  v_p       uuid;
  v_res     jsonb;
  v_n       int;
  v_ok      boolean;
  v_erro    text;
  v_v1      text;
  v_v2      text;
  v_v3      text;
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_rh::text, 'email', 'homolog-nb@example.invalid',
                      'app_metadata', json_build_object('empresa_id', v_empresa::text))::text, true);

  select id into v_colab from public.colaboradores
   where cpf = '00000000000' and nome_completo like v_tag || '%';
  select id into v_ciclo from public.ciclos_avaliacao
   where empresa_id = v_empresa and nome like v_tag || '%'
   order by created_at desc limit 1;
  if v_colab is null or v_ciclo is null then
    raise exception 'rode a secao 1 (fixtures) antes do L1';
  end if;

  -- T1 · CRIAR (gestor com Potencial + par sem Potencial)
  v_res := public.criar_feedback_seguro(v_empresa, v_colab, v_ciclo, 'gestor', 4.5, 4, v_colab,
             v_tag || ' ' || v_run || ' fortes', v_tag || ' melhoria', v_tag || ' comentarios', v_tag || '-' || v_run || '-criar-g');
  v_g := (v_res ->> 'feedback_id')::uuid;
  insert into pg_temp._nb_l1 values
    (1, 'T1 criar gestor (com Potencial)', 'ok=true, status=pendente', v_res::text,
     (v_res ->> 'ok') = 'true' and (v_res ->> 'status') = 'pendente');

  v_res := public.criar_feedback_seguro(v_empresa, v_colab, v_ciclo, 'par', 4, null, v_colab,
             v_tag || ' ' || v_run || ' par', null, null, v_tag || '-' || v_run || '-criar-p');
  v_p := (v_res ->> 'feedback_id')::uuid;
  insert into pg_temp._nb_l1 values
    (1, 'T1 criar par (sem Potencial)', 'ok=true, status=pendente', v_res::text,
     (v_res ->> 'ok') = 'true' and (v_res ->> 'status') = 'pendente');

  -- T2 · IDEMPOTÊNCIA: MESMA chave + MESMO payload
  v_res := public.criar_feedback_seguro(v_empresa, v_colab, v_ciclo, 'gestor', 4.5, 4, v_colab,
             v_tag || ' ' || v_run || ' fortes', v_tag || ' melhoria', v_tag || ' comentarios', v_tag || '-' || v_run || '-criar-g');
  insert into pg_temp._nb_l1 values
    (2, 'T2 reenvio com a mesma chave', 'idempotente=true, mesmo feedback_id', v_res::text,
     (v_res ->> 'idempotente') = 'true' and (v_res ->> 'feedback_id')::uuid = v_g);

  -- T3 · IDEMPOTÊNCIA: MESMA chave + payload DIFERENTE
  begin
    v_res := public.criar_feedback_seguro(v_empresa, v_colab, v_ciclo, 'gestor', 2, 4, v_colab,
               v_tag || ' ' || v_run || ' outro', null, null, v_tag || '-' || v_run || '-criar-g');
    v_ok := false; v_erro := 'NAO bloqueou';
  exception when others then v_erro := sqlerrm; v_ok := (sqlerrm like '%idempotencia_conflito%');
  end;
  insert into pg_temp._nb_l1 values
    (3, 'T3 mesma chave com payload diferente', 'idempotencia_conflito', v_erro, v_ok);

  -- T4 · CONCLUIR o gestor
  v_res := public.finalizar_feedback(v_g, 'concluir', null, v_tag || '-' || v_run || '-fin-g1');
  v_v1  := public.versao_avaliacao_feedback(v_g);
  insert into pg_temp._nb_l1 values
    (4, 'T4 concluir avaliacao do gestor', 'status_novo=concluido', v_res::text,
     (v_res ->> 'status_novo') = 'concluido');

  -- T5 · VALIDAR POTENCIAL (RH) — só depois de concluir
  v_res := public.validar_potencial_avaliacao(v_g, v_tag || '-' || v_run || '-val-g1', v_tag);
  insert into pg_temp._nb_l1 values
    (5, 'T5 validar Potencial pelo RH (apos concluir)', 'ok=true', v_res::text,
     (v_res ->> 'ok') = 'true');

  -- T6 · MATRIZ: classificável na versão v1
  select count(*) into v_n from public.feedbacks_360 f
   where f.id = v_g and f.status = 'concluido' and f.potencial between 1 and 5
     and exists (select 1 from public.feedbacks_360_validacoes_potencial v
                  where v.feedback_id = v_g and v.versao_avaliacao = public.versao_avaliacao_feedback(v_g));
  insert into pg_temp._nb_l1 values
    (6, 'T6 matriz: classificado na versao validada', 'elegivel=1',
     'v1=' || v_v1 || ' | elegivel=' || v_n, v_n = 1);

  -- T7 · REABRIR invalida a aprovação anterior
  v_res := public.finalizar_feedback(v_g, 'reabrir', v_tag || ' justificativa de reabertura', v_tag || '-' || v_run || '-reabrir-1');
  v_v2  := public.versao_avaliacao_feedback(v_g);
  select count(*) into v_n from public.feedbacks_360_validacoes_potencial
   where feedback_id = v_g and versao_avaliacao = v_v2;
  insert into pg_temp._nb_l1 values
    (7, 'T7 reabrir invalida a aprovacao anterior', 'pendente, versao nova, 0 validacoes na nova versao',
     'status=' || (v_res ->> 'status_novo') || ' | v1<>v2=' || (v_v1 <> v_v2)::text || ' | validacoes_v2=' || v_n,
     (v_res ->> 'status_novo') = 'pendente' and v_v1 <> v_v2 and v_n = 0);

  -- T8 · CONCLUIR novamente
  v_res := public.finalizar_feedback(v_g, 'concluir', null, v_tag || '-' || v_run || '-fin-g2');
  v_v3  := public.versao_avaliacao_feedback(v_g);
  insert into pg_temp._nb_l1 values
    (8, 'T8 concluir novamente', 'concluido, versao nova',
     'status=' || (v_res ->> 'status_novo') || ' | v2<>v3=' || (v_v2 <> v_v3)::text,
     (v_res ->> 'status_novo') = 'concluido' and v_v2 <> v_v3);

  -- T9 · NOVA VALIDAÇÃO do Potencial (versão v3)
  v_res := public.validar_potencial_avaliacao(v_g, v_tag || '-' || v_run || '-val-g2', v_tag);
  select count(*) into v_n from public.feedbacks_360_validacoes_potencial
   where feedback_id = v_g and versao_avaliacao = v_v3;
  insert into pg_temp._nb_l1 values
    (9, 'T9 nova validacao do Potencial (v3)', 'ok=true, 1 validacao na v3',
     'ok=' || (v_res ->> 'ok') || ' | validacoes_v3=' || v_n, (v_res ->> 'ok') = 'true' and v_n = 1);

  -- T10 · MATRIZ novamente classificável (v3) — ESTADO FINAL DO L1
  select count(*) into v_n from public.feedbacks_360 f
   where f.id = v_g and f.status = 'concluido' and f.potencial between 1 and 5
     and exists (select 1 from public.feedbacks_360_validacoes_potencial v
                  where v.feedback_id = v_g and v.versao_avaliacao = public.versao_avaliacao_feedback(v_g));
  insert into pg_temp._nb_l1 values
    (10, 'T10 matriz novamente classificado (v3)', 'elegivel=1',
     'gestor_feedback=' || v_g || ' | elegivel=' || v_n, v_n = 1);
end $$;

select passo, caso, esperado, ok, obtido from pg_temp._nb_l1 order by passo, caso;
```

Ao final do L1: **o feedback do gestor está `concluido` e validado na versão v3.**
Todas as linhas devem sair com `ok = true`.

---

## 3. PAUSA — visualizar na matriz (antes de reabrir/cancelar)

Com o modo real ligado localmente (§8) e logado como o RH:

1. Aba **Nine-Box** → selecione o ciclo **`HOMOLOG-NB …`** → o colaborador
   `HOMOLOG-NB … Colaborador Descartavel` deve aparecer **classificado**.
2. Aba **Feedbacks** → confira o gestor em **Concluída** (com selo de Potencial
   validado) e o par em **Pendente**.
3. Aba **Auditoria** → 1 linha por operação.

**Só depois de confirmar a classificação, execute o Bloco L2.**


---

## 4. Bloco L2 — T11 (lógica · SQL Editor)

Autocontido. Reabre **e depois** cancela o feedback do gestor do L1 (que estava
`concluido`), conclui o `par` (sem Potencial) e prova que `gestor` sem Potencial é
bloqueado.

```sql
drop table if exists pg_temp._nb_l2;
create temporary table _nb_l2 (passo int, caso text, esperado text, obtido text, ok boolean);

do $$
declare
  v_empresa uuid := '66104399-aba8-4105-bbd3-9bf67820c1d0';
  v_rh      uuid := '60767f3f-bb08-4917-9d74-17ce19ef8adb';
  v_tag     text := 'HOMOLOG-NB';
  v_run     text := to_char(now(), 'YYYYMMDDHH24MISS');
  v_colab   uuid;
  v_ciclo   uuid;
  v_g       uuid;
  v_p       uuid;
  v_gp      uuid;
  v_res     jsonb;
  v_ok      boolean;
  v_erro    text;
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_rh::text, 'email', 'homolog-nb@example.invalid',
                      'app_metadata', json_build_object('empresa_id', v_empresa::text))::text, true);

  select id into v_colab from public.colaboradores
   where cpf = '00000000000' and nome_completo like v_tag || '%';
  select id into v_ciclo from public.ciclos_avaliacao
   where empresa_id = v_empresa and nome like v_tag || '%'
   order by created_at desc limit 1;

  -- gestor CONCLUÍDO deixado pelo L1 (o mais recente do teste)
  select id into v_g from public.feedbacks_360
   where avaliado_id = v_colab and tipo = 'gestor' and status = 'concluido'
     and pontos_fortes like v_tag || '%'
   order by created_at desc limit 1;
  if v_g is null then
    raise exception 'nenhuma avaliacao de gestor HOMOLOG concluida — rode o L1 (T1..T10) antes';
  end if;

  -- T11a · REABRIR ANTES DE CANCELAR
  v_res := public.finalizar_feedback(v_g, 'reabrir', v_tag || ' justificativa antes de cancelar', v_tag || '-' || v_run || '-l2-r1');
  insert into pg_temp._nb_l2 values
    (11, 'T11a reabrir antes de cancelar', 'status_novo=pendente', v_res::text,
     (v_res ->> 'status_novo') = 'pendente');

  -- T11b · CANCELAR (só possível após reabrir)
  v_res := public.finalizar_feedback(v_g, 'cancelar', v_tag || ' cancelamento de teste', v_tag || '-' || v_run || '-l2-c1');
  insert into pg_temp._nb_l2 values
    (11, 'T11b cancelar (apos reabrir)', 'status_novo=cancelado', v_res::text,
     (v_res ->> 'status_novo') = 'cancelado');

  -- T11c · par (sem Potencial) CONCLUI — regra por categoria
  select id into v_p from public.feedbacks_360
   where avaliado_id = v_colab and tipo = 'par' and status = 'pendente'
     and pontos_fortes like v_tag || '%'
   order by created_at desc limit 1;
  v_res := public.finalizar_feedback(v_p, 'concluir', null, v_tag || '-' || v_run || '-l2-p1');
  insert into pg_temp._nb_l2 values
    (11, 'T11c par sem Potencial conclui', 'status_novo=concluido', v_res::text,
     (v_res ->> 'status_novo') = 'concluido');

  -- T11d · gestor SEM Potencial é BLOQUEADO
  v_res := public.criar_feedback_seguro(v_empresa, v_colab, v_ciclo, 'gestor', 4, null, v_colab,
             v_tag || ' ' || v_run || ' sem potencial', null, null, v_tag || '-' || v_run || '-l2-gp');
  v_gp := (v_res ->> 'feedback_id')::uuid;
  begin
    perform public.finalizar_feedback(v_gp, 'concluir', null, v_tag || '-' || v_run || '-l2-gp-fin');
    v_ok := false; v_erro := 'NAO bloqueou';
  exception when others then v_erro := sqlerrm; v_ok := (sqlerrm like '%potencial_obrigatorio_para_gestor%');
  end;
  insert into pg_temp._nb_l2 values
    (11, 'T11d gestor sem Potencial e bloqueado', 'potencial_obrigatorio_para_gestor', v_erro, v_ok);
end $$;

select passo, caso, esperado, ok, obtido from pg_temp._nb_l2 order by passo, caso;
```


---

## 5. Bloco A — AUTORIZAÇÃO / RLS (sessão autenticada do RH)

**Diferente dos blocos L1/L2.** Rode este bloco com a sessão **`authenticated`** (como
a conta RH acessa o app). O `set local role authenticated` + `request.jwt.claims`
(inclusive `app_metadata.empresa_id`, que é o que a RLS lê) reproduzem a sessão real.
Tudo termina em **`rollback`** — nada persiste.

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"60767f3f-bb08-4917-9d74-17ce19ef8adb","email":"homolog-nb@example.invalid","app_metadata":{"empresa_id":"66104399-aba8-4105-bbd3-9bf67820c1d0"}}',
  true);

-- A1 · RLS: enxerga a própria empresa
select 'A1 feedbacks da propria empresa' as caso, count(*)::text as obtido, '>= 1' as esperado,
       count(*) >= 1 as ok
from public.feedbacks_360
where empresa_id = '66104399-aba8-4105-bbd3-9bf67820c1d0';

-- A2 · RLS: NÃO enxerga outra empresa
select 'A2 feedbacks de OUTRA empresa' as caso, count(*)::text as obtido, '0' as esperado,
       count(*) = 0 as ok
from public.feedbacks_360
where empresa_id is distinct from '66104399-aba8-4105-bbd3-9bf67820c1d0';

-- A3 · RLS: NÃO enxerga ciclo de outra empresa
select 'A3 ciclos de OUTRA empresa' as caso, count(*)::text as obtido, '0' as esperado,
       count(*) = 0 as ok
from public.ciclos_avaliacao
where empresa_id is distinct from '66104399-aba8-4105-bbd3-9bf67820c1d0';

-- A4/A5 · Papéis (helpers SECURITY DEFINER concedidos a authenticated)
select 'A4 pode_gerir_avaliacoes (RH)' as caso, public.pode_gerir_avaliacoes()::text as obtido,
       'true' as esperado, public.pode_gerir_avaliacoes() as ok;
select 'A5 pode_validar_potencial (RH)' as caso, public.pode_validar_potencial()::text as obtido,
       'true' as esperado, public.pode_validar_potencial() as ok;

-- A6 · EXECUTE da RPC de escrita na sessão autenticada (descartado no rollback)
with ctx as (
  select (select id from public.colaboradores
           where cpf = '00000000000' and nome_completo like 'HOMOLOG-NB%') as colab,
         (select id from public.ciclos_avaliacao
           where empresa_id = '66104399-aba8-4105-bbd3-9bf67820c1d0' and nome like 'HOMOLOG-NB%'
           order by created_at desc limit 1) as ciclo
), r as (
  select public.criar_feedback_seguro(
           '66104399-aba8-4105-bbd3-9bf67820c1d0', ctx.colab, ctx.ciclo, 'par', 4, null, ctx.colab,
           'HOMOLOG-NB A6', null, null, 'HOMOLOG-NB-A6-' || to_char(now(), 'YYYYMMDDHH24MISS')) as j
  from ctx
)
select 'A6 criar par via RPC (sessao autenticada)' as caso, (j ->> 'ok') as obtido,
       'true' as esperado, (j ->> 'ok') = 'true' as ok
from r;

rollback;
```

Esperado: **A1..A6 todos `ok = true`** (e nada gravado, pelo `rollback`).

---

## 6. Admin SEM papel RH (manual)

Não há `admin` nos identificadores confirmados, então este caso é **na interface**:

1. Logar no app com uma conta **`admin` que NÃO tenha `rh`**.
2. Abrir o mesmo feedback `HOMOLOG-NB …` → o botão **Validar Potencial não deve aparecer**
   (o front só o oferece a quem tem `rh`).
3. No servidor, a recusa é garantida por `pode_validar_potencial()` (`role = 'rh'`):
   uma chamada de `validar_potencial_avaliacao` com essa sessão retorna
   `perfil_nao_autorizado`.


---

## 7. Inventário e limpeza

### 7.1 Inventário do que foi criado (somente leitura)

Os filtros usam o **formato real** das chaves de idempotência produzidas pelas RPCs
(`criar:<empresa>:<chave>`, `concluir|cancelar|reabrir:<feedback_id>:<chave>`,
`validar_potencial:<feedback_id>:<chave>`) — por isso a chave do teste é procurada
**no meio da string** (`like '%HOMOLOG-NB%'`), nunca no início.

```sql
select 'feedbacks_360' as tabela, count(*) as linhas
  from public.feedbacks_360 where pontos_fortes like 'HOMOLOG-NB%'
union all select 'feedbacks_360_operacoes', count(*)
  from public.feedbacks_360_operacoes where idempotency_key like '%HOMOLOG-NB%'
union all select 'feedbacks_360_validacoes_potencial', count(*)
  from public.feedbacks_360_validacoes_potencial
 where feedback_id in (select id from public.feedbacks_360 where pontos_fortes like 'HOMOLOG-NB%')
union all select 'colaboradores', count(*)
  from public.colaboradores where cpf = '00000000000' and nome_completo like 'HOMOLOG-NB%'
union all select 'ciclos_avaliacao', count(*)
  from public.ciclos_avaliacao where nome like 'HOMOLOG-NB%';
```

### 7.2 Limpeza (opcional — **padrão é preservar**)

Recomendado não apagar: os registros `HOMOLOG-NB*` são a prova do teste. Se precisar
remover, use o bloco abaixo **como dono**, na ordem das FKs `ON DELETE RESTRICT`
(filho antes do pai). `audit_log` **não** é tocado. O CPF sentinela só é excluído se
for mesmo o descartável.

```sql
do $$
declare
  v_tag   text := 'HOMOLOG-NB';
  v_colab uuid;
  v_ciclo uuid;
begin
  select id into v_colab from public.colaboradores
   where cpf = '00000000000' and nome_completo like v_tag || '%';
  select id into v_ciclo from public.ciclos_avaliacao
   where nome like v_tag || '%' order by created_at desc limit 1;

  delete from public.feedbacks_360_validacoes_potencial
   where feedback_id in (select id from public.feedbacks_360 where pontos_fortes like v_tag || '%');

  delete from public.feedbacks_360_operacoes
   where idempotency_key like '%' || v_tag || '%';

  delete from public.feedbacks_360 where pontos_fortes like v_tag || '%';

  if v_ciclo is not null then
    delete from public.ciclos_avaliacao where id = v_ciclo;
  end if;
  if v_colab is not null then
    delete from public.colaboradores where id = v_colab;
  end if;

  raise notice 'limpeza % concluida (audit_log preservado)', v_tag;
end $$;
```

Depois, repita a consulta 7.1: **todas as linhas devem vir 0** (exceto o que você
decidiu preservar).

---

## 8. Ligar/desligar o modo real local (não vai para produção)

- **Ligado** (já feito em `.env.local`, git-ignored): `VITE_NINEBOX_MODO_REAL=true` e
  `VITE_DESEMPENHO_MOCK=false`. Reiniciar o `vite dev`. Em produção a variável não
  existe → modo real desligado para todos (`nineBoxModo.ts`, gated em `DEV`).
- **Desligar:** `VITE_NINEBOX_MODO_REAL=false` + `VITE_DESEMPENHO_MOCK=true` e reiniciar.

---

## 9. Checklist

1. [ ] Seção 0 — contexto (RH/empresa/razão social + objetos `true`).
2. [ ] Seção 1 — fixtures (`tipo='360'`; CPF sentinela verificado).
3. [ ] Seção 2 (L1 · T1–T10) — todas `ok = true`; gestor **concluído + validado (v3)**.
4. [ ] Seção 3 — **visualizar o colaborador classificado na Nine-Box** (antes de cancelar).
5. [ ] Seção 4 (L2 · T11) — reabrir → cancelar; par conclui; gestor sem Potencial bloqueado.
6. [ ] Seção 5 (Bloco A) — autorização/RLS na sessão autenticada do RH.
7. [ ] Seção 6 — admin sem RH não valida Potencial.
8. [ ] Seção 7 — inventário; decidir limpeza (**padrão: preservar**; `audit_log` intacto).
9. [ ] ⛔ Não aplicar a migration 2 e não tocar dados reais.

