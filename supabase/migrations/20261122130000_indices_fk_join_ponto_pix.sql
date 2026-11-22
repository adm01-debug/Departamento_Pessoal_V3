-- Achado da auditoria de 22/11/2026: 34 foreign keys de uma coluna em public
-- nao tem indice na coluna referenciante. A maioria e de autoria
-- (created_by/aprovado_por), que nunca paga join -- mas tres sao de join real
-- e batem em filtro de tenant/dia, que e o caminho quente do relogio de ponto
-- e do pagamento:
--   * ponto_rep_lotes.empresa_id  -> toda consulta do relogio filtra por empresa
--   * ponto_rep_dias.lote_id      -> join do dia ao lote (ingestao e conferencia)
--   * pix_lotes.folha_id          -> join lote de PIX a folha
-- Hoje as tres tabelas estao praticamente vazias (< 100 kB), entao o ganho
-- imediato e zero; o indice existe para o DELETE/UPDATE do lado referenciado
-- (que faz seq scan do lado filho) e para os joins acima nao degradarem
-- conforme o volume do relogio cresce.
-- Aditivo e idempotente: nao altera dados nem policies.
CREATE INDEX IF NOT EXISTS idx_ponto_rep_lotes_empresa_id
  ON public.ponto_rep_lotes (empresa_id);

CREATE INDEX IF NOT EXISTS idx_ponto_rep_dias_lote_id
  ON public.ponto_rep_dias (lote_id);

CREATE INDEX IF NOT EXISTS idx_pix_lotes_folha_id
  ON public.pix_lotes (folha_id);
