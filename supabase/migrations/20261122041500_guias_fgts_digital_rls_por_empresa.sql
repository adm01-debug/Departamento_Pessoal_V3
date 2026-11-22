-- guias_fgts_digital: a policy unica era SELECT aberta para qualquer admin/gestor/rh
-- de QUALQUER empresa, e nao havia policy de escrita.
--
-- Estado encontrado no canônico (policy `Gestores e RH veem guias FGTS`):
--   FOR SELECT USING (auth.uid() IN (SELECT user_id FROM user_roles
--                    WHERE role = ANY ('{admin,gestor,rh}')))
-- Sem `empresa_id`, um gestor de uma empresa le as guias de todas — e o
-- `.eq('empresa_id', ...)` da tela nao e autorizacao, e so filtro de exibicao
-- (o gateway repassa o JWT do usuario; a RLS e a unica barreira).
--
-- Segundo problema: nao existe policy de UPDATE. O botao "Paga" da aba FGTS
-- Digital fazia `update({status:'paga'})` e recebia `error: null` com 0 linhas
-- alteradas, exibindo "marcada como paga" sem gravar nada.
--
-- Correcao alinhada ao padrao das tabelas irmas:
--   * `guias_fgts` usa `tenant_guias_fgts` com get_user_empresas(auth.uid());
--   * recibos de ferias (20261122090000) usa pode_gerir_rh(empresa_id).
-- Guias fiscais sao registro de RH: leitura por vinculo com a empresa
-- (get_user_empresas) e escrita por quem gere RH naquela empresa
-- (pode_gerir_rh), que ja cobre admin e papel `rh` com vinculo.
--
-- Idempotente: derruba a policy aberta e recria as quatro por verbo.

ALTER TABLE public.guias_fgts_digital ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gestores e RH veem guias FGTS" ON public.guias_fgts_digital;

DROP POLICY IF EXISTS guias_fgts_digital_select ON public.guias_fgts_digital;
DROP POLICY IF EXISTS guias_fgts_digital_insert ON public.guias_fgts_digital;
DROP POLICY IF EXISTS guias_fgts_digital_update ON public.guias_fgts_digital;
DROP POLICY IF EXISTS guias_fgts_digital_delete ON public.guias_fgts_digital;

CREATE POLICY guias_fgts_digital_select ON public.guias_fgts_digital
  FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

CREATE POLICY guias_fgts_digital_insert ON public.guias_fgts_digital
  FOR INSERT TO authenticated
  WITH CHECK (public.pode_gerir_rh(empresa_id));

CREATE POLICY guias_fgts_digital_update ON public.guias_fgts_digital
  FOR UPDATE TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));

-- Delete fica restrito a gestao de RH: apagar guia fiscal e ato de RH, nao de
-- qualquer leitor. Sem policy de DELETE a operacao simplesmente nao encontra
-- linhas, o que e o comportamento seguro por omissao.
CREATE POLICY guias_fgts_digital_delete ON public.guias_fgts_digital
  FOR DELETE TO authenticated
  USING (public.pode_gerir_rh(empresa_id));
