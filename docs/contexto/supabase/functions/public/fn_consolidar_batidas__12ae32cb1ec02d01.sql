CREATE OR REPLACE FUNCTION public.fn_consolidar_batidas()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_batidas INTEGER;
  v_entrada_1 TEXT; v_saida_1 TEXT;
  v_entrada_2 TEXT; v_saida_2 TEXT;
  v_entrada_3 TEXT; v_saida_3 TEXT;
  v_entrada_4 TEXT; v_saida_4 TEXT;
  v_entrada_5 TEXT; v_saida_5 TEXT;
  v_entrada_6 TEXT; v_saida_6 TEXT;
BEGIN
  SELECT COUNT(*) INTO v_total_batidas
  FROM public.batidas_ponto
  WHERE colaborador_id = NEW.colaborador_id AND data = NEW.data;

  SELECT
    MAX(CASE WHEN ordem = 1  AND tipo = 'entrada' THEN hora::text END),
    MAX(CASE WHEN ordem = 2  AND tipo = 'saida'   THEN hora::text END),
    MAX(CASE WHEN ordem = 3  AND tipo = 'entrada' THEN hora::text END),
    MAX(CASE WHEN ordem = 4  AND tipo = 'saida'   THEN hora::text END),
    MAX(CASE WHEN ordem = 5  AND tipo = 'entrada' THEN hora::text END),
    MAX(CASE WHEN ordem = 6  AND tipo = 'saida'   THEN hora::text END),
    MAX(CASE WHEN ordem = 7  AND tipo = 'entrada' THEN hora::text END),
    MAX(CASE WHEN ordem = 8  AND tipo = 'saida'   THEN hora::text END),
    MAX(CASE WHEN ordem = 9  AND tipo = 'entrada' THEN hora::text END),
    MAX(CASE WHEN ordem = 10 AND tipo = 'saida'   THEN hora::text END),
    MAX(CASE WHEN ordem = 11 AND tipo = 'entrada' THEN hora::text END),
    MAX(CASE WHEN ordem = 12 AND tipo = 'saida'   THEN hora::text END)
  INTO v_entrada_1, v_saida_1, v_entrada_2, v_saida_2, v_entrada_3, v_saida_3,
       v_entrada_4, v_saida_4, v_entrada_5, v_saida_5, v_entrada_6, v_saida_6
  FROM public.batidas_ponto
  WHERE colaborador_id = NEW.colaborador_id AND data = NEW.data;

  INSERT INTO public.registros_ponto (
    colaborador_id, empresa_id, data,
    entrada_1, saida_1, entrada_2, saida_2, entrada_3, saida_3,
    entrada_4, saida_4, entrada_5, saida_5, entrada_6, saida_6,
    saida_intervalo, retorno_intervalo, total_batidas
  ) VALUES (
    NEW.colaborador_id, NEW.empresa_id, NEW.data,
    v_entrada_1::time, v_saida_1::time, v_entrada_2::time, v_saida_2::time,
    v_entrada_3::time, v_saida_3::time, v_entrada_4::time, v_saida_4::time,
    v_entrada_5::time, v_saida_5::time, v_entrada_6::time, v_saida_6::time,
    v_saida_1::time, v_entrada_2::time, v_total_batidas
  )
  ON CONFLICT (colaborador_id, data)
  DO UPDATE SET
    entrada_1 = EXCLUDED.entrada_1, saida_1 = EXCLUDED.saida_1,
    entrada_2 = EXCLUDED.entrada_2, saida_2 = EXCLUDED.saida_2,
    entrada_3 = EXCLUDED.entrada_3, saida_3 = EXCLUDED.saida_3,
    entrada_4 = EXCLUDED.entrada_4, saida_4 = EXCLUDED.saida_4,
    entrada_5 = EXCLUDED.entrada_5, saida_5 = EXCLUDED.saida_5,
    entrada_6 = EXCLUDED.entrada_6, saida_6 = EXCLUDED.saida_6,
    saida_intervalo = EXCLUDED.saida_intervalo,
    retorno_intervalo = EXCLUDED.retorno_intervalo,
    total_batidas = EXCLUDED.total_batidas,
    updated_at = now();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- A consolidação é um resumo derivado. Uma falha aqui NUNCA pode impedir o
  -- registro da batida, que é o documento com valor legal (Portaria 671).
  INSERT INTO public.logs_sistema (nivel, mensagem, contexto)
  VALUES ('error',
          'Falha ao consolidar espelho do dia; batida preservada',
          jsonb_build_object(
            'origem', 'fn_consolidar_batidas',
            'colaborador_id', NEW.colaborador_id,
            'data', NEW.data,
            'erro', SQLERRM,
            'sqlstate', SQLSTATE));
  RETURN NEW;
END;
$function$
