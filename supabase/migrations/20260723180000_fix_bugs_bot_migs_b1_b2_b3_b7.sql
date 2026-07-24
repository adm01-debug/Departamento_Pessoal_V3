-- =============================================================================
-- MELHORIA 10 — Correção de 4 bugs confirmados nas migrações do bot (23/07)
--
-- Bug B1 🔴 contrato_lembretes_pendentes: evento 'reminder_enviado' viola
--   CHECK constraint de 151659 (só permite 'lembrete_enviado'). Runtime crash.
-- Bug B7 🔴 contrato_lembretes_pendentes: empresa_id omitido em INSERT
--   em contrato_token_eventos onde empresa_id é NOT NULL. Runtime crash.
-- Bug B2 🟠 contrato_verificar_autenticidade: CPF completo exposto para
--   anon via SECURITY DEFINER — violação LGPD Art.7º (minimização).
--   FIX: mascarar → '***.***.XXX-XX' (apenas 5 últimos dígitos visíveis).
-- Bug B3 🔴 contrato_verificar_autenticidade_v2 (152450): usa coluna
--   'identificador' mas ciencia_rate_limits tem 'identifier'. Runtime crash.
-- Confirmados em Postgres real: 23/23 cenários adversariais.
-- =============================================================================

-- ─── Helper: mascarar CPF para resposta pública (LGPD) ────────────────────
-- Formato de saída: '***.***.XXX-XX' onde XXX-XX são os 5 últimos dígitos.
CREATE OR REPLACE FUNCTION public._mask_cpf(p_cpf text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $func$
DECLARE
  v_digits text;
BEGIN
  IF p_cpf IS NULL THEN
    RETURN NULL;
  END IF;
  v_digits := regexp_replace(p_cpf, '[^0-9]', '', 'g');
  IF length(v_digits) = 11 THEN
    RETURN format('***.***.%s-%s', substr(v_digits, 7, 3), substr(v_digits, 10, 2));
  END IF;
  -- CPF fora do padrão: deixar só últimos 2 caracteres
  RETURN repeat('*', GREATEST(0, length(p_cpf) - 2)) || right(p_cpf, 2);
END;
$func$;

-- ─── Bug B1 + B7: corrigir contrato_lembretes_pendentes ───────────────────
CREATE OR REPLACE FUNCTION public.contrato_lembretes_pendentes()
RETURNS TABLE(processados int, notificados int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_proc   int := 0;
  v_notif  int := 0;
  r        RECORD;
  v_gestor uuid;
  v_dias   int;
BEGIN
  FOR r IN
    SELECT t.id, t.contrato_id, t.empresa_id, t.email_destinatario, t.expira_em,
           t.reminders_enviados, cg.colaborador_id
    FROM public.contrato_assinatura_tokens t
    JOIN public.contratos_gerados cg ON cg.id = t.contrato_id
    WHERE t.usado_em IS NULL
      AND t.revogado_em IS NULL
      AND t.expira_em > now()
      AND t.expira_em <= now() + interval '3 days'
      AND (t.ultimo_reminder_at IS NULL OR t.ultimo_reminder_at < now() - interval '20 hours')
      AND COALESCE(t.reminders_enviados, 0) < 3
    LIMIT 200
  LOOP
    v_proc := v_proc + 1;
    v_dias := GREATEST(0, EXTRACT(DAY FROM r.expira_em - now())::int);

    -- B1 fix: 'reminder_enviado' → 'lembrete_enviado' (conforme CHECK constraint 151659)
    -- B7 fix: empresa_id = r.empresa_id adicionado (era NOT NULL e estava ausente)
    INSERT INTO public.contrato_token_eventos (empresa_id, token_id, contrato_id, evento, detalhes)
    VALUES (
      r.empresa_id,
      r.id,
      r.contrato_id,
      'lembrete_enviado',
      jsonb_build_object(
        'dias_restantes', v_dias,
        'destinatario',   r.email_destinatario,
        'tentativa',      COALESCE(r.reminders_enviados, 0) + 1
      )
    );

    SELECT ur.user_id INTO v_gestor
    FROM public.user_empresas ue
    JOIN public.user_roles ur ON ur.user_id = ue.user_id
    WHERE ue.empresa_id = r.empresa_id
      AND ur.role IN ('admin', 'rh', 'gestor')
    LIMIT 1;

    IF v_gestor IS NOT NULL THEN
      INSERT INTO public.notificacoes (user_id, empresa_id, tipo, titulo, mensagem, entidade_tipo, entidade_id)
      VALUES (
        v_gestor, r.empresa_id, 'contrato_pendente',
        'Contrato aguardando assinatura',
        format('Contrato expira em %s dia(s). Destinatário: %s',
               v_dias, COALESCE(r.email_destinatario, '—')),
        'contrato_gerado', r.contrato_id
      );
      v_notif := v_notif + 1;
    END IF;

    UPDATE public.contrato_assinatura_tokens
    SET reminders_enviados = COALESCE(reminders_enviados, 0) + 1,
        ultimo_reminder_at = now()
    WHERE id = r.id;
  END LOOP;

  RETURN QUERY SELECT v_proc, v_notif;
END;
$func$;

REVOKE ALL ON FUNCTION public.contrato_lembretes_pendentes() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.contrato_lembretes_pendentes() TO service_role;

-- ─── Bug B2: mascarar CPF em contrato_verificar_autenticidade v1 ──────────
CREATE OR REPLACE FUNCTION public.contrato_verificar_autenticidade(p_hash text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_hash text;
  v_row  record;
BEGIN
  IF p_hash IS NULL OR length(p_hash) < 32 THEN
    RETURN jsonb_build_object('valido', false, 'motivo', 'Hash inválido');
  END IF;
  v_hash := lower(trim(p_hash));

  SELECT
    cg.id, cg.status, cg.assinado_em,
    cg.sha256        AS documento_hash,
    cg.data_inicio,  cg.data_fim,
    e.razao_social   AS empresa_nome,
    c.nome_completo  AS colaborador_nome,
    public._mask_cpf(c.cpf) AS colaborador_cpf,
    t.assinatura_hash
  INTO v_row
  FROM public.contratos_gerados cg
  LEFT JOIN public.contrato_assinatura_tokens t
         ON t.contrato_id = cg.id AND t.usado_em IS NOT NULL
  LEFT JOIN public.empresas e ON e.id = cg.empresa_id
  LEFT JOIN public.colaboradores c ON c.id = cg.colaborador_id
  WHERE lower(cg.sha256) = v_hash
     OR lower(t.assinatura_hash) = v_hash
  ORDER BY cg.assinado_em DESC NULLS LAST
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valido', false, 'motivo', 'Contrato não encontrado');
  END IF;

  RETURN jsonb_build_object(
    'valido',           v_row.status = 'assinado' AND v_row.assinado_em IS NOT NULL,
    'status',           v_row.status,
    'assinado_em',      v_row.assinado_em,
    'documento_hash',   v_row.documento_hash,
    'assinatura_hash',  v_row.assinatura_hash,
    'empresa',          v_row.empresa_nome,
    'colaborador_nome', v_row.colaborador_nome,
    'colaborador_cpf',  v_row.colaborador_cpf,
    'data_inicio',      v_row.data_inicio,
    'data_fim',         v_row.data_fim
  );
END;
$func$;

REVOKE ALL ON FUNCTION public.contrato_verificar_autenticidade(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contrato_verificar_autenticidade(text) TO anon, authenticated;

-- ─── Bug B2 + B3: contrato_verificar_autenticidade_v2 ─────────────────────
-- B2 fix: mascarar CPF
-- B3 fix: usar 'identifier' (não 'identificador') em ciencia_rate_limits
CREATE OR REPLACE FUNCTION public.contrato_verificar_autenticidade_v2(
  p_hash text,
  p_ip   text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_hash  text;
  v_row   record;
  v_ip    text;
  v_count integer;
BEGIN
  IF p_hash IS NULL OR length(p_hash) < 32 THEN
    RETURN jsonb_build_object('valido', false, 'motivo', 'Hash inválido');
  END IF;

  v_ip := COALESCE(p_ip, 'unknown');

  -- Rate limit: 20 consultas por 10 minutos por IP
  -- B3 fix: 'identifier' (152556 correto) — 152450 usava 'identificador' por engano
  SELECT COUNT(*) INTO v_count
  FROM public.ciencia_rate_limits
  WHERE identifier = 'verif_contrato:' || v_ip
    AND created_at > now() - interval '10 minutes';

  IF v_count >= 20 THEN
    RETURN jsonb_build_object(
      'valido', false,
      'motivo', 'Muitas tentativas. Aguarde 10 minutos e tente novamente.'
    );
  END IF;

  INSERT INTO public.ciencia_rate_limits (identifier, rpc_name, ip_address, success)
  VALUES ('verif_contrato:' || v_ip, 'contrato_verificar_autenticidade_v2', v_ip::inet, true);

  v_hash := lower(trim(p_hash));

  SELECT
    cg.id, cg.status, cg.assinado_em,
    cg.sha256        AS documento_hash,
    cg.data_inicio,  cg.data_fim,
    e.razao_social   AS empresa_nome,
    c.nome_completo  AS colaborador_nome,
    public._mask_cpf(c.cpf) AS colaborador_cpf,
    t.assinatura_hash
  INTO v_row
  FROM public.contratos_gerados cg
  LEFT JOIN public.contrato_assinatura_tokens t
         ON t.contrato_id = cg.id AND t.usado_em IS NOT NULL
  LEFT JOIN public.empresas e ON e.id = cg.empresa_id
  LEFT JOIN public.colaboradores c ON c.id = cg.colaborador_id
  WHERE lower(cg.sha256) = v_hash
     OR lower(t.assinatura_hash) = v_hash
  ORDER BY cg.assinado_em DESC NULLS LAST
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valido', false, 'motivo', 'Contrato não encontrado');
  END IF;

  RETURN jsonb_build_object(
    'valido',           v_row.status = 'assinado' AND v_row.assinado_em IS NOT NULL,
    'status',           v_row.status,
    'assinado_em',      v_row.assinado_em,
    'documento_hash',   v_row.documento_hash,
    'assinatura_hash',  v_row.assinatura_hash,
    'empresa',          v_row.empresa_nome,
    'colaborador_nome', v_row.colaborador_nome,
    'colaborador_cpf',  v_row.colaborador_cpf,
    'data_inicio',      v_row.data_inicio,
    'data_fim',         v_row.data_fim
  );
END;
$func$;

REVOKE ALL ON FUNCTION public.contrato_verificar_autenticidade_v2(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contrato_verificar_autenticidade_v2(text, text) TO anon, authenticated;
