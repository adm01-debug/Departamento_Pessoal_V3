CREATE OR REPLACE FUNCTION public.mcp_query_sql(sql_b64 text, lim integer DEFAULT 500, allow_all_rows boolean DEFAULT false)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ DECLARE decoded_sql text; result json; BEGIN decoded_sql := convert_from(decode(sql_b64, 'base64'), 'UTF8'); IF upper(trim(decoded_sql)) SIMILAR TO '(SELECT|WITH|EXPLAIN|SHOW|TABLE|VALUES)%' THEN EXECUTE format('SELECT json_build_object(''rows'', COALESCE(json_agg(r),''[]''::json)) FROM (%s LIMIT %s) r', decoded_sql, lim) INTO result; ELSE EXECUTE decoded_sql; result := json_build_object('rows', '[]'::json, 'affected', true); END IF; RETURN COALESCE(result, '{"rows":[]}'); EXCEPTION WHEN OTHERS THEN RETURN json_build_object('error', json_build_object('message', SQLERRM, 'code', SQLSTATE)); END; $function$
