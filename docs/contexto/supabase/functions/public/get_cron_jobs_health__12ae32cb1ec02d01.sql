CREATE OR REPLACE FUNCTION public.get_cron_jobs_health()
 RETURNS TABLE(jobname text, schedule text, active boolean, last_run timestamp with time zone, last_status text, last_duration_ms numeric, last_error text, runs_24h bigint, failures_24h bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'cron'
AS $function$
  WITH last_runs AS (
    SELECT DISTINCT ON (jobid)
      jobid, status, return_message, start_time, end_time
    FROM cron.job_run_details
    ORDER BY jobid, start_time DESC
  ),
  agg AS (
    SELECT jobid,
           count(*)::bigint AS runs_24h,
           count(*) FILTER (WHERE status <> 'succeeded')::bigint AS failures_24h
    FROM cron.job_run_details
    WHERE start_time > now() - interval '24 hours'
    GROUP BY jobid
  )
  SELECT j.jobname,
         j.schedule,
         j.active,
         lr.start_time,
         lr.status,
         CASE WHEN lr.end_time IS NOT NULL AND lr.start_time IS NOT NULL
              THEN EXTRACT(EPOCH FROM (lr.end_time - lr.start_time)) * 1000
              ELSE NULL END,
         CASE WHEN lr.status <> 'succeeded' THEN substring(lr.return_message, 1, 300) ELSE NULL END,
         COALESCE(a.runs_24h, 0),
         COALESCE(a.failures_24h, 0)
  FROM cron.job j
  LEFT JOIN last_runs lr ON lr.jobid = j.jobid
  LEFT JOIN agg a ON a.jobid = j.jobid
  WHERE j.jobname LIKE 'lovable-%'
    AND public.has_role(auth.uid(), 'admin'::app_role)
  ORDER BY j.jobname;
$function$
