-- P0: fecha bypass real de RLS em registros_ponto via batidas_ponto.
--
-- Achado em auditoria adversarial (24/09/2026): o conserto de hoje em
-- registros_ponto (20260924192541 -- registros_ponto_write exige
-- sou_o_colaborador/pode_gerir_rh/pode_gerir_pessoas) deixou uma porta dos
-- fundos aberta. batidas_ponto tem trigger AFTER INSERT/UPDATE
-- (trg_consolidar_batidas -> fn_consolidar_batidas(), SECURITY DEFINER,
-- ver 20260317003325) que faz UPSERT em registros_ponto a partir de
-- NEW.colaborador_id/NEW.data -- sem passar pela policy de registros_ponto.
--
-- As policies vivas de escrita em batidas_ponto (bp_ins/bp_upd/bp_del,
-- 20260317002431) só checam tenant:
--   WITH CHECK/USING (empresa_id IN (SELECT get_user_empresas(auth.uid())))
-- sem checar titularidade nem papel. Confirmado nome exato ao vivo via MCP
-- antes de escrever esta migration.
--
-- Cenário de exploração: colaborador U (papel comum) e colega V na mesma
-- empresa E. U faz INSERT em batidas_ponto com colaborador_id=V -> bp_ins
-- passa (só checa tenant) -> trigger dispara -> UPSERT em registros_ponto
-- de V, sobrescrevendo entrada/saída/horas extras/faltas/atraso. bp_upd/
-- bp_del com o mesmo predicado permitem alterar/apagar batidas de V
-- diretamente. Contorna totalmente o fix de hoje em registros_ponto_write.
--
-- Mesmo predicado já usado em registros_ponto_write, aplicado às 3
-- policies de escrita. bp_sel (leitura) e batidas_ponto_tenant_select
-- ficam fora de escopo desta migration -- leitura ampla dentro do tenant
-- não é o problema reportado; mexer nelas é mudança separada.

DO $migration$
DECLARE
  v_exists boolean;
BEGIN
  -- 1. Confirma que as 3 policies antigas existem com o nome exato antes
  --    de mexer -- se não existirem, a suposição sobre o estado vivo está
  --    errada, falhar alto e claro em vez de seguir calado.
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'batidas_ponto' AND policyname = 'bp_ins'
  ) INTO v_exists;
  IF NOT v_exists THEN
    RAISE EXCEPTION 'Migration esperava a policy "bp_ins" viva em public.batidas_ponto e não a encontrou -- confirmar ao vivo antes de reaplicar.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'batidas_ponto' AND policyname = 'bp_upd'
  ) INTO v_exists;
  IF NOT v_exists THEN
    RAISE EXCEPTION 'Migration esperava a policy "bp_upd" viva em public.batidas_ponto e não a encontrou -- confirmar ao vivo antes de reaplicar.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'batidas_ponto' AND policyname = 'bp_del'
  ) INTO v_exists;
  IF NOT v_exists THEN
    RAISE EXCEPTION 'Migration esperava a policy "bp_del" viva em public.batidas_ponto e não a encontrou -- confirmar ao vivo antes de reaplicar.';
  END IF;

  -- 2. Cria as policies novas (escopadas por titularidade/papel) antes de
  --    derrubar as antigas -- policies PERMISSIVE se combinam por OR, então
  --    ter as duas vivas ao mesmo tempo não abre brecha nova (a antiga já
  --    é mais ampla que a nova); só depois do DROP a proteção passa a valer.
  CREATE POLICY bp_ins_role_gate ON public.batidas_ponto
    FOR INSERT TO authenticated
    WITH CHECK (
      empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
      AND (
        public.sou_o_colaborador(colaborador_id)
        OR public.pode_gerir_rh(empresa_id)
        OR public.pode_gerir_pessoas(empresa_id)
      )
    );

  CREATE POLICY bp_upd_role_gate ON public.batidas_ponto
    FOR UPDATE TO authenticated
    USING (
      empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
      AND (
        public.sou_o_colaborador(colaborador_id)
        OR public.pode_gerir_rh(empresa_id)
        OR public.pode_gerir_pessoas(empresa_id)
      )
    )
    WITH CHECK (
      empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
      AND (
        public.sou_o_colaborador(colaborador_id)
        OR public.pode_gerir_rh(empresa_id)
        OR public.pode_gerir_pessoas(empresa_id)
      )
    );

  CREATE POLICY bp_del_role_gate ON public.batidas_ponto
    FOR DELETE TO authenticated
    USING (
      empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
      AND (
        public.sou_o_colaborador(colaborador_id)
        OR public.pode_gerir_rh(empresa_id)
        OR public.pode_gerir_pessoas(empresa_id)
      )
    );

  -- 3. Dropa as antigas pelo nome exato confirmado no passo 1.
  DROP POLICY "bp_ins" ON public.batidas_ponto;
  DROP POLICY "bp_upd" ON public.batidas_ponto;
  DROP POLICY "bp_del" ON public.batidas_ponto;

  -- 4. Confirma que sumiram e que as novas existem. Falha se algo não bateu
  --    em vez de reportar sucesso.
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'batidas_ponto'
      AND policyname IN ('bp_ins', 'bp_upd', 'bp_del')
  ) INTO v_exists;
  IF v_exists THEN
    RAISE EXCEPTION 'bp_ins/bp_upd/bp_del ainda existem em public.batidas_ponto -- DROP não teve o efeito esperado.';
  END IF;

  SELECT (
    (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='batidas_ponto'
      AND policyname IN ('bp_ins_role_gate','bp_upd_role_gate','bp_del_role_gate')) = 3
  ) INTO v_exists;
  IF NOT v_exists THEN
    RAISE EXCEPTION 'Nem todas as 3 policies novas (bp_ins_role_gate/bp_upd_role_gate/bp_del_role_gate) foram criadas.';
  END IF;
END
$migration$;
