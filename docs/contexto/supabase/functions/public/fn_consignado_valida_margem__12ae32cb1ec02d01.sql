CREATE OR REPLACE FUNCTION public.fn_consignado_valida_margem()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_salario      numeric;
  v_comprometido numeric;
  v_margem       numeric;
BEGIN
  -- Só parcelas ativas entram na margem, igual ao .eq('status','ativo') da edge.
  IF COALESCE(NEW.status, '') <> 'ativo' THEN
    RETURN NEW;
  END IF;

  -- UPDATE que não aumenta o comprometido (ex.: parcelas_pagas, observações)
  -- passa direto: a guarda só barra quem piora a situação do colaborador.
  IF TG_OP = 'UPDATE'
     AND COALESCE(OLD.status, '') = 'ativo'
     AND COALESCE(NEW.valor_parcela, 0) <= COALESCE(OLD.valor_parcela, 0) THEN
    RETURN NEW;
  END IF;

  SELECT c.salario_base INTO v_salario
  FROM public.colaboradores c
  WHERE c.id = NEW.colaborador_id;

  IF COALESCE(v_salario, 0) <= 0 THEN
    RAISE EXCEPTION 'Salário base do colaborador não permite calcular a margem consignável';
  END IF;

  SELECT COALESCE(sum(e.valor_parcela), 0) INTO v_comprometido
  FROM public.emprestimos_consignados e
  WHERE e.colaborador_id = NEW.colaborador_id
    AND e.status = 'ativo'
    AND (NEW.id IS NULL OR e.id <> NEW.id);

  v_margem := round(v_salario * 0.30, 2);

  IF v_comprometido + COALESCE(NEW.valor_parcela, 0) > v_margem THEN
    -- Mensagem sem termo que o filtro de src/utils/safeError.ts esconde, para
    -- que o RH leia o motivo real no toast da tela.
    RAISE EXCEPTION 'Parcela excede a margem de empréstimo consignável de 30%% do salário: já comprometido R$ %, limite R$ %',
      to_char(v_comprometido, 'FM999999990.00'),
      to_char(v_margem, 'FM999999990.00');
  END IF;

  RETURN NEW;
END;
$function$
