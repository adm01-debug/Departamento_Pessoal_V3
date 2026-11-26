-- Teto do empréstimo consignado: 35% -> 30% do salario_base.
--
-- Correção de número meu. A 20261118235000 pôs 35% no banco, mas 35% é a
-- margem TOTAL da Lei 10.820/2003, art. 1º §1º (redação da Lei 14.431/2022):
-- do total, 5% são destinados EXCLUSIVAMENTE à amortização de despesas de
-- cartão de crédito consignado ou ao saque por esse cartão. A faixa do
-- empréstimo propriamente dito é de 30%.
--
-- Efeito prático: o backstop do banco deixa de ser mais frouxo que a tela.
-- src/components/descontos/NewLoanDialog.tsx já aplica 30% do salario_base;
-- com 35% no banco, uma escrita direta no PostgREST entre 30% e 35% passava.
-- Agora os dois cortam no mesmo ponto.
--
-- Medido em produção antes de aplicar: 6 consignados ativos, o maior em 17,8%
-- do salário (colab 800/4500). Nenhum acima de 30%, então nenhuma linha
-- existente fica travada. O ramo de UPDATE que não aumenta o comprometido
-- continua passando direto, igual à versão anterior.
--
-- Base ainda é salario_base, não "remuneração disponível" (líquido) como diz a
-- lei: computar o líquido dentro de um trigger exigiria a folha do mês e é
-- mudança de arquitetura. Fica registrado em docs/agentes/decisoes-e-gaps.md.

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
$$;

REVOKE ALL ON FUNCTION public.fn_consignado_valida_margem() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.fn_consignado_valida_margem() IS
  'Aplica o teto de 30% do salario_base para emprestimo consignado (Lei 10.820 art. 1 §1, faixa do emprestimo; os outros 5% dos 35% totais sao exclusivos do cartao consignado), independente do caminho de escrita (tela, edge, MCP).';

-- O trigger já existe desde 20261118235000 e aponta para a mesma função; o
-- DROP/CREATE mantém a migration idempotente e reaplicável isolada.
DROP TRIGGER IF EXISTS trg_consignado_valida_margem ON public.emprestimos_consignados;
CREATE TRIGGER trg_consignado_valida_margem
  BEFORE INSERT OR UPDATE ON public.emprestimos_consignados
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_consignado_valida_margem();

-- Pós-condição fail-closed: confere que o corpo em vigor é o de 30% e que as
-- propriedades de segurança não se perderam no CREATE OR REPLACE.
DO $pos$
DECLARE
  v_oid oid;
BEGIN
  SELECT p.oid INTO v_oid
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'fn_consignado_valida_margem';

  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'pos-condicao: fn_consignado_valida_margem nao existe';
  END IF;

  IF pg_get_functiondef(v_oid) NOT LIKE '%v_salario * 0.30%' THEN
    RAISE EXCEPTION 'pos-condicao: o corpo em vigor nao usa o teto de 0.30';
  END IF;

  IF pg_get_functiondef(v_oid) LIKE '%v_salario * 0.35%' THEN
    RAISE EXCEPTION 'pos-condicao: o corpo em vigor ainda usa o teto antigo de 0.35';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid = v_oid AND prosecdef) THEN
    RAISE EXCEPTION 'pos-condicao: a funcao deixou de ser SECURITY DEFINER';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    WHERE t.tgrelid = 'public.emprestimos_consignados'::regclass
      AND t.tgname = 'trg_consignado_valida_margem'
      AND NOT t.tgisinternal
      AND t.tgfoid = v_oid
      AND (t.tgtype & 1) = 1
      AND (t.tgtype & 2) = 2
      AND (t.tgtype & 4) = 4
      AND (t.tgtype & 16) = 16
  ) THEN
    RAISE EXCEPTION 'pos-condicao: trg_consignado_valida_margem ausente ou fora do contrato BEFORE INSERT OR UPDATE FOR EACH ROW';
  END IF;
END
$pos$;
