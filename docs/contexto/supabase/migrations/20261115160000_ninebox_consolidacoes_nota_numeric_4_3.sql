-- ============================================================================
-- NINE-BOX · NOTAS DA CONSOLIDAÇÃO COMO numeric(4,3)
-- ----------------------------------------------------------------------------
-- CAUSA
-- supabase/migrations/20261021090000_ninebox_aprovacao_confirmada.sql:21-24
-- declara desempenho_proposto, potencial_proposto, desempenho_aprovado e
-- potencial_aprovado como numeric(4,3) usando `add column if not exists`. As 4
-- colunas JÁ existem no canônico como `numeric` sem typmod
-- (pg_attribute.atttypmod = -1, lido ao vivo em 15/11/2026) e
-- `add column if not exists` pula coluna existente sem tocar no tipo — o
-- numeric(4,3) declarado nunca é aplicado.
--
-- EFEITO
-- O sidecar 20261021090000_ninebox_aprovacao_confirmada.verify.sql:22-28 exige
-- format_type = 'numeric(4,3)' nas 4 colunas e devolve 'FALHOU'. O step
-- "Verificar sidecars das migrações" de
-- .github/workflows/canonical-migrations.yml:239-263 (só em mode=apply) faz
-- exit 1 em qualquer linha diferente de 'ok'. Esse step roda DEPOIS do COMMIT
-- do lote (mesmo arquivo, linhas 222-237): sem esta correção o deploy reprova
-- com o DDL do lote já gravado em produção.
--
-- POR QUE O TIMESTAMP É POSTERIOR À 20261021090000
-- O lote todo é aplicado numa única transação (canonical-migrations.yml:222-237)
-- e os sidecars só rodam depois dela (:239-263). Basta o tipo estar correto no
-- fim do lote — não é preciso rodar antes da 20261021090000, que é de outro
-- agente e já está na main (não foi editada aqui).
--
-- SEM PERDA DE DADO (lido ao vivo, 4 linhas em feedbacks_360_consolidacoes):
-- desempenho_aprovado tem 4.0000000000000000, 4.0000000000000000 e
-- 4.5000000000000000 (scale 16); round(...,3) devolve 4.000, 4.000 e 4.500 —
-- nenhum número muda. As outras 3 colunas têm scale 0 e nenhum valor chega a
-- 10 (precisão 4 / escala 3 comporta até 9.999). O preflight abaixo é
-- fail-closed: se em algum ambiente o dado não couber, a migration aborta em
-- vez de truncar calada.
--
-- Idempotente: reaplicar o mesmo ALTER TYPE sobre numeric(4,3) é no-op lógico.
-- ============================================================================

-- ── §0 · Preflight fail-closed ─────────────────────────────────────────────
do $preflight$
declare
  v_col    text;
  v_existe int;
  v_ruins  bigint;
begin
  foreach v_col in array array[
    'desempenho_proposto',
    'potencial_proposto',
    'desempenho_aprovado',
    'potencial_aprovado'
  ]
  loop
    select count(*) into v_existe
      from pg_attribute a
     where a.attrelid = 'public.feedbacks_360_consolidacoes'::regclass
       and a.attname = v_col
       and a.attnum > 0
       and not a.attisdropped;

    if v_existe = 0 then
      raise exception
        'coluna public.feedbacks_360_consolidacoes.% não existe -- alvo errado ou 20261021090000 não rodou antes desta migration', v_col;
    end if;

    execute format(
      'select count(*) from public.feedbacks_360_consolidacoes'
      || ' where %1$I is not null and (round(%1$I, 3) <> %1$I or abs(%1$I) >= 10)',
      v_col
    ) into v_ruins;

    if v_ruins > 0 then
      raise exception
        'converter public.feedbacks_360_consolidacoes.% para numeric(4,3) perderia dado em % linha(s) -- revisar antes de aplicar', v_col, v_ruins;
    end if;
  end loop;
end
$preflight$;

-- ── §1 · Aplica o tipo que a 20261021090000 declarou e não aplicou ─────────
alter table public.feedbacks_360_consolidacoes
  alter column desempenho_proposto type numeric(4,3),
  alter column potencial_proposto  type numeric(4,3),
  alter column desempenho_aprovado type numeric(4,3),
  alter column potencial_aprovado  type numeric(4,3);

-- ── §2 · Confirma o estado final (não reporta sucesso sem ele) ─────────────
do $posfixo$
declare
  v_ok int;
begin
  select count(*) into v_ok
    from pg_attribute a
   where a.attrelid = 'public.feedbacks_360_consolidacoes'::regclass
     and a.attnum > 0
     and not a.attisdropped
     and a.attname in ('desempenho_proposto','potencial_proposto',
                       'desempenho_aprovado','potencial_aprovado')
     and format_type(a.atttypid, a.atttypmod) = 'numeric(4,3)';

  if v_ok <> 4 then
    raise exception
      'apenas %/4 notas de public.feedbacks_360_consolidacoes ficaram numeric(4,3) -- investigar antes de considerar esta migration aplicada', v_ok;
  end if;
end
$posfixo$;
