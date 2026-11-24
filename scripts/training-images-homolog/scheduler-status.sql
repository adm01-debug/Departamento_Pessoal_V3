-- =============================================================================
-- STATUS DO AGENDAMENTO (somente leitura)
-- =============================================================================

-- Job configurado?
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'training-image-dispatch';

-- Últimas execuções (sucesso/erro e duração)
SELECT jobid, runid, status, return_message,
       start_time, end_time
FROM cron.job_run_details
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname = 'training-image-dispatch')
ORDER BY start_time DESC
LIMIT 20;

-- Fila por status
SELECT status, count(*) AS total, min(requested_at) AS mais_antiga
FROM public.training_image_requests
GROUP BY status
ORDER BY status;

-- Resultado desconhecido pendente de reconciliação
SELECT empresa_id, content_type, content_id, operation_id, unknown_outcomes, last_error
FROM public.training_images
WHERE unknown_outcomes > 0
  AND reconciled_at IS NULL
ORDER BY updated_at DESC;
