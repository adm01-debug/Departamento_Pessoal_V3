-- E50-39/40: fase *expand* do expand-contract de A-025.
--
-- Hoje `colaboradores_cpf_key`/`colaboradores_matricula_key` são UNIQUE
-- globais — a mesma pessoa (mesmo CPF) não pode ser cadastrada em duas
-- empresas do grupo, um bloqueio de negócio real (prestador que atende mais
-- de um cliente, por exemplo).
--
-- E50-39 (medição): como as duas constraints já são globalmente únicas,
-- por definição NÃO EXISTE hoje nenhuma linha duplicada em (empresa_id,cpf)
-- nem (empresa_id,matricula) — alargar de "único no sistema" para "único
-- por empresa" nunca pode colidir com dado existente. Preflight abaixo
-- confirma isso formalmente em vez de assumir.
--
-- Este migration é só a fase *expand*: cria os índices compostos SEM
-- remover as constraints globais antigas. A fase *contract* (E50-42, dropar
-- `colaboradores_cpf_key`/`colaboradores_matricula_key`) fica deliberadamente
-- de fora — o próprio PLANO_50 marca essa etapa como só segura após E50-41
-- (ajuste de aplicação) estar em produção e estável por um ciclo de
-- observação. Até lá, cadastrar a mesma pessoa em duas empresas continua
-- bloqueado pela constraint global antiga, sem mudança de comportamento.

DO $preflight$
DECLARE dup_cpf integer; dup_matricula integer;
BEGIN
  SELECT count(*) INTO dup_cpf FROM (
    SELECT empresa_id, cpf FROM public.colaboradores
    WHERE cpf IS NOT NULL
    GROUP BY empresa_id, cpf HAVING count(*) > 1
  ) c;
  SELECT count(*) INTO dup_matricula FROM (
    SELECT empresa_id, matricula FROM public.colaboradores
    WHERE matricula IS NOT NULL
    GROUP BY empresa_id, matricula HAVING count(*) > 1
  ) m;
  IF dup_cpf > 0 THEN
    RAISE EXCEPTION 'colaboradores tem % grupo(s) duplicado(s) em (empresa_id,cpf) — inesperado dado colaboradores_cpf_key global', dup_cpf;
  END IF;
  IF dup_matricula > 0 THEN
    RAISE EXCEPTION 'colaboradores tem % grupo(s) duplicado(s) em (empresa_id,matricula) — inesperado dado colaboradores_matricula_key global', dup_matricula;
  END IF;
END
$preflight$;

CREATE UNIQUE INDEX IF NOT EXISTS colaboradores_empresa_cpf_key ON public.colaboradores (empresa_id, cpf);
CREATE UNIQUE INDEX IF NOT EXISTS colaboradores_empresa_matricula_key ON public.colaboradores (empresa_id, matricula);
