-- ═══════════════════════════════════════════════════════════════════════════
-- Onda 5 — desligamentos.detalhes_calculo (jsonb)
--
-- Guarda o resultado completo do motor de rescisão (verbas, descontos,
-- informativos) na gravação da rescisão. Sem ele, o TRCT/PDF montado a
-- partir do desligamento salvo exibia totais sem a decomposição das
-- rubricas novas (INSS/IRRF, arts. 479/480, desconto do aviso não
-- cumprido, multa 477, saldo devedor).
--
-- Idempotente (IF NOT EXISTS); coluna nullable — registros antigos
-- continuam válidos com detalhes_calculo = null (PDF cai no mapper de
-- campos legados).
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.desligamentos
  ADD COLUMN IF NOT EXISTS detalhes_calculo jsonb;

COMMENT ON COLUMN public.desligamentos.detalhes_calculo IS
  'Resultado completo do motor de rescisão (RescisaoResult JSON) gravado por rescisaoService.calcularESalvar; alimenta o TRCT/PDF.';
