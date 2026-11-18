-- Sidecar de 20261118235000_consignado_margem_consignavel_trigger.sql.
-- Contrato: toda linha não-vazia da saída tem de ser literalmente 'ok'.
--
-- Afirma: função existe, é SECURITY DEFINER, tem search_path fixado, não tem
-- EXECUTE para anon/authenticated, e o trigger está ligado em
-- emprestimos_consignados para INSERT e UPDATE, BEFORE, FOR EACH ROW.
SELECT 'ok'
WHERE EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'fn_consignado_valida_margem'
      AND p.prosecdef
      AND p.proconfig @> ARRAY['search_path=public']
  )
  AND NOT has_function_privilege('anon', 'public.fn_consignado_valida_margem()', 'EXECUTE')
  AND NOT has_function_privilege('authenticated', 'public.fn_consignado_valida_margem()', 'EXECUTE')
  AND EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'emprestimos_consignados'
      AND t.tgname = 'trg_consignado_valida_margem'
      AND NOT t.tgisinternal
      -- tgtype (pg): 1=ROW, 2=BEFORE, 4=INSERT, 16=UPDATE, 64=INSTEAD OF.
      -- BEFORE INSERT OR UPDATE FOR EACH ROW => 1+2+4+16 = 23.
      AND (t.tgtype & 1) = 1
      AND (t.tgtype & 2) = 2
      AND (t.tgtype & 4) = 4
      AND (t.tgtype & 16) = 16
      AND (t.tgtype & 64) = 0
  );
