#!/usr/bin/env bash
# Exercises tenant isolation and RH write access for guias_fgts_digital (FGTS Digital).
#
# Falha original provada aqui: a unica policy era SELECT para qualquer
# admin/gestor/rh de qualquer empresa (sem empresa_id), e nao havia policy de
# UPDATE -- o botao "Paga" da aba FGTS Digital fazia update afetando 0 linhas e
# a tela relatava sucesso.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIGRATION="$REPO_ROOT/supabase/migrations/20261122041500_guias_fgts_digital_rls_por_empresa.sql"
VERIFY="$REPO_ROOT/supabase/migrations/20261122041500_guias_fgts_digital_rls_por_empresa.verify.sql"
IMAGE="${MIGTEST_IMAGE:-postgres:17-alpine@sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24}"
NAME="dp-guias-fgts-digital-rls-$$"

command -v docker >/dev/null || { echo "docker is required" >&2; exit 1; }
test -f "$MIGRATION" || { echo "migration not found: $MIGRATION" >&2; exit 1; }
test -f "$VERIFY" || { echo "verify not found: $VERIFY" >&2; exit 1; }

cleanup() { [ "${MIGTEST_KEEP:-0}" = "1" ] || docker rm -f -v "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT
run_psql() { docker exec -i "$NAME" psql -X -U postgres -v ON_ERROR_STOP=1 "$@"; }

EMPRESA_A='00000000-0000-4000-8000-0000000000a1'
EMPRESA_B='00000000-0000-4000-8000-0000000000b1'
GESTOR_A='00000000-0000-4000-8000-0000000003f1'
RH_A='00000000-0000-4000-8000-0000000003f2'
RH_B='00000000-0000-4000-8000-0000000003f3'

echo "Starting disposable $IMAGE database: $NAME"
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test "$IMAGE" >/dev/null
bash "$REPO_ROOT/scripts/tests/wait-for-postgres-container.sh" "$NAME"
docker cp "$MIGRATION" "$NAME":/tmp/guias_fgts_digital_rls.sql
docker cp "$VERIFY" "$NAME":/tmp/guias_fgts_digital_rls.verify.sql

# ---- Pre-requisitos equivalentes ao schema canonico + a policy legada aberta.
run_psql <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;

CREATE TYPE public.app_role AS ENUM ('admin','gestor','rh','colaborador');
CREATE TABLE public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, role public.app_role NOT NULL);
CREATE TABLE public.user_empresas (user_id uuid NOT NULL, empresa_id uuid NOT NULL);

CREATE FUNCTION public.get_user_empresas(_user_id uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT empresa_id FROM public.user_empresas WHERE user_id = _user_id
$$;

CREATE FUNCTION public.pode_gerir_rh(_empresa_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_empresas ue
    JOIN public.user_roles ur USING (user_id)
    WHERE ue.user_id = auth.uid() AND ue.empresa_id = _empresa_id
      AND ur.role IN ('admin','rh')
  )
$$;

CREATE TABLE public.guias_fgts_digital (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  competencia text NOT NULL,
  tipo text NOT NULL,
  valor_total numeric(15,2) NOT NULL,
  vencimento date NOT NULL,
  status text DEFAULT 'pendente',
  gfd_protocolo text,
  gfd_data_geracao timestamptz,
  pdf_url text,
  qr_code_pix text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.guias_fgts_digital ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guias_fgts_digital TO authenticated;
GRANT SELECT ON public.user_empresas, public.user_roles TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_empresas(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pode_gerir_rh(uuid) TO authenticated;

CREATE POLICY "Gestores e RH veem guias FGTS" ON public.guias_fgts_digital
  FOR SELECT TO public USING (
    auth.uid() IN (SELECT user_roles.user_id FROM public.user_roles
                   WHERE user_roles.role = ANY (ARRAY['admin'::public.app_role,
                                                     'gestor'::public.app_role,
                                                     'rh'::public.app_role]))
  );

INSERT INTO public.user_empresas VALUES
 ('00000000-0000-4000-8000-0000000003f1','00000000-0000-4000-8000-0000000000a1'),
 ('00000000-0000-4000-8000-0000000003f2','00000000-0000-4000-8000-0000000000a1'),
 ('00000000-0000-4000-8000-0000000003f3','00000000-0000-4000-8000-0000000000b1');
INSERT INTO public.user_roles (user_id, role) VALUES
 ('00000000-0000-4000-8000-0000000003f1','gestor'),
 ('00000000-0000-4000-8000-0000000003f2','rh'),
 ('00000000-0000-4000-8000-0000000003f3','rh');
INSERT INTO public.guias_fgts_digital (empresa_id, competencia, tipo, valor_total, vencimento)
VALUES ('00000000-0000-4000-8000-0000000000a1','2026-10','fgts','100.00','2026-11-07'),
       ('00000000-0000-4000-8000-0000000000b1','2026-10','fgts','200.00','2026-11-07');
SQL

# 1. Reproduz o vazamento antes da correcao: gestor de A enxerga a guia de B.
leak_before="$(run_psql -qAtc "SET ROLE authenticated; SET \"request.jwt.claim.sub\"='$GESTOR_A'; SELECT count(*) FROM public.guias_fgts_digital")"
[ "$leak_before" = '2' ] || { echo "precondition failed: expected cross-tenant leak (2), saw $leak_before" >&2; exit 1; }
echo "reproduced: gestor de A lia $leak_before guias (de A e de B) pela policy aberta"

# 2. O botao "Paga" nao gravava nada antes da correcao (sem policy de UPDATE).
no_update_before="$(run_psql -qAtc "SET ROLE authenticated; SET \"request.jwt.claim.sub\"='$RH_A'; WITH upd AS (UPDATE public.guias_fgts_digital SET status='paga' RETURNING 1) SELECT count(*) FROM upd")"
[ "$no_update_before" = '0' ] || { echo "precondition failed: expected 0 updated rows, saw $no_update_before" >&2; exit 1; }
echo "reproduced: UPDATE de RH afetou $no_update_before linhas (nenhuma policy de UPDATE)"

# 3. A migration precisa falhar fechado sem as funcoes de suporte.
run_psql -c 'CREATE DATABASE guias_missing_prerequisite' >/dev/null
set +e
missing="$(docker exec -i "$NAME" psql -X -U postgres -d guias_missing_prerequisite -v ON_ERROR_STOP=1 -f /tmp/guias_fgts_digital_rls.sql 2>&1)"
missing_status=$?
set -e
if [ "$missing_status" -eq 0 ] || [[ "$missing" != *'does not exist'* ]]; then
  echo 'migration did not fail closed without prerequisites' >&2
  echo "$missing" >&2
  exit 1
fi
echo 'migration fails closed without support functions'

# 4. Duas passadas: a migration precisa ser idempotente.
for pass in 1 2; do
  run_psql -f /tmp/guias_fgts_digital_rls.sql >/dev/null
  echo "migration pass $pass succeeded (idempotent)"
done

# 5. O verify precisa emitir exatamente 'ok'.
verify_out="$(run_psql -qAt -f /tmp/guias_fgts_digital_rls.verify.sql)"
if [ "$verify_out" != 'ok' ]; then
  echo "verify did not return ok: $verify_out" >&2
  exit 1
fi
echo 'verify returned ok'

# 6. Isolamento entre empresas depois da correcao.
count_gestor_a="$(run_psql -qAtc "SET ROLE authenticated; SET \"request.jwt.claim.sub\"='$GESTOR_A'; SELECT count(*) FROM public.guias_fgts_digital")"
[ "$count_gestor_a" = '1' ] || { echo "gestor de A ainda le $count_gestor_a guias" >&2; exit 1; }
forged="$(run_psql -qAtc "SET ROLE authenticated; SET \"request.jwt.claim.sub\"='$GESTOR_A'; SELECT count(*) FROM public.guias_fgts_digital WHERE empresa_id='$EMPRESA_B'")"
[ "$forged" = '0' ] || { echo "gestor de A le guias da empresa B" >&2; exit 1; }
echo 'tenant isolation holds: A nao enxerga B'

# 7. RH da empresa A grava a baixa (antes 0 linhas).
updated="$(run_psql -qAtc "SET ROLE authenticated; SET \"request.jwt.claim.sub\"='$RH_A'; WITH upd AS (UPDATE public.guias_fgts_digital SET status='paga' RETURNING 1) SELECT count(*) FROM upd")"
[ "$updated" = '1' ] || { echo "RH de A updateou $updated linhas (esperado 1)" >&2; exit 1; }
[ "$(run_psql -Atc "SELECT status FROM public.guias_fgts_digital WHERE empresa_id='$EMPRESA_A'")" = 'paga' ]
echo 'RH da empresa A grava a baixa'

# 8. Gestor (sem papel de RH) e RH de outra empresa nao podem baixar nada.
denied="$(run_psql -qAtc "SET ROLE authenticated; SET \"request.jwt.claim.sub\"='$GESTOR_A'; WITH upd AS (UPDATE public.guias_fgts_digital SET status='paga' RETURNING 1) SELECT count(*) FROM upd")"
[ "$denied" = '0' ] || { echo "gestor sem RH de RH editou $denied linhas" >&2; exit 1; }
cross="$(run_psql -qAtc "SET ROLE authenticated; SET \"request.jwt.claim.sub\"='$RH_B'; WITH upd AS (UPDATE public.guias_fgts_digital SET status='paga' WHERE empresa_id='$EMPRESA_A' RETURNING 1) SELECT count(*) FROM upd")"
[ "$cross" = '0' ] || { echo "RH de B editou $cross linhas da empresa A" >&2; exit 1; }
echo 'escrita negada a gestor sem RH e a RH de outra empresa'

# 9. Insert fora da empresa e negado; insert na propria empresa passa.
set +e
outsider="$(run_psql -qAtc "SET ROLE authenticated; SET \"request.jwt.claim.sub\"='$RH_B'; WITH ins AS (INSERT INTO public.guias_fgts_digital (empresa_id,competencia,tipo,valor_total,vencimento) VALUES ('$EMPRESA_A','2026-11','fgts',1,'2026-12-07') RETURNING 1) SELECT count(*) FROM ins" 2>&1)"
outsider_status=$?
set -e
if [ "$outsider_status" -eq 0 ] || [[ "$outsider" != *'row-level security'* ]]; then
  echo "RH de B inseriu guia na empresa A: $outsider" >&2
  exit 1
fi
insider="$(run_psql -qAtc "SET ROLE authenticated; SET \"request.jwt.claim.sub\"='$RH_A'; WITH ins AS (INSERT INTO public.guias_fgts_digital (empresa_id,competencia,tipo,valor_total,vencimento) VALUES ('$EMPRESA_A','2026-11','fgts',1,'2026-12-07') RETURNING 1) SELECT count(*) FROM ins")"
[ "$insider" = '1' ] || { echo "RH de A nao conseguiu inserir na propria empresa" >&2; exit 1; }
echo 'insert escopado a empresa do usuario'

# 10. Delete escopado.
del_cross="$(run_psql -qAtc "SET ROLE authenticated; SET \"request.jwt.claim.sub\"='$RH_B'; WITH del AS (DELETE FROM public.guias_fgts_digital WHERE empresa_id='$EMPRESA_A' RETURNING 1) SELECT count(*) FROM del")"
[ "$del_cross" = '0' ] || { echo "RH de B apagou guias da empresa A" >&2; exit 1; }
echo 'delete escopado a empresa do usuario'

echo 'GUIAS_FGTS_DIGITAL_RLS_OK: vazamento cross-tenant corrigido, SELECT escopado por empresa, escrita restrita a RH e idempotencia validados.'
