-- P1: fecha o hiato de escrita do gestor em public.ferias.
--
-- MEDIDO NO CANÔNICO (frjbfeamybqsejlvmqbl), não deduzido:
--   public.ferias tem 2 policies — `ferias_gestor_read` (FOR SELECT,
--   USING pode_gerir_pessoas) e `ferias_rh_manage` (FOR ALL,
--   USING/WITH CHECK pode_gerir_rh). Definições em
--   20260729151828:57-65 e 20260924140000:104-107.
--
-- O gestor LÊ a solicitação de férias e a UI mostra o botão "Aprovar (Gestor)"
-- (src/components/ferias/FeriasActions.tsx:66 e
-- src/components/ferias/programacao/CardProgramacao.tsx:124, ligados em
-- src/pages/FeriasPage.tsx:398), mas `feriasService.aprovarGestor`
-- (src/services/feriasService.ts:207-219) faz UPDATE DIRETO na tabela — sem
-- policy de UPDATE para o papel gestor, esse UPDATE é recusado pela RLS.
-- Resultado em produção: o gestor clica em aprovar e a aprovação não grava.
--
-- POR QUE pode_gerir_pessoas É SEGURO AQUI: a função é, por definição,
-- superconjunto explícito de pode_gerir_rh —
-- 20260729151433:35-38 `SELECT public.pode_gerir_rh(_empresa_id) OR (... gestor ...)`
-- e pode_gerir_pessoas_para em 20261113000000:170-185 é
-- `is_admin OR (vínculo em user_empresas AND (rh OR gestor))`. Ou seja a
-- policy nova concede UPDATE a "admin ou RH ou gestor DA MESMA empresa", nunca
-- a authenticated em geral. Policies PERMISSIVE combinam por OR, então o que
-- já governava continua valendo e nada é revogado.
--
-- ESCOPO DELIBERADAMENTE MENOR QUE O DA PR #726: aquela PR adicionava a mesma
-- policy TAMBÉM em public.folhas_pagamento. Não há fluxo de gestor que escreva
-- nessa tabela: o UPDATE direto do front vem de
-- src/services/folha/calculoLoteService.ts:505 (totais da folha, trabalho de
-- RH) e o fechar/reabrir passa pelas edges `fechar-folha`/`reabrir-folha`, que
-- usam service_role e não dependem de RLS. Alargar escrita de gestor numa
-- tabela financeira sem fluxo que a exija seria afrouxar controle sem
-- necessidade provada — fica de fora, e o sidecar assere que ficou.

DROP POLICY IF EXISTS "ferias_gestor_update" ON public.ferias;
CREATE POLICY "ferias_gestor_update" ON public.ferias
  FOR UPDATE TO authenticated
  USING (public.pode_gerir_pessoas(empresa_id))
  WITH CHECK (public.pode_gerir_pessoas(empresa_id));

-- Pós-condição: a policy nova existe no formato certo, as duas que já
-- governavam seguem intactas, e folhas_pagamento NÃO recebeu escrita de gestor.
DO $pos$
DECLARE
  v_update   int;
  v_read     int;
  v_manage   int;
  v_folhas   int;
BEGIN
  SELECT count(*) INTO v_update
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'ferias'
    AND policyname = 'ferias_gestor_update'
    AND cmd = 'UPDATE'
    AND 'authenticated' = ANY (roles)
    AND qual LIKE '%pode_gerir_pessoas%'
    AND with_check LIKE '%pode_gerir_pessoas%';
  IF v_update <> 1 THEN
    RAISE EXCEPTION 'pos-condicao: ferias_gestor_update nao ficou como UPDATE para authenticated com pode_gerir_pessoas (achei %)', v_update;
  END IF;

  SELECT count(*) INTO v_read
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'ferias'
    AND policyname = 'ferias_gestor_read' AND cmd = 'SELECT';
  IF v_read <> 1 THEN
    RAISE EXCEPTION 'pos-condicao: ferias_gestor_read desapareceu (achei %)', v_read;
  END IF;

  SELECT count(*) INTO v_manage
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'ferias'
    AND policyname = 'ferias_rh_manage' AND cmd = 'ALL';
  IF v_manage <> 1 THEN
    RAISE EXCEPTION 'pos-condicao: ferias_rh_manage desapareceu (achei %)', v_manage;
  END IF;

  SELECT count(*) INTO v_folhas
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'folhas_pagamento'
    AND cmd IN ('UPDATE', 'ALL')
    AND qual LIKE '%pode_gerir_pessoas%';
  IF v_folhas <> 0 THEN
    RAISE EXCEPTION 'pos-condicao: folhas_pagamento recebeu escrita de gestor, o que esta migration decidiu NAO fazer (achei %)', v_folhas;
  END IF;
END
$pos$;
