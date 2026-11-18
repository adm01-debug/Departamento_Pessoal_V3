-- Margem consignável de 35%: fecha o desvio pela tela.
--
-- A edge `emprestimo-consignado` calcula a parcela (Price) e recusa com
-- MARGIN_EXCEEDED quando "soma das parcelas ativas + nova parcela" passa de 35%
-- do salario_base (supabase/functions/emprestimo-consignado/index.ts:140-146).
-- Mas src/pages/DescontosPage.tsx:74 grava direto em emprestimos_consignados
-- pelo PostgREST, com a parcela digitada, sem passar pela edge -- entao hoje a
-- regra existe e nao e aplicada nesse caminho.
--
-- A guarda vai para o banco: vale para a tela, para a edge, para o MCP e para
-- qualquer caminho futuro, sem mudar quem digita o que. Mesma formula e mesmo
-- recorte de status ('ativo') da edge.
--
-- Medido em producao antes de aplicar: 6 colaboradores com consignado ativo,
-- NENHUM acima da margem (o pior esta em 50,8% da margem permitida). Nenhuma
-- linha existente fica travada.
CREATE OR REPLACE FUNCTION public.fn_consignado_valida_margem()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  v_margem := round(v_salario * 0.35, 2);

  IF v_comprometido + COALESCE(NEW.valor_parcela, 0) > v_margem THEN
    -- Mensagem sem termo que o filtro de src/utils/safeError.ts esconde, para
    -- que o RH leia o motivo real no toast da tela.
    RAISE EXCEPTION 'Parcela excede a margem consignável de 35%% do salário: já comprometido R$ %, limite R$ %',
      to_char(v_comprometido, 'FM999999990.00'),
      to_char(v_margem, 'FM999999990.00');
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_consignado_valida_margem() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.fn_consignado_valida_margem() IS
  'Aplica a margem consignável de 35% do salario_base em emprestimos_consignados, independente do caminho de escrita (tela, edge, MCP).';

DROP TRIGGER IF EXISTS trg_consignado_valida_margem ON public.emprestimos_consignados;
CREATE TRIGGER trg_consignado_valida_margem
  BEFORE INSERT OR UPDATE ON public.emprestimos_consignados
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_consignado_valida_margem();
