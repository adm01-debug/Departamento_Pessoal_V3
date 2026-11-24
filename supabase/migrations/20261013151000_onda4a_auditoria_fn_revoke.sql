-- Onda 4a (complemento): provisao_auditoria_set_empresa é rotina
-- interna de trigger — ninguém a invoca diretamente. O gate
-- secdef-authz reprova SECURITY DEFINER executável por anon; o
-- REVOKE fecha a superfície sem afetar o trigger (que dispara
-- independente de EXECUTE no catálogo).
DO $$
BEGIN
  IF to_regprocedure('public.provisao_auditoria_set_empresa()') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.provisao_auditoria_set_empresa() FROM PUBLIC, anon, authenticated';
  END IF;
END $$;
