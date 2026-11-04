CREATE OR REPLACE FUNCTION public.drenar_fila_limpeza_lgpd(p_limite integer DEFAULT 200)
 RETURNS TABLE(id uuid, tabela text, registro_id uuid, sucesso boolean, erro text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  item record;
BEGIN
  FOR item IN
    SELECT f.id, f.tabela, f.registro_id, f.dry_run
      FROM public.lgpd_fila_limpeza f
     WHERE f.executado = false
       AND f.data_programada <= current_date
     ORDER BY f.data_programada
     LIMIT GREATEST(COALESCE(p_limite, 200), 1)
     FOR UPDATE SKIP LOCKED
  LOOP
    id          := item.id;
    tabela      := item.tabela;
    registro_id := item.registro_id;
    erro        := NULL;

    BEGIN
      IF item.dry_run THEN
        -- Simulação registrada uma única vez e marcada executada: sem isso
        -- os itens dry_run voltavam a ser selecionados em todo run e
        -- famintavam os itens reais da fila.
        UPDATE public.lgpd_fila_limpeza
           SET executado = true, processed_at = now()
         WHERE lgpd_fila_limpeza.id = item.id;
        sucesso := true;
        RETURN NEXT;
        CONTINUE;
      END IF;

      IF item.tabela = 'colaboradores' THEN
        PERFORM public.anonimizar_dados_pessoais(item.registro_id);
      ELSE
        RAISE EXCEPTION 'tabela nao suportada para anonimizacao: %', item.tabela;
      END IF;

      UPDATE public.lgpd_fila_limpeza
         SET executado = true, processed_at = now()
       WHERE lgpd_fila_limpeza.id = item.id;

      sucesso := true;
    EXCEPTION WHEN others THEN
      sucesso := false;
      erro    := SQLERRM;
    END;

    RETURN NEXT;
  END LOOP;
END;
$function$
