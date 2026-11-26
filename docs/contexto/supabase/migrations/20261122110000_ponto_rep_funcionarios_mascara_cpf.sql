-- Achado da auditoria de 22/11/2026 (5 agentes testando o que já foi
-- implementado na integração do ponto Henry/AtecSoft): a tela de Vínculos
-- (`vinculosService.ts`) selecionava `ponto_rep_funcionarios.cpf` inteiro e só
-- truncava para os 4 últimos dígitos no JS -- o CPF completo saía do banco e
-- viajava na rede. Mesmo padrão que falta aqui já existe em `colaboradores`
-- (migration 20260712214246): coluna `cpf_last4` mantida por gatilho,
-- navegador só lê o last4. `pis` tem a mesma sensibilidade e não é usado por
-- nenhuma tela hoje -- fecha a mesma brecha nele, sem equivalente "last4"
-- porque nada precisa exibir nem os últimos dígitos do PIS.

ALTER TABLE public.ponto_rep_funcionarios
  ADD COLUMN IF NOT EXISTS cpf_last4 text;

CREATE OR REPLACE FUNCTION public.fn_ponto_rep_funcionario_cpf_last4()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_norm text;
BEGIN
  IF NEW.cpf IS NULL OR length(btrim(NEW.cpf)) = 0 THEN
    NEW.cpf_last4 := NULL;
    RETURN NEW;
  END IF;
  v_norm := regexp_replace(NEW.cpf, '\D', '', 'g');
  NEW.cpf_last4 := right(v_norm, LEAST(length(v_norm), 4));
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_ponto_rep_funcionario_cpf_last4() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_ponto_rep_funcionario_cpf_last4 ON public.ponto_rep_funcionarios;
CREATE TRIGGER trg_ponto_rep_funcionario_cpf_last4
  BEFORE INSERT OR UPDATE OF cpf ON public.ponto_rep_funcionarios
  FOR EACH ROW EXECUTE FUNCTION public.fn_ponto_rep_funcionario_cpf_last4();

-- Backfill (hoje 0 linhas no canônico, mas idempotente e correto se houver).
UPDATE public.ponto_rep_funcionarios
   SET cpf_last4 = right(regexp_replace(cpf, '\D', '', 'g'), 4)
 WHERE cpf IS NOT NULL AND cpf_last4 IS NULL;

-- authenticated deixa de ler cpf/pis inteiros; só cpf_last4 (igual padrão de
-- colaboradores). A escrita e a leitura de cpf/pis completos continuam só
-- para service_role (RPC/Edge Function), que precisa deles para o vínculo.
REVOKE SELECT ON public.ponto_rep_funcionarios FROM authenticated;
GRANT SELECT (id, dispositivo_id, empresa_id, codigo, nome, matricula, situacao,
  empresa_codigo, horario_codigo, data_admissao, data_desligamento, colaborador_id,
  vinculo_metodo, vinculado_em, hash_conteudo, cpf_last4, created_at, updated_at)
  ON public.ponto_rep_funcionarios TO authenticated;

COMMENT ON COLUMN public.ponto_rep_funcionarios.cpf_last4 IS 'Últimos 4 dígitos do CPF, mantidos pelo gatilho fn_ponto_rep_funcionario_cpf_last4 — único CPF que authenticated pode ler.';
