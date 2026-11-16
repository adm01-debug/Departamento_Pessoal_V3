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

-- A coluna nasce NOT NULL: provisoes_mensais tem 0 linhas no canonico, entao o
-- ALTER e instantaneo e nao ha historico para preencher. Esta e a garantia no
-- nivel do BANCO de que nenhum lancamento nasce sem a prova da aliquota --
-- mais forte do que qualquer validacao na RPC, que uma chamada futura poderia
-- contornar.
do $$
begin
  if exists (
    select 1 from pg_attribute
     where attrelid = 'public.provisoes_mensais'::regclass
       and attname = 'encargos_aliquota_bps' and not attnotnull
  ) then
    if exists (select 1 from public.provisoes_mensais where encargos_aliquota_bps is null) then
      raise exception 'ha linha em provisoes_mensais sem encargos_aliquota_bps: preencha antes de exigir NOT NULL';
    end if;
    alter table public.provisoes_mensais alter column encargos_aliquota_bps set not null;
  end if;
end $$;

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
  v_bps_recebido integer;
  v_bps_vigente integer;
  v_aliquotas integer;
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
    -- IS DISTINCT FROM, nao <>: com a chave AUSENTE, item->'...' e SQL NULL,
    -- jsonb_typeof(NULL) e NULL, e NULL <> 'number' tambem e NULL -- o WHERE
    -- nao pegava a linha e a RPC gravava provisao sem aliquota. Achado da
    -- revisao desta PR.
    WHERE jsonb_typeof(item->'encargos_aliquota_bps') IS DISTINCT FROM 'number'
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

  -- O lote e de UMA competencia e por isso tem UMA aliquota: se vierem
  -- valores diferentes na mesma chamada, o lote esta incoerente.
  -- Mas lote VAZIO e legitimo e nao pode virar erro (achado da revisao desta
  -- PR): quando todo salario elegivel e zero, a edge descarta as linhas
  -- (index.ts pula salarioCents <= 0) e chama a RPC com [].
  -- O contrato historico desta funcao e substituicao: com [], o DELETE zera a
  -- competencia e a auditoria e gravada. Exigir exatamente 1 aliquota
  -- devolveria 500 e, pior, deixaria o passivo antigo de pe.
  SELECT count(DISTINCT (item->>'encargos_aliquota_bps')::integer),
         min((item->>'encargos_aliquota_bps')::integer)
    INTO STRICT v_aliquotas, v_bps_recebido
    FROM jsonb_array_elements(p_rows) AS item;
  IF v_aliquotas > 1 THEN
    RAISE EXCEPTION 'monthly provision batch carries % distinct tax rates', v_aliquotas;
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

  -- REVALIDACAO DEPOIS DO LOCK (achado da revisao desta PR): a edge escolhe a
  -- aliquota numa consulta HTTP ANTERIOR, fora desta transacao. Dois calculos
  -- concorrentes podiam ambos ver a competencia vazia, escolher do cadastro e
  -- o segundo sobrescrever o passivo do primeiro com outra aliquota. Aqui,
  -- JA sob o lock, se a competencia tem aliquota gravada e ela diverge da
  -- recebida, a gravacao e RECUSADA -- nao basta trocar a aliquota da linha,
  -- porque os valores de encargo que vieram foram calculados com a outra.
  -- ERRCODE 40001 diz "refaca": a edge recalcula e, na segunda passada, le a
  -- aliquota ja gravada e converge.
  SELECT pm.encargos_aliquota_bps INTO v_bps_vigente
    FROM public.provisoes_mensais pm
   WHERE pm.empresa_id = p_empresa_id
     AND pm.competencia = competence_date
   LIMIT 1;
  -- v_bps_recebido e NULL quando o lote e vazio: nesse caso nao ha aliquota
  -- nova para conflitar com a gravada, e a substituicao vazia segue valendo.
  IF v_bps_vigente IS NOT NULL AND v_bps_recebido IS NOT NULL
     AND v_bps_vigente <> v_bps_recebido THEN
    RAISE EXCEPTION 'monthly provision tax rate changed under lock: stored % bps, received % bps', v_bps_vigente, v_bps_recebido
      USING ERRCODE = '40001';
  END IF;

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
