-- Provisao mensal passa a GRAVAR a aliquota de encargos que foi aplicada.
--
-- O DEFEITO QUE ISTO FECHA
-- A PR #576 fez a provisao seguir o regime tributario da empresa
-- (`empresas.regime_tributario` / `simples_anexo`). Com isso, recalcular uma
-- competencia ANTIGA passaria a usar o regime de HOJE: se a empresa mudar de
-- regime, ou se o anexo do Simples for corrigido no cadastro, o recalculo
-- reescreveria o passivo de meses fechados com uma aliquota que nao era a
-- vigente naquele mes. Dinheiro de competencia encerrada nao pode mudar por
-- efeito colateral de uma edicao de cadastro.
--
-- A SOLUCAO: a linha de provisao guarda a aliquota aplicada (em bps) e o
-- retrato do regime que a originou. O recalculo de uma competencia que JA tem
-- linhas reaproveita a aliquota gravada em vez de reconsultar o cadastro
-- (supabase/functions/calcular-provisoes/index.ts). Nenhuma tabela nova,
-- nenhum registro de vigencia: o proprio lancamento e a prova do que foi usado.
--
-- `provisoes_mensais` tem 0 linhas no canonico hoje (medido antes desta
-- migration), entao nao ha historico para preencher e a coluna pode nascer
-- obrigatoria no contrato da RPC.

alter table public.provisoes_mensais
  add column if not exists encargos_aliquota_bps integer,
  add column if not exists regime_tributario public.regime_tributario,
  add column if not exists simples_anexo text;

comment on column public.provisoes_mensais.encargos_aliquota_bps is
  'Aliquota de encargos patronais aplicada a ESTA linha, em bps (358 = 35,8%). Gravada pelo calculo; o recalculo da mesma competencia a reaproveita.';
comment on column public.provisoes_mensais.regime_tributario is
  'Retrato do regime tributario da empresa no momento do calculo desta linha.';
comment on column public.provisoes_mensais.simples_anexo is
  'Retrato do anexo do Simples no momento do calculo desta linha; nulo fora do Simples ou quando o cadastro nao informa.';

-- Faixa possivel: 0 (Simples com CPP e Terceiros dentro do DAS) a 1000 (100%).
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.provisoes_mensais'::regclass
       and conname = 'provisoes_mensais_encargos_aliquota_bps_faixa'
  ) then
    alter table public.provisoes_mensais
      add constraint provisoes_mensais_encargos_aliquota_bps_faixa
      check (encargos_aliquota_bps is null
             or (encargos_aliquota_bps >= 0 and encargos_aliquota_bps <= 1000));
  end if;
end $$;

-- A RPC transacional passa a exigir e persistir os 3 campos. Mantem
-- SECURITY DEFINER, o mesmo search_path e os mesmos grants (CREATE OR REPLACE
-- preserva a ACL: hoje EXECUTE so de postgres, service_role e dp_mcp_role).
create or replace function public.replace_monthly_provisions(
  p_empresa_id uuid,
  p_competencia text,
  p_rows jsonb,
  p_user_id uuid,
  p_audit_data jsonb
)
returns integer
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'pg_temp'
as $function$
DECLARE
  inserted_count integer;
  competence_date date;
BEGIN
  IF p_empresa_id IS NULL OR p_user_id IS NULL
     OR p_competencia !~ '^\d{4}-(0[1-9]|1[0-2])$'
     OR jsonb_typeof(p_rows) <> 'array'
     OR jsonb_array_length(p_rows) > 20000
     OR jsonb_typeof(p_audit_data) <> 'object' THEN
    RAISE EXCEPTION 'invalid monthly provision replacement arguments';
  END IF;
  competence_date := to_date(p_competencia || '-01', 'YYYY-MM-DD');

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_rows) AS row_data(item)
    WHERE jsonb_typeof(item) <> 'object'
       OR COALESCE(item->>'colaborador_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       OR item->>'tipo' NOT IN ('ferias', '13_salario')
       OR jsonb_typeof(item->'valor_principal') <> 'number'
       OR jsonb_typeof(item->'encargos_inss') <> 'number'
       OR jsonb_typeof(item->'encargos_fgts') <> 'number'
       OR (item->>'valor_principal')::numeric < 0
       OR (item->>'encargos_inss')::numeric < 0
       OR (item->>'encargos_fgts')::numeric < 0
  ) THEN
    RAISE EXCEPTION 'invalid monthly provision row';
  END IF;

  -- A aliquota aplicada e OBRIGATORIA e fail-closed: sem ela a linha nao
  -- entra, para que nenhum lancamento novo nasca sem a prova de qual
  -- aliquota o originou. O regime e o anexo sao o retrato do cadastro no
  -- momento do calculo e podem ser nulos (empresa fora do Simples, ou anexo
  -- nao informado).
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_rows) AS row_data(item)
    WHERE jsonb_typeof(item->'encargos_aliquota_bps') <> 'number'
       OR (item->>'encargos_aliquota_bps')::numeric <> trunc((item->>'encargos_aliquota_bps')::numeric)
       OR (item->>'encargos_aliquota_bps')::numeric < 0
       OR (item->>'encargos_aliquota_bps')::numeric > 1000
       OR (item->>'regime_tributario' IS NOT NULL
           AND item->>'regime_tributario' NOT IN ('simples_nacional','lucro_presumido','lucro_real','mei'))
       OR (item ? 'simples_anexo'
           AND jsonb_typeof(item->'simples_anexo') NOT IN ('string','null'))
  ) THEN
    RAISE EXCEPTION 'invalid monthly provision tax contract';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_rows) AS row_data(item)
    LEFT JOIN public.colaboradores AS c
      ON c.id = (item->>'colaborador_id')::uuid
     AND c.empresa_id = p_empresa_id
    WHERE c.id IS NULL
  ) THEN
    RAISE EXCEPTION 'monthly provision collaborator is outside the company';
  END IF;

  -- Serialize recalculations for the same tenant/month. If any row or the
  -- mandatory audit insert fails, PostgreSQL rolls back the deletion too.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_empresa_id::text || ':' || p_competencia, 0));

  DELETE FROM public.provisoes_mensais
  WHERE empresa_id = p_empresa_id AND competencia = competence_date;

  INSERT INTO public.provisoes_mensais (
    empresa_id, colaborador_id, competencia, tipo,
    valor_principal, encargos_inss, encargos_fgts,
    encargos_aliquota_bps, regime_tributario, simples_anexo
  )
  SELECT
    p_empresa_id,
    (item->>'colaborador_id')::uuid,
    competence_date,
    item->>'tipo',
    (item->>'valor_principal')::numeric,
    (item->>'encargos_inss')::numeric,
    (item->>'encargos_fgts')::numeric,
    (item->>'encargos_aliquota_bps')::integer,
    (item->>'regime_tributario')::public.regime_tributario,
    item->>'simples_anexo'
  FROM jsonb_array_elements(p_rows) AS item;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  IF inserted_count <> jsonb_array_length(p_rows) THEN
    RAISE EXCEPTION 'monthly provision replacement row count mismatch';
  END IF;

  INSERT INTO public.audit_log (
    tabela, registro_id, acao, user_id, dados_novos
  ) VALUES (
    'provisoes_mensais', gen_random_uuid(), 'PROVISOES_CALC', p_user_id,
    COALESCE(p_audit_data, '{}'::jsonb) || jsonb_build_object('empresa_id', p_empresa_id, 'evento', 'CALCULATE_BATCH')
  );

  RETURN inserted_count;
END
$function$;

-- Pos-condicao fail-closed: as 3 colunas existem, o CHECK esta validado e a
-- RPC segue SECURITY DEFINER com search_path fixo e sem EXECUTE para anon ou
-- authenticated.
do $$
declare
  v_cols integer;
begin
  select count(*) into v_cols
    from pg_attribute
   where attrelid = 'public.provisoes_mensais'::regclass
     and attnum > 0 and not attisdropped
     and attname in ('encargos_aliquota_bps','regime_tributario','simples_anexo');
  if v_cols <> 3 then
    raise exception 'provisoes_mensais ficou com % das 3 colunas de aliquota', v_cols;
  end if;

  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.provisoes_mensais'::regclass
       and conname = 'provisoes_mensais_encargos_aliquota_bps_faixa'
       and convalidated
  ) then
    raise exception 'CHECK da faixa de encargos_aliquota_bps ausente ou nao validado';
  end if;

  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = 'replace_monthly_provisions'
       and p.prosecdef
       and array_to_string(p.proconfig, ',') like '%search_path%'
       and not has_function_privilege('anon', p.oid, 'EXECUTE')
       and not has_function_privilege('authenticated', p.oid, 'EXECUTE')
       and has_function_privilege('service_role', p.oid, 'EXECUTE')
  ) then
    raise exception 'replace_monthly_provisions perdeu security definer, search_path ou os grants';
  end if;
end $$;
