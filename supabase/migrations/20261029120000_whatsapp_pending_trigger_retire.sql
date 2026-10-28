-- ---------------------------------------------------------------------------
-- Retira a fila fake whatsapp_mensagens_logs.status='pending_trigger'
--
-- Contexto (achado LEVANTAMENTO_PENDENCIAS_2026-10-12 #15): o trigger
-- tr_whatsapp_on_new_hiring enfileirava um "aviso de admissão" a cada INSERT
-- em colaboradores, mas nenhum worker consumia a fila — 13 linhas presas em
-- produção. Além disso a linha não carrega mensagem nem template: nunca houve
-- um conteúdo definido para enviar.
--
-- O aviso de admissão real já é coberto pelo fluxo direto: o RH dispara
-- contratacaoService.enviarWhatsApp → edge whatsapp-send → Evolution API, que
-- registra a linha de log já com status final ('sent'/'failed'). A fila
-- pending_trigger é, portanto, redundante: o fix honesto é parar de produzir
-- e fechar o backlog — sem inventar envio de "boas-vindas" meses depois da
-- admissão.
-- ---------------------------------------------------------------------------

-- 1) Para de produzir: dropa o trigger e a função que só servia a ele.
DROP TRIGGER IF EXISTS tr_whatsapp_on_new_hiring ON public.colaboradores;
DROP FUNCTION IF EXISTS public.fn_trigger_whatsapp_on_event();

-- 2) Tombstone append-only do backlog: whatsapp_mensagens_logs não aceita
--    UPDATE/DELETE (trg_*_no_update/no_delete via audit_log_append_only()),
--    então cada pendência ainda aberta recebe uma linha sucessora 'cancelled'
--    citando a linha de origem. Idempotente: o NOT EXISTS mira só a sucessora
--    desta operação (um 'sent'/'failed' legítimo posterior do mesmo
--    colaborador não pula o fechamento da pendência).
INSERT INTO public.whatsapp_mensagens_logs
  (empresa_id, colaborador_id, telefone, template_id, status, error_message)
SELECT
  p.empresa_id,
  p.colaborador_id,
  p.telefone,
  p.template_id,
  'cancelled',
  'fila pending_trigger descontinuada (backlog nunca enviado; aviso de admissão segue pelo envio direto whatsapp-send). origem: ' || p.id
FROM public.whatsapp_mensagens_logs p
WHERE p.status = 'pending_trigger'
  AND NOT EXISTS (
    SELECT 1
    FROM public.whatsapp_mensagens_logs s
    WHERE s.status = 'cancelled'
      AND s.error_message LIKE '%origem: ' || p.id || '%'
  );
