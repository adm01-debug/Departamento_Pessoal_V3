-- Escrita por papel: fecha a escrita de RH aberta a qualquer membro do tenant.
--
-- Estado vivo lido em pg_policies (12/11/2026, canônico frjbfeamybqsejlvmqbl):
--   * comunicados / convenios / seguros_vida / departamentos: uma policy FOR ALL
--     só com `empresa_id IN (get_user_empresas(auth.uid()))` — qualquer
--     colaborador (estagiário incluído) cria, edita e apaga.
--   * pensoes: idem, via colaborador_id -> colaboradores.empresa_id.
--   * premiacoes_campanhas: predicado tautológico
--     (`premiacoes_campanhas.empresa_id = premiacoes_campanhas.empresa_id`),
--     role public: qualquer usuário com profile lê/grava campanhas de TODAS
--     as empresas.
--   * registros_ponto: registros_ponto_write deixa o colaborador gravar o
--     próprio ponto (correto), mas sem travar aprovado/aprovado_por/aprovado_em
--     — ele mesmo se aprova.
--   * cnab_remessas: cnab_remessas_tenant_read expõe o arquivo bancário da
--     folha a qualquer membro do tenant.
--   * canal_etica: canal_etica_rh_manage (FOR ALL) deixa o RH apagar denúncia.
--
-- Leitura (SELECT) das 5 primeiras tabelas fica idêntica. Escrita passa a
-- exigir public.pode_gerir_rh(empresa_id), que já inclui is_admin()
-- (pode_gerir_rh_para: `is_admin(_user_id) OR (vínculo AND has_role rh)`).
-- Idempotente: DROP POLICY IF EXISTS + CREATE POLICY / CREATE OR REPLACE.

-- ---------------------------------------------------------------------------
-- comunicados
DROP POLICY IF EXISTS empresa_comunicados ON public.comunicados;
DROP POLICY IF EXISTS comunicados_tenant_select ON public.comunicados;
DROP POLICY IF EXISTS comunicados_rh_insert ON public.comunicados;
DROP POLICY IF EXISTS comunicados_rh_update ON public.comunicados;
DROP POLICY IF EXISTS comunicados_rh_delete ON public.comunicados;
CREATE POLICY comunicados_tenant_select ON public.comunicados
  FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
CREATE POLICY comunicados_rh_insert ON public.comunicados
  FOR INSERT TO authenticated
  WITH CHECK (public.pode_gerir_rh(empresa_id));
CREATE POLICY comunicados_rh_update ON public.comunicados
  FOR UPDATE TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));
CREATE POLICY comunicados_rh_delete ON public.comunicados
  FOR DELETE TO authenticated
  USING (public.pode_gerir_rh(empresa_id));

-- ---------------------------------------------------------------------------
-- convenios
DROP POLICY IF EXISTS tenant_convenios ON public.convenios;
DROP POLICY IF EXISTS convenios_tenant_select ON public.convenios;
DROP POLICY IF EXISTS convenios_rh_insert ON public.convenios;
DROP POLICY IF EXISTS convenios_rh_update ON public.convenios;
DROP POLICY IF EXISTS convenios_rh_delete ON public.convenios;
CREATE POLICY convenios_tenant_select ON public.convenios
  FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
CREATE POLICY convenios_rh_insert ON public.convenios
  FOR INSERT TO authenticated
  WITH CHECK (public.pode_gerir_rh(empresa_id));
CREATE POLICY convenios_rh_update ON public.convenios
  FOR UPDATE TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));
CREATE POLICY convenios_rh_delete ON public.convenios
  FOR DELETE TO authenticated
  USING (public.pode_gerir_rh(empresa_id));

-- ---------------------------------------------------------------------------
-- seguros_vida
DROP POLICY IF EXISTS tenant_seguros_vida ON public.seguros_vida;
DROP POLICY IF EXISTS seguros_vida_tenant_select ON public.seguros_vida;
DROP POLICY IF EXISTS seguros_vida_rh_insert ON public.seguros_vida;
DROP POLICY IF EXISTS seguros_vida_rh_update ON public.seguros_vida;
DROP POLICY IF EXISTS seguros_vida_rh_delete ON public.seguros_vida;
CREATE POLICY seguros_vida_tenant_select ON public.seguros_vida
  FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
CREATE POLICY seguros_vida_rh_insert ON public.seguros_vida
  FOR INSERT TO authenticated
  WITH CHECK (public.pode_gerir_rh(empresa_id));
CREATE POLICY seguros_vida_rh_update ON public.seguros_vida
  FOR UPDATE TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));
CREATE POLICY seguros_vida_rh_delete ON public.seguros_vida
  FOR DELETE TO authenticated
  USING (public.pode_gerir_rh(empresa_id));

-- ---------------------------------------------------------------------------
-- departamentos (sincronizar-bitrix grava com service_role: não passa por RLS)
DROP POLICY IF EXISTS tenant_departamentos ON public.departamentos;
DROP POLICY IF EXISTS departamentos_tenant_select ON public.departamentos;
DROP POLICY IF EXISTS departamentos_rh_insert ON public.departamentos;
DROP POLICY IF EXISTS departamentos_rh_update ON public.departamentos;
DROP POLICY IF EXISTS departamentos_rh_delete ON public.departamentos;
CREATE POLICY departamentos_tenant_select ON public.departamentos
  FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
CREATE POLICY departamentos_rh_insert ON public.departamentos
  FOR INSERT TO authenticated
  WITH CHECK (public.pode_gerir_rh(empresa_id));
CREATE POLICY departamentos_rh_update ON public.departamentos
  FOR UPDATE TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));
CREATE POLICY departamentos_rh_delete ON public.departamentos
  FOR DELETE TO authenticated
  USING (public.pode_gerir_rh(empresa_id));

-- ---------------------------------------------------------------------------
-- pensoes: sem empresa_id confiável em produção — tenant pelo colaborador.
DROP POLICY IF EXISTS tenant_pensoes ON public.pensoes;
DROP POLICY IF EXISTS pensoes_tenant_select ON public.pensoes;
DROP POLICY IF EXISTS pensoes_rh_insert ON public.pensoes;
DROP POLICY IF EXISTS pensoes_rh_update ON public.pensoes;
DROP POLICY IF EXISTS pensoes_rh_delete ON public.pensoes;
CREATE POLICY pensoes_tenant_select ON public.pensoes
  FOR SELECT TO authenticated
  USING (colaborador_id IN (
    SELECT c.id FROM public.colaboradores c
    WHERE c.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  ));
CREATE POLICY pensoes_rh_insert ON public.pensoes
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = pensoes.colaborador_id AND public.pode_gerir_rh(c.empresa_id)
  ));
CREATE POLICY pensoes_rh_update ON public.pensoes
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = pensoes.colaborador_id AND public.pode_gerir_rh(c.empresa_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = pensoes.colaborador_id AND public.pode_gerir_rh(c.empresa_id)
  ));
CREATE POLICY pensoes_rh_delete ON public.pensoes
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = pensoes.colaborador_id AND public.pode_gerir_rh(c.empresa_id)
  ));

-- ---------------------------------------------------------------------------
-- premiacoes_campanhas: troca a tautologia por escopo de tenant.
DROP POLICY IF EXISTS "Users can manage their own company campaigns" ON public.premiacoes_campanhas;
DROP POLICY IF EXISTS "Users can view their own company campaigns" ON public.premiacoes_campanhas;
DROP POLICY IF EXISTS premiacoes_campanhas_tenant_select ON public.premiacoes_campanhas;
DROP POLICY IF EXISTS premiacoes_campanhas_rh_manage ON public.premiacoes_campanhas;
CREATE POLICY premiacoes_campanhas_tenant_select ON public.premiacoes_campanhas
  FOR SELECT TO authenticated
  USING (public.pertence_a_empresa(empresa_id));
CREATE POLICY premiacoes_campanhas_rh_manage ON public.premiacoes_campanhas
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));

-- ---------------------------------------------------------------------------
-- registros_ponto: o colaborador continua batendo/ajustando o próprio ponto
-- (registros_ponto_write intacta), mas só quem pode_gerir_pessoas
-- (admin/RH/gestor, como hoje na tela de aprovação) aprova, e dia já aprovado
-- só eles alteram. Caminhos de sistema (service_role, postgres, funções
-- SECURITY DEFINER) não são afetados.
CREATE OR REPLACE FUNCTION public.bloquear_aprovacao_ponto_sem_rh()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF public.pode_gerir_pessoas(NEW.empresa_id) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.aprovado, false) OR NEW.aprovado_por IS NOT NULL OR NEW.aprovado_em IS NOT NULL THEN
      RAISE EXCEPTION 'Somente RH/admin pode aprovar registro de ponto'
        USING ERRCODE = '42501';
    END IF;
  ELSIF COALESCE(OLD.aprovado, false)
        AND (to_jsonb(NEW) - '{updated_at,version,hash_digital}'::text[])
            IS DISTINCT FROM (to_jsonb(OLD) - '{updated_at,version,hash_digital}'::text[]) THEN
    RAISE EXCEPTION 'registro aprovado: só RH/gestor altera'
      USING ERRCODE = '42501';
  ELSIF NEW.aprovado IS DISTINCT FROM OLD.aprovado
        OR NEW.aprovado_por IS DISTINCT FROM OLD.aprovado_por
        OR NEW.aprovado_em IS DISTINCT FROM OLD.aprovado_em THEN
    RAISE EXCEPTION 'Somente RH/admin pode aprovar registro de ponto'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_bloquear_aprovacao_ponto_sem_rh ON public.registros_ponto;
CREATE TRIGGER tr_bloquear_aprovacao_ponto_sem_rh
  BEFORE INSERT OR UPDATE ON public.registros_ponto
  FOR EACH ROW EXECUTE FUNCTION public.bloquear_aprovacao_ponto_sem_rh();

-- ---------------------------------------------------------------------------
-- cnab_remessas: leitura do arquivo bancário só para RH/admin.
DROP POLICY IF EXISTS cnab_remessas_tenant_read ON public.cnab_remessas;
DROP POLICY IF EXISTS cnab_remessas_rh_manage ON public.cnab_remessas;
CREATE POLICY cnab_remessas_rh_manage ON public.cnab_remessas
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));

-- ---------------------------------------------------------------------------
-- canal_etica: RH lê e trata (SELECT/UPDATE); só admin apaga. O registro
-- anônimo (canal_etica_reportar, INSERT) continua como está.
DROP POLICY IF EXISTS canal_etica_rh_manage ON public.canal_etica;
DROP POLICY IF EXISTS canal_etica_rh_select ON public.canal_etica;
DROP POLICY IF EXISTS canal_etica_rh_update ON public.canal_etica;
DROP POLICY IF EXISTS canal_etica_admin_delete ON public.canal_etica;
CREATE POLICY canal_etica_rh_select ON public.canal_etica
  FOR SELECT TO authenticated
  USING (public.pode_gerir_rh(empresa_id));
CREATE POLICY canal_etica_rh_update ON public.canal_etica
  FOR UPDATE TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));
CREATE POLICY canal_etica_admin_delete ON public.canal_etica
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- Pós-condição: policy de escrita sem helper de papel nas 8 tabelas (drift ou
-- policy legada fora da lista acima) aborta o lote inteiro (rollback).
DO $$
DECLARE
  _sobra text;
BEGIN
  SELECT string_agg(tablename || '.' || policyname, ', ') INTO _sobra
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('comunicados', 'convenios', 'seguros_vida', 'departamentos', 'pensoes',
                      'premiacoes_campanhas', 'cnab_remessas', 'canal_etica')
    AND cmd <> 'SELECT'
    AND policyname <> 'canal_etica_reportar'
    AND coalesce(qual, '') || coalesce(with_check, '') NOT LIKE '%pode_gerir_rh%'
    AND coalesce(qual, '') NOT LIKE '%is_admin%';
  IF _sobra IS NOT NULL THEN
    RAISE EXCEPTION 'rls_escrita_por_papel: policy de escrita sem papel: %', _sobra;
  END IF;
END;
$$;
