#!/usr/bin/env bash
# Validates the holerite mirror of folha_itens and the notification trigger fix
# in disposable PostgreSQL.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIGRATION="$REPO_ROOT/supabase/migrations/20261012120000_holerites_espelho_folha_itens.sql"
IMAGE="${MIGTEST_IMAGE:-postgres:17-alpine@sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24}"
NAME="dp-p0-holerite-espelho-$$"

command -v docker >/dev/null || { echo "docker is required" >&2; exit 1; }
test -f "$MIGRATION" || { echo "migration not found: $MIGRATION" >&2; exit 1; }

cleanup() {
  [ "${MIGTEST_KEEP:-0}" = "1" ] || docker rm -f "$NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

run_psql() {
  if [ "$#" -eq 0 ]; then
    docker exec -i "$NAME" psql -X -U postgres -v ON_ERROR_STOP=1
  else
    docker exec "$NAME" psql -X -U postgres -v ON_ERROR_STOP=1 "$@"
  fi
}

q() { run_psql -Atc "$1"; }

expect_eq() {
  local label="$1" got="$2" want="$3"
  [ "$got" = "$want" ] || { echo "$label: expected '$want', got '$got'" >&2; exit 1; }
}

echo "Starting disposable $IMAGE database: $NAME"
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test "$IMAGE" >/dev/null

bash "$REPO_ROOT/scripts/tests/wait-for-postgres-container.sh" "$NAME"

docker cp "$MIGRATION" "$NAME":/tmp/p0-holerite-espelho.sql

# Fixture: the live canonical shape, including the broken notification trigger.
run_psql <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;

CREATE TABLE public.folhas_pagamento (
  id uuid PRIMARY KEY,
  empresa_id uuid,
  competencia text NOT NULL,
  status text NOT NULL DEFAULT 'aberta'
);
CREATE TABLE public.colaboradores (
  id uuid PRIMARY KEY,
  nome_completo text NOT NULL,
  cpf text,
  cargo text,
  departamento text,
  matricula text,
  salario_base numeric
);
CREATE TABLE public.folha_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folha_id uuid NOT NULL REFERENCES public.folhas_pagamento(id),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id),
  salario_base numeric DEFAULT 0,
  total_proventos numeric DEFAULT 0,
  total_descontos numeric DEFAULT 0,
  total_liquido numeric DEFAULT 0,
  fgts_mes numeric DEFAULT 0,
  inss_mes numeric DEFAULT 0,
  irrf_mes numeric DEFAULT 0,
  status_pagamento text DEFAULT 'pendente',
  UNIQUE (folha_id, colaborador_id)
);
CREATE TABLE public.holerites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folha_id uuid NOT NULL REFERENCES public.folhas_pagamento(id),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id),
  colaborador_nome text NOT NULL,
  colaborador_cpf text NOT NULL,
  colaborador_cargo text NOT NULL,
  colaborador_departamento text NOT NULL,
  colaborador_matricula text,
  salario_base numeric NOT NULL,
  total_proventos numeric NOT NULL DEFAULT 0,
  total_descontos numeric NOT NULL DEFAULT 0,
  liquido numeric NOT NULL DEFAULT 0,
  valor_inss numeric DEFAULT 0,
  valor_irrf numeric DEFAULT 0,
  valor_fgts numeric DEFAULT 0,
  assinado boolean DEFAULT false,
  CONSTRAINT holerites_folha_id_colaborador_id_key UNIQUE (folha_id, colaborador_id)
);
CREATE TABLE public.notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  tipo text NOT NULL,
  titulo text NOT NULL,
  mensagem text NOT NULL,
  entidade_tipo text,
  entidade_id uuid,
  lida boolean DEFAULT false,
  empresa_id uuid
);

CREATE FUNCTION public.impedir_alteracao_holerite_assinado() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.assinado THEN RAISE EXCEPTION 'holerite assinado não pode ser alterado'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_impedir_alteracao_holerite_assinado BEFORE UPDATE ON public.holerites
FOR EACH ROW EXECUTE FUNCTION public.impedir_alteracao_holerite_assinado();

-- Versão viva no canônico (20260513191130).
CREATE FUNCTION public.fn_enqueue_notification() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
BEGIN
  IF (TG_TABLE_NAME = 'holerites') THEN
    INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo, lida)
    VALUES (NEW.colaborador_id, 'Novo Holerite Disponível',
            'Seu holerite de ' || NEW.competencia || ' já está disponível para visualização.', 'folha', false);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tr_notify_new_holerite AFTER INSERT ON public.holerites
FOR EACH ROW EXECUTE FUNCTION public.fn_enqueue_notification();

CREATE FUNCTION public.sou_o_colaborador(_colaborador_id uuid) RETURNS boolean LANGUAGE sql STABLE
AS $$ SELECT _colaborador_id = auth.uid() $$;
ALTER TABLE public.holerites ENABLE ROW LEVEL SECURITY;
CREATE POLICY holerites_self_read ON public.holerites FOR SELECT TO authenticated
  USING (public.sou_o_colaborador(colaborador_id));

INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-0000000000a1');
INSERT INTO public.folhas_pagamento (id, empresa_id, competencia, status) VALUES
  ('00000000-0000-0000-0000-000000000f01', '00000000-0000-0000-0000-0000000000e1', '2026-10', 'aberta'),
  ('00000000-0000-0000-0000-000000000f02', '00000000-0000-0000-0000-0000000000e1', '2026-09', 'fechada');
INSERT INTO public.colaboradores (id, nome_completo, cpf, cargo, departamento, matricula, salario_base) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'Ana', '11122233344', 'Analista', 'TI', '001', 3000),
  ('00000000-0000-0000-0000-0000000000b1', 'Bruno', NULL, NULL, NULL, NULL, 2000);
SQL

# Reproduz o bug: com o gatilho vivo, nenhum holerite pode ser gravado.
set +e
before="$(run_psql -c "INSERT INTO public.holerites (folha_id, colaborador_id, colaborador_nome, colaborador_cpf, colaborador_cargo, colaborador_departamento, salario_base) VALUES ('00000000-0000-0000-0000-000000000f01', '00000000-0000-0000-0000-0000000000b1', 'Bruno', 'N/A', 'N/A', 'N/A', 2000)" 2>&1)"
status=$?
set -e
[ "$status" -ne 0 ] && [[ "$before" == *'competencia'* ]] || {
  echo "fixture did not reproduce the live NEW.competencia failure" >&2
  echo "$before" >&2
  exit 1
}

for pass in 1 2; do
  run_psql -f /tmp/p0-holerite-espelho.sql >/dev/null
  echo "migration pass $pass succeeded"
done

F_ABERTA='00000000-0000-0000-0000-000000000f01'
F_FECHADA='00000000-0000-0000-0000-000000000f02'
ANA='00000000-0000-0000-0000-0000000000a1'
BRUNO='00000000-0000-0000-0000-0000000000b1'

# Cálculo cria o holerite espelho com os mesmos totais; sem notificação com a folha aberta.
run_psql -c "INSERT INTO public.folha_itens (folha_id, colaborador_id, salario_base, total_proventos, total_descontos, total_liquido, fgts_mes, inss_mes, irrf_mes) VALUES
  ('$F_ABERTA', '$ANA', 3000, 3200.50, 450.25, 2750.25, 256.04, 300, 150.25),
  ('$F_ABERTA', '$BRUNO', NULL, 2000, 160, 1840, 160, 160, 0)" >/dev/null
expect_eq 'holerites criados' "$(q "SELECT count(*) FROM public.holerites WHERE folha_id = '$F_ABERTA'")" 2
expect_eq 'totais espelhados' \
  "$(q "SELECT total_proventos||'|'||total_descontos||'|'||liquido||'|'||valor_fgts||'|'||valor_inss||'|'||valor_irrf FROM public.holerites WHERE colaborador_id = '$ANA'")" \
  '3200.50|450.25|2750.25|256.04|300|150.25'
expect_eq 'cadastro ausente vira N/A e salário do colaborador' \
  "$(q "SELECT colaborador_cpf||'|'||colaborador_cargo||'|'||salario_base FROM public.holerites WHERE colaborador_id = '$BRUNO'")" \
  'N/A|N/A|2000'
expect_eq 'sem notificação antes do fechamento' "$(q 'SELECT count(*) FROM public.notificacoes')" 0

# Recálculo atualiza o espelho.
run_psql -c "UPDATE public.folha_itens SET total_proventos = 3300.50, total_liquido = 2850.25 WHERE colaborador_id = '$ANA'" >/dev/null
expect_eq 'recálculo espelhado' "$(q "SELECT total_proventos||'|'||liquido FROM public.holerites WHERE colaborador_id = '$ANA'")" '3300.50|2850.25'

# Holerite assinado não é reescrito nem quebra o recálculo.
run_psql -c "UPDATE public.holerites SET assinado = true WHERE colaborador_id = '$ANA'" >/dev/null
run_psql -c "UPDATE public.folha_itens SET total_proventos = 9999 WHERE colaborador_id = '$ANA'" >/dev/null
expect_eq 'assinado preservado' "$(q "SELECT total_proventos FROM public.holerites WHERE colaborador_id = '$ANA'")" '3300.50'

# Mudar só status_pagamento não recria holerite.
run_psql -c "DELETE FROM public.holerites WHERE colaborador_id = '$BRUNO'" >/dev/null
run_psql -c "UPDATE public.folha_itens SET status_pagamento = 'pago' WHERE colaborador_id = '$BRUNO'" >/dev/null
expect_eq 'status_pagamento não dispara' "$(q "SELECT count(*) FROM public.holerites WHERE colaborador_id = '$BRUNO'")" 0

# Remover o item remove o holerite não assinado.
run_psql -c "UPDATE public.folha_itens SET total_liquido = 1841 WHERE colaborador_id = '$BRUNO'" >/dev/null
expect_eq 'item volta a espelhar' "$(q "SELECT count(*) FROM public.holerites WHERE colaborador_id = '$BRUNO'")" 1
run_psql -c "DELETE FROM public.folha_itens WHERE colaborador_id = '$BRUNO'" >/dev/null
expect_eq 'delete espelhado' "$(q "SELECT count(*) FROM public.holerites WHERE colaborador_id = '$BRUNO'")" 0

# Folha fechada é imutável para o espelho.
run_psql -c "INSERT INTO public.folha_itens (folha_id, colaborador_id, total_proventos, total_liquido) VALUES ('$F_FECHADA', '$BRUNO', 10, 10)" >/dev/null
expect_eq 'folha fechada sem espelho' "$(q "SELECT count(*) FROM public.holerites WHERE folha_id = '$F_FECHADA'")" 0

# Notificação: só folha fechada/paga e só quando o colaborador tem login; nunca bloqueia.
run_psql -c "INSERT INTO public.holerites (folha_id, colaborador_id, colaborador_nome, colaborador_cpf, colaborador_cargo, colaborador_departamento, salario_base) VALUES
  ('$F_FECHADA', '$ANA', 'Ana', '111', 'A', 'TI', 3000),
  ('$F_FECHADA', '$BRUNO', 'Bruno', 'N/A', 'N/A', 'N/A', 2000)" >/dev/null
expect_eq 'notificação do colaborador com login' \
  "$(q "SELECT user_id||'|'||mensagem||'|'||entidade_tipo FROM public.notificacoes")" \
  "$ANA|Seu holerite de 09/2026 já está disponível para visualização.|holerite"

# Leitura própria exige folha fechada ou paga.
qual="$(q "SELECT qual FROM pg_policies WHERE tablename = 'holerites' AND policyname = 'holerites_self_read'")"
[[ "$qual" == *'sou_o_colaborador'* && "$qual" == *'fechada'* && "$qual" == *'paga'* ]] || {
  echo "holerites_self_read does not require a closed payroll: $qual" >&2
  exit 1
}

expect_eq 'trigger function not executable by authenticated' \
  "$(q "SELECT has_function_privilege('authenticated', 'public.fn_sync_holerite_from_folha_item()', 'EXECUTE')")" f

# Pré-condição fail-closed: sem a chave única o ON CONFLICT não tem alvo.
run_psql -c 'CREATE DATABASE p0_holerite_sem_chave' >/dev/null
docker exec -i "$NAME" psql -X -U postgres -d p0_holerite_sem_chave -v ON_ERROR_STOP=1 >/dev/null <<'SQL'
CREATE TABLE public.folhas_pagamento (id uuid PRIMARY KEY);
CREATE TABLE public.colaboradores (id uuid PRIMARY KEY);
CREATE TABLE public.folha_itens (id uuid PRIMARY KEY);
CREATE TABLE public.notificacoes (id uuid PRIMARY KEY);
CREATE TABLE public.holerites (id uuid PRIMARY KEY, folha_id uuid, colaborador_id uuid);
SQL
set +e
missing="$(docker exec -i "$NAME" psql -X -U postgres -d p0_holerite_sem_chave -v ON_ERROR_STOP=1 -f /tmp/p0-holerite-espelho.sql 2>&1)"
status=$?
set -e
[ "$status" -ne 0 ] && [[ "$missing" == *'requires UNIQUE (folha_id, colaborador_id)'* ]] || {
  echo "expected fail-closed precondition error" >&2
  echo "$missing" >&2
  exit 1
}

echo 'P0_HOLERITE_ESPELHO_MIGRATION_OK: reproduced the live trigger failure, validated mirror insert/update/delete, signed and closed-payroll immutability, notification gating, self-read policy and fail-closed precondition.'
