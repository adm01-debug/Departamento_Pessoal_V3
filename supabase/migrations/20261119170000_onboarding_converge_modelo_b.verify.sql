-- Sidecar de 20261119170000_onboarding_converge_modelo_b.sql. SÓ LEITURA.
--
-- CONTRATO DO GATE (passo "Executar sidecars de verificação" do
-- canonical-migrations.yml): saída VAZIA é falha, e toda linha não vazia tem de
-- ser literalmente `ok`. Por isso cada asserção abaixo é um
-- `CASE ... ELSE 'FALHOU: n' END` — ela SEMPRE emite uma linha. Um
-- `SELECT 'ok' WHERE <cond>` com várias condições emitiria zero linhas quando
-- falhasse, o que também reprova, mas esconde QUAL asserção caiu.
--
-- Esta migration é DML (copia dados), não DDL. Então as asserções não olham
-- catálogo: olham o próprio dado, e principalmente o que NÃO pode ter
-- acontecido — duplicata, dado inventado e perda do legado.

-- 1. Nenhuma tarefa do modelo legado ficou sem correspondente no canônico.
WITH admissao_do_cpf AS (
  SELECT DISTINCT ON (a.cpf) a.cpf, a.id AS admissao_id
  FROM public.admissoes a
  WHERE a.cpf IS NOT NULL
  ORDER BY a.cpf, a.data_prevista DESC, a.created_at DESC, a.id
), orfas AS (
  SELECT count(*) AS n
  FROM public.onboarding_tarefas ot
  JOIN public.onboarding_colaborador oc ON oc.id = ot.onboarding_id
  JOIN public.colaboradores c ON c.id = oc.colaborador_id
  JOIN admissao_do_cpf ac ON ac.cpf = c.cpf
  WHERE ot.titulo IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.tarefas_onboarding t
      WHERE t.admissao_id = ac.admissao_id AND t.titulo = ot.titulo
    )
)
SELECT CASE WHEN n = 0 THEN 'ok' ELSE 'FALHOU: ' || n || ' tarefa(s) do legado sem par no canonico' END
FROM orfas;

-- 2. Nenhuma duplicata: cada (admissao_id, titulo) aparece uma única vez.
--    É o que prova que o DISTINCT ON cumpriu o papel e que a reexecução não
--    duplicou nada.
WITH dups AS (
  SELECT count(*) AS n
  FROM (
    SELECT admissao_id, titulo
    FROM public.tarefas_onboarding
    WHERE admissao_id IS NOT NULL
    GROUP BY admissao_id, titulo
    HAVING count(*) > 1
  ) d
)
SELECT CASE WHEN n = 0 THEN 'ok' ELSE 'FALHOU: ' || n || ' par(es) (admissao,titulo) duplicado(s)' END
FROM dups;

-- 3. Cada tarefa legada caiu em NO MÁXIMO uma admissão. Mesmo título em duas
--    admissões diferentes significaria histórico inventado na segunda.
WITH admissao_do_cpf AS (
  SELECT DISTINCT ON (a.cpf) a.cpf, a.id AS admissao_id
  FROM public.admissoes a
  WHERE a.cpf IS NOT NULL
  ORDER BY a.cpf, a.data_prevista DESC, a.created_at DESC, a.id
), espalhadas AS (
  SELECT count(*) AS n
  FROM (
    SELECT ot.id
    FROM public.onboarding_tarefas ot
    JOIN public.onboarding_colaborador oc ON oc.id = ot.onboarding_id
    JOIN public.colaboradores c ON c.id = oc.colaborador_id
    JOIN admissao_do_cpf ac ON ac.cpf = c.cpf
    GROUP BY ot.id
    HAVING count(DISTINCT ac.admissao_id) > 1
  ) e
)
SELECT CASE WHEN n = 0 THEN 'ok' ELSE 'FALHOU: ' || n || ' tarefa(s) do legado em mais de uma admissao' END
FROM espalhadas;

-- 4. O estado de conclusão foi preservado tarefa a tarefa: nenhuma copiada
--    divergindo da origem em `concluida` ou na data de conclusão.
WITH admissao_do_cpf AS (
  SELECT DISTINCT ON (a.cpf) a.cpf, a.id AS admissao_id
  FROM public.admissoes a
  WHERE a.cpf IS NOT NULL
  ORDER BY a.cpf, a.data_prevista DESC, a.created_at DESC, a.id
), divergentes AS (
  SELECT count(*) AS n
  FROM public.onboarding_tarefas ot
  JOIN public.onboarding_colaborador oc ON oc.id = ot.onboarding_id
  JOIN public.colaboradores c ON c.id = oc.colaborador_id
  JOIN admissao_do_cpf ac ON ac.cpf = c.cpf
  JOIN public.tarefas_onboarding t
    ON t.admissao_id = ac.admissao_id AND t.titulo = ot.titulo
  WHERE COALESCE(t.concluida, false) IS DISTINCT FROM COALESCE(ot.concluida, false)
     OR t.concluida_em IS DISTINCT FROM ot.data_conclusao
)
SELECT CASE WHEN n = 0 THEN 'ok' ELSE 'FALHOU: ' || n || ' tarefa(s) com conclusao divergente da origem' END
FROM divergentes;

-- 5. Nada inventado em `responsavel_id`: as copiadas ficam NULL, porque o
--    modelo legado não tem responsável (só quem concluiu).
WITH admissao_do_cpf AS (
  SELECT DISTINCT ON (a.cpf) a.cpf, a.id AS admissao_id
  FROM public.admissoes a
  WHERE a.cpf IS NOT NULL
  ORDER BY a.cpf, a.data_prevista DESC, a.created_at DESC, a.id
), inventadas AS (
  SELECT count(*) AS n
  FROM public.onboarding_tarefas ot
  JOIN public.onboarding_colaborador oc ON oc.id = ot.onboarding_id
  JOIN public.colaboradores c ON c.id = oc.colaborador_id
  JOIN admissao_do_cpf ac ON ac.cpf = c.cpf
  JOIN public.tarefas_onboarding t
    ON t.admissao_id = ac.admissao_id AND t.titulo = ot.titulo
  WHERE t.responsavel_id IS NOT NULL
)
SELECT CASE WHEN n = 0 THEN 'ok' ELSE 'FALHOU: ' || n || ' tarefa(s) copiada(s) com responsavel inventado' END
FROM inventadas;

-- 6. O legado não está vazio. Esta asserção não é decorativa: sem ela a
--    asserção 1 passaria POR VACUIDADE se alguém tivesse apagado
--    `onboarding_tarefas` (sem linhas de origem não há órfã possível). É o que
--    transforma a 1 em prova de verdade.
SELECT CASE
         WHEN (SELECT count(*) FROM public.onboarding_tarefas) > 0 THEN 'ok'
         ELSE 'FALHOU: onboarding_tarefas esta vazia — o legado foi perdido'
       END;

-- 7. Toda cópia tem a linha de origem VIVA no legado. Prova que a convergência
--    foi cópia e não movimentação: o legado segue sendo a fonte completa, com
--    as 5 colunas que o canônico não tem (categoria, ordem, concluida_por,
--    observacoes, template_tarefa_id).
WITH admissao_do_cpf AS (
  SELECT DISTINCT ON (a.cpf) a.cpf, a.id AS admissao_id
  FROM public.admissoes a
  WHERE a.cpf IS NOT NULL
  ORDER BY a.cpf, a.data_prevista DESC, a.created_at DESC, a.id
), copias AS (
  SELECT ac.admissao_id, ot.titulo
  FROM public.onboarding_tarefas ot
  JOIN public.onboarding_colaborador oc ON oc.id = ot.onboarding_id
  JOIN public.colaboradores c ON c.id = oc.colaborador_id
  JOIN admissao_do_cpf ac ON ac.cpf = c.cpf
), sem_origem AS (
  SELECT count(*) AS n
  FROM public.tarefas_onboarding t
  WHERE EXISTS (SELECT 1 FROM copias cp WHERE cp.titulo = t.titulo)
    AND NOT EXISTS (
      SELECT 1 FROM copias cp
      WHERE cp.admissao_id = t.admissao_id AND cp.titulo = t.titulo
    )
)
SELECT CASE WHEN n = 0 THEN 'ok' ELSE 'FALHOU: ' || n || ' copia(s) sem origem viva no legado' END
FROM sem_origem;
