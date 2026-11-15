-- Sidecar de 20261025090000_ninebox_aprovacao_autoria.sql
-- Prova o ESTADO-ALVO da migration:
--   1. public.decidir_aprovacao_gestor(uuid,uuid,text,text,text) existe uma unica
--      vez, em plpgsql, SECURITY DEFINER, com search_path fixo e retorno jsonb;
--   2. executavel SOMENTE por authenticated (sem PUBLIC, sem anon);
--   3. a AUTORIA do feedback NAO bloqueia a aprovacao: nao existe no corpo
--      nenhuma barreira comparando o autor/avaliador do feedback com auth.uid();
--   4. seguem de pe os controles que a migration preserva: papel via
--      pode_aprovar_colaborador, empresa via get_user_empresas, consolidacao
--      travada FOR UPDATE com fallback de sincronizacao, guarda de versao,
--      registro de referencia que PRIORIZA mas nao EXIGE tipo='gestor',
--      composicao 360 60/25/10/5 com fallback na proposta do RH, e escrita
--      transacional em aprovacoes_gestor + consolidacoes + audit_log + operacoes.
-- Nao fixa prosrc/md5: o alvo e o comportamento. O canonico pode conter
-- hardening posterior (guardas extras de empresa/ciclo e recheck de versao) que
-- esta migration nao remove, e fixar o texto exato reprovaria esse hardening.

-- 1 · assinatura unica e shape da funcao
SELECT 'ok' WHERE (
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'decidir_aprovacao_gestor') = 1
  AND EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     JOIN pg_language l ON l.oid = p.prolang
    WHERE n.nspname = 'public' AND p.proname = 'decidir_aprovacao_gestor'
      AND pg_get_function_identity_arguments(p.oid) = 'p_colaborador_id uuid, p_ciclo_id uuid, p_decisao text, p_justificativa text, p_idempotencia text'
      AND pg_get_function_result(p.oid) = 'jsonb'
      AND l.lanname = 'plpgsql'
      AND p.prosecdef
      AND p.provolatile = 'v'
      AND p.proconfig @> ARRAY['search_path=public, pg_temp']
  )
);

-- 2 · privilegio: nada para PUBLIC/anon, execute para authenticated
SELECT 'ok' WHERE (
  has_function_privilege('authenticated', 'public.decidir_aprovacao_gestor(uuid,uuid,text,text,text)', 'execute')
  AND NOT has_function_privilege('anon', 'public.decidir_aprovacao_gestor(uuid,uuid,text,text,text)', 'execute')
  AND NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace,
         aclexplode(p.proacl) a
    WHERE n.nspname = 'public' AND p.proname = 'decidir_aprovacao_gestor'
      AND a.grantee = 0
  )
);

-- 3 · EFEITO CENTRAL: autoria do feedback nao bloqueia a decisao.
--     Assertado pelos DOIS lados. Positivo: o corpo em producao tem os rotulos
--     de erro que ESTA migration introduz/renomeia (sem_avaliacao,
--     versao_desatualizada, avaliacao_consolidada_ausente, idempotencia_conflito)
--     e NAO tem mais os rotulos das versoes anteriores da funcao
--     (avaliacao_do_gestor_ausente e avaliacao_nao_concluida, da 20261017/21).
--     Negativo: nenhuma barreira de autoria restou.
--     Sem o lado positivo este assert passaria contra a versao anterior da
--     funcao, porque a barreira de autoria nunca existiu no repo.
SELECT 'ok' WHERE (
  EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'decidir_aprovacao_gestor'
      AND p.prosrc LIKE '%sem_avaliacao%'
      AND p.prosrc LIKE '%versao_desatualizada%'
      AND p.prosrc LIKE '%avaliacao_consolidada_ausente%'
      AND p.prosrc LIKE '%idempotencia_conflito%'
      AND p.prosrc NOT LIKE '%avaliacao_do_gestor_ausente%'
      AND p.prosrc NOT LIKE '%avaliacao_nao_concluida%'
      AND p.prosrc NOT ILIKE '%avaliador_id%'
      AND p.prosrc NOT ILIKE '%autoria_conflito%'
      AND p.prosrc NOT ILIKE '%nao_pode_aprovar_proprio%'
      AND p.prosrc NOT ILIKE '%segregacao%'
  )
);

-- 4 · permissao preservada: papel/vinculo e empresa
SELECT 'ok' WHERE (
  EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'decidir_aprovacao_gestor'
      AND p.prosrc LIKE '%public.pode_aprovar_colaborador(p_colaborador_id)%'
      AND p.prosrc LIKE '%perfil_nao_autorizado%'
      AND p.prosrc LIKE '%public.get_user_empresas(v_uid)%'
      AND p.prosrc LIKE '%nao_autorizado%'
      AND p.prosrc LIKE '%nao_autenticado%'
      AND p.prosrc LIKE '%idempotencia_ausente%'
      AND p.prosrc LIKE '%decisao_invalida%'
      AND p.prosrc LIKE '%justificativa_obrigatoria%'
  )
);

-- 5 · consolidacao e a chave da decisao, travada e sincronizavel
SELECT 'ok' WHERE (
  EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'decidir_aprovacao_gestor'
      AND p.prosrc LIKE '%from public.feedbacks_360_consolidacoes c%'
      AND p.prosrc LIKE '%for update%'
      AND p.prosrc LIKE '%public.sincronizar_consolidacao_avaliacao(p_colaborador_id, p_ciclo_id, v_uid)%'
      AND p.prosrc LIKE '%consolidacao_ausente%'
  )
);

-- 6 · guarda de versao consolidada
SELECT 'ok' WHERE (
  EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'decidir_aprovacao_gestor'
      AND p.prosrc LIKE '%public.versao_consolidada_avaliacao(p_colaborador_id, p_ciclo_id)%'
      AND p.prosrc LIKE '%versao_desatualizada%'
      AND p.prosrc LIKE '%sem_avaliacao%'
  )
);

-- 7 · registro de referencia PRIORIZA tipo='gestor' sem exigi-lo
SELECT 'ok' WHERE (
  EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'decidir_aprovacao_gestor'
      AND p.prosrc LIKE '%order by (lower(btrim(coalesce(f.tipo, ''''))) = ''gestor'') desc%'
      AND p.prosrc LIKE '%avaliacao_consolidada_ausente%'
      AND p.prosrc NOT LIKE '%and lower(btrim(coalesce(f.tipo, ''''))) = ''gestor''%'
      AND p.prosrc NOT ILIKE '%avaliacao_do_gestor_ausente%'
  )
);

-- 8 · composicao 360 (60/25/10/5) com fallback na proposta consolidada do RH
SELECT 'ok' WHERE (
  EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'decidir_aprovacao_gestor'
      AND p.prosrc LIKE '%when ''gestor'' then 0.60%'
      AND p.prosrc LIKE '%when ''par'' then 0.25%'
      AND p.prosrc LIKE '%when ''auto'' then 0.10%'
      AND p.prosrc LIKE '%when ''subordinado'' then 0.05%'
      AND p.prosrc LIKE '%v_desempenho := v_soma_notas / v_soma_pesos%'
      AND p.prosrc LIKE '%avaliacao_sem_desempenho%'
      AND p.prosrc LIKE '%avaliacao_sem_potencial%'
  )
);

-- 9 · snapshot aprovado, regra aplicada e status resultante
SELECT 'ok' WHERE (
  EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'decidir_aprovacao_gestor'
      AND p.prosrc LIKE '%''regra'', case when v_tem_gestor then ''360_gestor'' else ''proposta_consolidada_rh'' end%'
      AND p.prosrc LIKE '%v_status := ''aprovada_gestor''%'
      AND p.prosrc LIKE '%v_status := ''devolvida''%'
  )
);

-- 10 · decisao so entra quando a pendencia aguarda o gestor
SELECT 'ok' WHERE (
  EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'decidir_aprovacao_gestor'
      AND p.prosrc LIKE '%public.situacao_aprovacao(p_colaborador_id, p_ciclo_id) not in (''aguardando_gestor'', ''sem_gestor'')%'
      AND p.prosrc LIKE '%pendencia_nao_aguarda_decisao%'
  )
);

-- 11 · idempotencia por chave + hash dos parametros
SELECT 'ok' WHERE (
  EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'decidir_aprovacao_gestor'
      AND p.prosrc LIKE '%v_chave := ''decidir_aprovacao:''%'
      AND p.prosrc LIKE '%idempotencia_conflito%'
      AND p.prosrc LIKE '%jsonb_build_object(''idempotente'', true)%'
      AND p.prosrc LIKE '%on conflict (idempotency_key) do nothing%'
  )
);

-- 12 · escrita transacional: aprovacao + consolidacao + auditoria + operacao
SELECT 'ok' WHERE (
  EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'decidir_aprovacao_gestor'
      AND p.prosrc LIKE '%insert into public.feedbacks_360_aprovacoes_gestor%'
      AND p.prosrc LIKE '%update public.feedbacks_360_consolidacoes%'
      AND p.prosrc LIKE '%snapshot_aprovado = v_snapshot%'
      AND p.prosrc LIKE '%insert into public.audit_log%'
      AND p.prosrc LIKE '%insert into public.feedbacks_360_operacoes%'
      AND p.prosrc LIKE '%''decidir_aprovacao_gestor'', v_hash, v_resultado%'
  )
);
