-- Achado da auditoria de 22/11/2026: vincular() (logica.ts) só checa se a
-- chave (CPF/PIS/matrícula) aponta para UM colaborador -- nunca se aquele
-- colaborador_id já está vinculado a OUTRO funcionario_codigo do relógio.
-- Confirmado ao vivo: 3 códigos de funcionário diferentes com o mesmo CPF
-- normalizado vincularam ao MESMO colaborador no mesmo lote, sem aviso.
-- Cenário real: código de ponto reaproveitado (funcionário desligado e
-- reaproveitado no REP) mistura o histórico de duas pessoas no mesmo
-- colaborador.
--
-- Fix na causa raiz: um colaborador só pode estar vinculado a um
-- funcionario_codigo por vez, dentro da empresa (índice único parcial,
-- vale tanto para duas linhas do mesmo lote quanto de lotes/dispositivos
-- diferentes). A edge function (index.ts) passa a tratar a violação desse
-- índice como "ambíguo, fica pendente" em vez de abortar o lote inteiro.
CREATE UNIQUE INDEX IF NOT EXISTS ux_ponto_rep_funcionarios_colaborador_por_empresa
  ON public.ponto_rep_funcionarios (empresa_id, colaborador_id)
  WHERE colaborador_id IS NOT NULL;
