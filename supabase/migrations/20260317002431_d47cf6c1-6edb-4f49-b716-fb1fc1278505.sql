
-- Criar tabelas que AINDA não existem

CREATE TABLE IF NOT EXISTS public.batidas_ponto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE RESTRICT,
  empresa_id uuid REFERENCES public.empresas(id),
  data date NOT NULL,
  hora time NOT NULL,
  ordem integer NOT NULL,
  tipo text NOT NULL DEFAULT 'entrada',
  origem text DEFAULT 'manual',
  ajustado boolean DEFAULT false,
  ajustado_por text,
  motivo_ajuste text,
  latitude numeric,
  longitude numeric,
  precisao_metros integer,
  ip_address text,
  dentro_raio boolean,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(colaborador_id, data, ordem)
);
ALTER TABLE public.batidas_ponto ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bp_sel" ON public.batidas_ponto;
CREATE POLICY "bp_sel" ON public.batidas_ponto FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "bp_ins" ON public.batidas_ponto;
CREATE POLICY "bp_ins" ON public.batidas_ponto FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "bp_upd" ON public.batidas_ponto;
CREATE POLICY "bp_upd" ON public.batidas_ponto FOR UPDATE TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "bp_del" ON public.batidas_ponto;
CREATE POLICY "bp_del" ON public.batidas_ponto FOR DELETE TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

CREATE TABLE IF NOT EXISTS public.jornadas_horarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jornada_id uuid NOT NULL REFERENCES public.jornadas(id) ON DELETE CASCADE,
  dia_semana integer NOT NULL,
  entrada time,
  saida time,
  intervalo_inicio time,
  intervalo_fim time,
  dia_util boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(jornada_id, dia_semana)
);
ALTER TABLE public.jornadas_horarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "jh_sel" ON public.jornadas_horarios;
CREATE POLICY "jh_sel" ON public.jornadas_horarios FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "jh_mod" ON public.jornadas_horarios;
CREATE POLICY "jh_mod" ON public.jornadas_horarios FOR ALL TO authenticated USING (true);

-- Views corrigidas

CREATE OR REPLACE VIEW public.vw_batidas_dia AS
SELECT bp.id, bp.colaborador_id, bp.data, bp.hora, bp.ordem, bp.tipo, bp.origem,
  bp.ajustado, bp.latitude, bp.longitude, bp.dentro_raio, bp.empresa_id,
  c.nome_completo, c.foto_url, c.departamento
FROM public.batidas_ponto bp
JOIN public.colaboradores c ON c.id = bp.colaborador_id;

CREATE OR REPLACE VIEW public.vw_ferias_resumo AS
SELECT f.id, f.colaborador_id, f.data_inicio, f.data_fim, f.status,
  f.dias_gozo, f.dias_abono, f.empresa_id,
  c.nome_completo, c.departamento, c.cargo, c.data_admissao
FROM public.ferias f
JOIN public.colaboradores c ON c.id = f.colaborador_id;

CREATE OR REPLACE VIEW public.vw_faltas_mensal AS
SELECT TO_CHAR(f.data, 'YYYY-MM') AS mes, f.empresa_id, f.tipo,
  COUNT(*) AS total, SUM(f.dias_total) AS dias_total,
  COUNT(*) FILTER (WHERE f.justificada = true) AS justificadas,
  COUNT(*) FILTER (WHERE f.justificada = false OR f.justificada IS NULL) AS injustificadas
FROM public.faltas f
GROUP BY TO_CHAR(f.data, 'YYYY-MM'), f.empresa_id, f.tipo;

CREATE OR REPLACE VIEW public.vw_kpi_ponto_resumo AS
SELECT rp.colaborador_id, c.nome_completo, c.empresa_id,
  TO_CHAR(rp.data::date, 'YYYY-MM') AS mes,
  COUNT(*) AS dias_registrados,
  COUNT(*) FILTER (WHERE rp.entrada_1 IS NOT NULL) AS dias_com_entrada,
  COUNT(*) FILTER (WHERE rp.saida_1 IS NOT NULL) AS dias_com_saida
FROM public.registros_ponto rp
JOIN public.colaboradores c ON c.id = rp.colaborador_id
GROUP BY rp.colaborador_id, c.nome_completo, c.empresa_id, TO_CHAR(rp.data::date, 'YYYY-MM');

CREATE OR REPLACE VIEW public.vw_kpi_beneficios_custo AS
SELECT b.tipo, b.empresa_id,
  COUNT(*) AS total_beneficios,
  SUM(COALESCE(b.valor, 0)) AS valor_total,
  SUM(COALESCE(b.valor_empresa, 0)) AS custo_empresa,
  SUM(COALESCE(b.valor_colaborador, 0)) AS custo_colaborador,
  COUNT(DISTINCT b.colaborador_id) AS colaboradores_vinculados
FROM public.beneficios b WHERE b.ativo = true
GROUP BY b.tipo, b.empresa_id;

CREATE OR REPLACE VIEW public.vw_folha_ponto_mensal AS
SELECT rp.colaborador_id, c.nome_completo, c.empresa_id, c.departamento,
  TO_CHAR(rp.data::date, 'YYYY-MM') AS mes_referencia,
  COUNT(*) AS dias_trabalhados,
  COUNT(*) FILTER (WHERE rp.entrada_1 IS NOT NULL AND rp.saida_1 IS NOT NULL) AS dias_completos
FROM public.registros_ponto rp
JOIN public.colaboradores c ON c.id = rp.colaborador_id
GROUP BY rp.colaborador_id, c.nome_completo, c.empresa_id, c.departamento, TO_CHAR(rp.data::date, 'YYYY-MM');
