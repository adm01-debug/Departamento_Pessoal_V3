-- P0 de segurança: fecha a escalada que a 20261119130000 abriu sem perceber.
--
-- A 20261119130000 criou `ferias_gestor_update` (FOR UPDATE, pode_gerir_pessoas)
-- para o gestor conseguir gravar a própria aprovação. RLS no PostgreSQL é por
-- LINHA, não por COLUNA: com a policy valendo, um usuário com papel `gestor`
-- vinculado à empresa passa a poder atualizar QUALQUER coluna da linha —
-- inclusive `aprovado_rh`, `status_aprovacao_rh`, `aprovado_rh_por` e
-- `aprovado_rh_em`, que são a aprovação do RH. Pela API REST/bridge isso
-- permite ao gestor FORJAR a aprovação do RH, contornando a autorização
-- exclusiva de admin/RH de `assinar_aviso_ferias` (20260723100640:35-37).
-- Antes da 20261119130000 o gestor só tinha SELECT, então a escalada é nova.
-- Achado pela review automática na PR #729, depois do apply — reconhecido e
-- corrigido aqui.
--
-- Correção escolhida: NÃO revogar a policy (isso traria de volta o bug de o
-- gestor não conseguir aprovar nada), e sim guardar as colunas por trigger,
-- exatamente no padrão que o projeto já usa no ponto
-- (`bloquear_aprovacao_ponto_sem_rh`): exime quem não é `authenticated`/`anon`
-- (service_role das edges, migrations e as RPCs SECURITY DEFINER, cujo
-- current_user passa a ser o dono), libera quem é admin/RH e, para o resto,
-- recusa qualquer alteração nas colunas protegidas.
--
-- Colunas protegidas e por quê:
--   • aprovado_rh, aprovado_rh_em, aprovado_rh_por, status_aprovacao_rh
--     — é a aprovação do RH; `feriasService.aprovarRH` (:221-234) é o único
--       caminho legítimo e corre com papel de RH;
--   • aprovado_em, aprovado_por — marcadores genéricos de aprovação; nenhum
--     fluxo do front grava (conferido em feriasService.ts), então travar não
--     tira capacidade de ninguém;
--   • aviso_assinatura_{em,hash,ip,por,user_agent} — assinatura do aviso de
--     férias, gravada só pela RPC de 20260723100640; gravá-las direto seria
--     forjar assinatura.
-- Fora de propósito: `status` e `status_aprovacao_contabilidade`. O `status` é
-- mexido por outros triggers da própria tabela no mesmo statement
-- (`fn_update_ferias_status_by_date`, `trg_ferias_status_transition`) e travá-lo
-- aqui atribuiria ao chamador uma escrita que não é dele; a contabilidade tem
-- fluxo próprio (`enviarContabilidade`) que não foi medido como RH-exclusivo.

CREATE OR REPLACE FUNCTION public.ferias_bloquear_aprovacao_rh_sem_rh()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
  -- service_role (edges), migrations e RPC SECURITY DEFINER passam direto.
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF public.pode_gerir_rh(NEW.empresa_id) THEN
    RETURN NEW;
  END IF;

  IF NEW.aprovado_rh IS DISTINCT FROM OLD.aprovado_rh
     OR NEW.aprovado_rh_em IS DISTINCT FROM OLD.aprovado_rh_em
     OR NEW.aprovado_rh_por IS DISTINCT FROM OLD.aprovado_rh_por
     OR NEW.status_aprovacao_rh IS DISTINCT FROM OLD.status_aprovacao_rh
     OR NEW.aprovado_em IS DISTINCT FROM OLD.aprovado_em
     OR NEW.aprovado_por IS DISTINCT FROM OLD.aprovado_por THEN
    RAISE EXCEPTION 'Somente RH ou admin pode registrar a aprovacao do RH nas ferias'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.aviso_assinatura_em IS DISTINCT FROM OLD.aviso_assinatura_em
     OR NEW.aviso_assinatura_hash IS DISTINCT FROM OLD.aviso_assinatura_hash
     OR NEW.aviso_assinatura_ip IS DISTINCT FROM OLD.aviso_assinatura_ip
     OR NEW.aviso_assinatura_por IS DISTINCT FROM OLD.aviso_assinatura_por
     OR NEW.aviso_assinatura_user_agent IS DISTINCT FROM OLD.aviso_assinatura_user_agent THEN
    RAISE EXCEPTION 'Assinatura do aviso de ferias so pode ser gravada pelo fluxo de assinatura'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.ferias_bloquear_aprovacao_rh_sem_rh() IS
  'Guarda de coluna para public.ferias: com ferias_gestor_update (RLS e por linha), impede que gestor forje a aprovacao do RH ou a assinatura do aviso. Ver 20261119140000.';

REVOKE ALL ON FUNCTION public.ferias_bloquear_aprovacao_rh_sem_rh() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_ferias_bloquear_aprovacao_rh_sem_rh ON public.ferias;
CREATE TRIGGER trg_ferias_bloquear_aprovacao_rh_sem_rh
  BEFORE UPDATE ON public.ferias
  FOR EACH ROW
  EXECUTE FUNCTION public.ferias_bloquear_aprovacao_rh_sem_rh();

-- Pós-condição: trigger no formato certo e a policy do gestor ainda de pé (a
-- correção não desfaz a 20261119130000, só a torna segura).
DO $pos$
DECLARE
  v_bits int;
  v_policy int;
BEGIN
  SELECT t.tgtype INTO v_bits
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'ferias'
    AND t.tgname = 'trg_ferias_bloquear_aprovacao_rh_sem_rh'
    AND NOT t.tgisinternal;

  IF v_bits IS NULL THEN
    RAISE EXCEPTION 'pos-condicao: trigger trg_ferias_bloquear_aprovacao_rh_sem_rh nao existe';
  END IF;
  -- 1 = FOR EACH ROW, 2 = BEFORE, 16 = UPDATE
  IF (v_bits & 1) = 0 OR (v_bits & 2) = 0 OR (v_bits & 16) = 0 THEN
    RAISE EXCEPTION 'pos-condicao: trigger nao e BEFORE UPDATE FOR EACH ROW (tgtype %)', v_bits;
  END IF;

  SELECT count(*) INTO v_policy
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'ferias'
    AND policyname = 'ferias_gestor_update' AND cmd = 'UPDATE';
  IF v_policy <> 1 THEN
    RAISE EXCEPTION 'pos-condicao: ferias_gestor_update deveria continuar existindo (achei %)', v_policy;
  END IF;
END
$pos$;
