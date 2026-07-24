-- Issue 45: Adiciona índices ausentes em escalas_trabalho.
--
-- escalas_trabalho tem turno_id UUID FK → turnos sem índice correspondente.
-- turnoService.ts:42 realiza JOIN escalas_trabalho → turnos em cada lookup
-- de escala — sem índice cada join exige seq scan de escalas_trabalho (O(n)).
--
-- Adicionalmente, escalas_trabalho tem coluna data DATE sem índice composto
-- por (empresa_id, data). Consultas de escala por data/período (muito comuns
-- em ponto eletrônico) exigem full table scan.

-- Índice para JOIN turno_id
CREATE INDEX IF NOT EXISTS idx_escalas_trabalho_turno_id
  ON public.escalas_trabalho (turno_id);

-- Índice para consultas por data e empresa
CREATE INDEX IF NOT EXISTS idx_escalas_trabalho_empresa_data
  ON public.escalas_trabalho (empresa_id, data);

-- Índice adicional para consultas por colaborador + data (ponto diário)
CREATE INDEX IF NOT EXISTS idx_escalas_trabalho_colaborador_data
  ON public.escalas_trabalho (colaborador_id, data);
