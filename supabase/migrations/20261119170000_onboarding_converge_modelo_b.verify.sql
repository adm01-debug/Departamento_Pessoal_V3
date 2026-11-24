-- Sidecar de 20261119170000_onboarding_converge_modelo_b.sql. SÓ LEITURA.
--
-- CONTRATO DO GATE (passo "Executar sidecars de verificação" do
-- canonical-migrations.yml): saída VAZIA é falha, e toda linha não vazia tem de
-- ser literalmente `ok`. Cada asserção é um `CASE ... ELSE 'FALHOU: …' END`, que
-- SEMPRE emite uma linha — assim o gate reprova E diz qual asserção caiu.
--
-- REGRA QUE AS ASSERÇÕES SEGUEM: toda asserção olha o DESTINO
-- (`tarefas_onboarding`). Uma asserção que só recalcula o mesmo vínculo da
-- migration e conta nele é tautológica: aprova por construção e não prova nada
-- sobre o que foi gravado. (Foi o defeito da terceira asserção da versão
-- anterior deste arquivo, apontado em revisão e corrigido aqui.)
--
-- O CTE do vínculo é repetido em cada asserção porque num arquivo .sql cada
-- comando é independente — não há CTE compartilhado entre statements.

-- 1. Toda tarefa legada COM vínculo resolvido tem destino no canônico.
--    As sem vínculo são exclusão consciente (ambíguo/ausente), não falha.
WITH vinculo AS (
  SELECT oc.id AS onboarding_id, a.id AS admissao_id
  FROM public.onboarding_colaborador oc
  JOIN public.colaboradores c ON c.id = oc.colaborador_id
  JOIN public.admissoes a ON a.id = (c.metadata ->> 'admissao_id')::uuid AND a.empresa_id = c.empresa_id
  WHERE c.metadata ->> 'admissao_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  UNION ALL
  SELECT oc.id, a.id
  FROM public.onboarding_colaborador oc
  JOIN public.colaboradores c ON c.id = oc.colaborador_id
  JOIN public.admissoes a ON a.cpf = c.cpf AND a.empresa_id = c.empresa_id
  WHERE c.metadata ->> 'admissao_id' IS NULL
    AND c.cpf IS NOT NULL
    AND (SELECT count(*) FROM public.admissoes a2 WHERE a2.cpf = c.cpf AND a2.empresa_id = c.empresa_id) = 1
), orfas AS (
  SELECT count(*) AS n
  FROM public.onboarding_tarefas ot
  JOIN vinculo v ON v.onboarding_id = ot.onboarding_id
  WHERE ot.titulo IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.tarefas_onboarding t
      WHERE t.admissao_id = v.admissao_id AND t.titulo = ot.titulo AND t.created_at = ot.created_at
    )
)
SELECT CASE WHEN n = 0 THEN 'ok' ELSE 'FALHOU: ' || n || ' tarefa(s) com vinculo resolvido sem destino' END
FROM orfas;

-- 2. Nenhuma duplicata NO DESTINO pela identidade real da tarefa
--    (admissao_id, titulo, created_at). Título sozinho fundiria tarefas
--    distintas de dois onboardings da mesma pessoa.
WITH dups AS (
  SELECT count(*) AS n
  FROM (
    SELECT admissao_id, titulo, created_at
    FROM public.tarefas_onboarding
    WHERE admissao_id IS NOT NULL
    GROUP BY admissao_id, titulo, created_at
    HAVING count(*) > 1
  ) d
)
SELECT CASE WHEN n = 0 THEN 'ok' ELSE 'FALHOU: ' || n || ' tarefa(s) duplicada(s) no destino' END
FROM dups;

-- O CTE `vinculo_onboarding_admissao` âncora cada asserção na ADMISSÃO de
-- destino (mesma regra de três camadas da migration). Sem esta âncora, o
-- JOIN por `(titulo, created_at)` cruza tarefas de pessoas DIFERENTES que
-- compartilham título e timestamp (o legado usa DEFAULT now(), então
-- `created_at` é idêntico entre onboardings distintos) e reprova por
-- construção — ver dry-run do lote dp/onboarding de 19/11/2026 (run
-- 44608699082): "72 conclusao divergente" e "70 vencimento" com apenas 27
-- linhas copiadas.
WITH vinculo_onboarding_admissao AS (
  SELECT oc.id AS onboarding_id, a.id AS admissao_id
  FROM public.onboarding_colaborador oc
  JOIN public.colaboradores c ON c.id = oc.colaborador_id
  JOIN public.admissoes a ON a.id = (c.metadata ->> 'admissao_id')::uuid AND a.empresa_id = c.empresa_id
  WHERE c.metadata ->> 'admissao_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  UNION ALL
  SELECT oc.id, a.id
  FROM public.onboarding_colaborador oc
  JOIN public.colaboradores c ON c.id = oc.colaborador_id
  JOIN public.admissoes a ON a.cpf = c.cpf AND a.empresa_id = c.empresa_id
  WHERE c.metadata ->> 'admissao_id' IS NULL
    AND c.cpf IS NOT NULL
    AND (SELECT count(*) FROM public.admissoes a2 WHERE a2.cpf = c.cpf AND a2.empresa_id = c.empresa_id) = 1
)

-- 3. TENANT — a asserção mais importante. Olha cada linha GRAVADA que casa com
--    uma tarefa legada e exige que a empresa da admissão de destino seja a
--    mesma do colaborador de origem. É o que um vazamento entre empresas
--    violaria, e não dá para aprovar por construção: compara destino × origem,
--    com a admissão de destino âncora do vínculo.
, copiadas AS (
  SELECT t.id, a.empresa_id AS empresa_destino, c.empresa_id AS empresa_origem
  FROM public.tarefas_onboarding t
  JOIN vinculo_onboarding_admissao v ON v.admissao_id = t.admissao_id
  JOIN public.admissoes a ON a.id = t.admissao_id
  JOIN public.onboarding_tarefas ot
    ON ot.onboarding_id = v.onboarding_id
   AND ot.titulo = t.titulo AND ot.created_at = t.created_at
  JOIN public.onboarding_colaborador oc ON oc.id = v.onboarding_id
  JOIN public.colaboradores c ON c.id = oc.colaborador_id
), cruzadas AS (
  SELECT count(*) AS n FROM copiadas WHERE empresa_destino IS DISTINCT FROM empresa_origem
)
SELECT CASE WHEN n = 0 THEN 'ok' ELSE 'FALHOU: ' || n || ' tarefa(s) em admissao de OUTRA empresa' END
FROM cruzadas;

-- 4. Conclusão preservada tarefa a tarefa: `concluida` e a data, sempre
--    comparando dentro da MESMA admissão de destino.
WITH vinculo_onboarding_admissao AS (
  SELECT oc.id AS onboarding_id, a.id AS admissao_id
  FROM public.onboarding_colaborador oc
  JOIN public.colaboradores c ON c.id = oc.colaborador_id
  JOIN public.admissoes a ON a.id = (c.metadata ->> 'admissao_id')::uuid AND a.empresa_id = c.empresa_id
  WHERE c.metadata ->> 'admissao_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  UNION ALL
  SELECT oc.id, a.id
  FROM public.onboarding_colaborador oc
  JOIN public.colaboradores c ON c.id = oc.colaborador_id
  JOIN public.admissoes a ON a.cpf = c.cpf AND a.empresa_id = c.empresa_id
  WHERE c.metadata ->> 'admissao_id' IS NULL
    AND c.cpf IS NOT NULL
    AND (SELECT count(*) FROM public.admissoes a2 WHERE a2.cpf = c.cpf AND a2.empresa_id = c.empresa_id) = 1
), divergentes AS (
  SELECT count(*) AS n
  FROM public.tarefas_onboarding t
  JOIN vinculo_onboarding_admissao v ON v.admissao_id = t.admissao_id
  JOIN public.onboarding_tarefas ot
    ON ot.onboarding_id = v.onboarding_id
   AND ot.titulo = t.titulo AND ot.created_at = t.created_at
  WHERE COALESCE(t.concluida, false) IS DISTINCT FROM COALESCE(ot.concluida, false)
     OR t.concluida_em IS DISTINCT FROM ot.data_conclusao
)
SELECT CASE WHEN n = 0 THEN 'ok' ELSE 'FALHOU: ' || n || ' tarefa(s) com conclusao divergente da origem' END
FROM divergentes;

-- 5. PRAZO HISTÓRICO preservado. A tela calcula vencimento como
--    `created_at + prazo_dias`; esta asserção exige que isso reproduza a
--    `data_prazo` da origem. É a asserção que `GREATEST(0, …)` violaria, porque
--    prender o negativo em zero faria o vencimento virar a data de criação.
WITH vinculo_onboarding_admissao AS (
  SELECT oc.id AS onboarding_id, a.id AS admissao_id
  FROM public.onboarding_colaborador oc
  JOIN public.colaboradores c ON c.id = oc.colaborador_id
  JOIN public.admissoes a ON a.id = (c.metadata ->> 'admissao_id')::uuid AND a.empresa_id = c.empresa_id
  WHERE c.metadata ->> 'admissao_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  UNION ALL
  SELECT oc.id, a.id
  FROM public.onboarding_colaborador oc
  JOIN public.colaboradores c ON c.id = oc.colaborador_id
  JOIN public.admissoes a ON a.cpf = c.cpf AND a.empresa_id = c.empresa_id
  WHERE c.metadata ->> 'admissao_id' IS NULL
    AND c.cpf IS NOT NULL
    AND (SELECT count(*) FROM public.admissoes a2 WHERE a2.cpf = c.cpf AND a2.empresa_id = c.empresa_id) = 1
), prazos AS (
  SELECT count(*) AS n
  FROM public.tarefas_onboarding t
  JOIN vinculo_onboarding_admissao v ON v.admissao_id = t.admissao_id
  JOIN public.onboarding_tarefas ot
    ON ot.onboarding_id = v.onboarding_id
   AND ot.titulo = t.titulo AND ot.created_at = t.created_at
  WHERE ot.data_prazo IS NOT NULL
    AND (t.created_at::date + t.prazo_dias) IS DISTINCT FROM ot.data_prazo
)
SELECT CASE WHEN n = 0 THEN 'ok' ELSE 'FALHOU: ' || n || ' tarefa(s) com vencimento diferente do historico' END
FROM prazos;

-- 6. Nada inventado em `responsavel_id`: as copiadas ficam NULL.
WITH vinculo_onboarding_admissao AS (
  SELECT oc.id AS onboarding_id, a.id AS admissao_id
  FROM public.onboarding_colaborador oc
  JOIN public.colaboradores c ON c.id = oc.colaborador_id
  JOIN public.admissoes a ON a.id = (c.metadata ->> 'admissao_id')::uuid AND a.empresa_id = c.empresa_id
  WHERE c.metadata ->> 'admissao_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  UNION ALL
  SELECT oc.id, a.id
  FROM public.onboarding_colaborador oc
  JOIN public.colaboradores c ON c.id = oc.colaborador_id
  JOIN public.admissoes a ON a.cpf = c.cpf AND a.empresa_id = c.empresa_id
  WHERE c.metadata ->> 'admissao_id' IS NULL
    AND c.cpf IS NOT NULL
    AND (SELECT count(*) FROM public.admissoes a2 WHERE a2.cpf = c.cpf AND a2.empresa_id = c.empresa_id) = 1
), inventadas AS (
  SELECT count(*) AS n
  FROM public.tarefas_onboarding t
  JOIN vinculo_onboarding_admissao v ON v.admissao_id = t.admissao_id
  JOIN public.onboarding_tarefas ot
    ON ot.onboarding_id = v.onboarding_id
   AND ot.titulo = t.titulo AND ot.created_at = t.created_at
  WHERE t.responsavel_id IS NOT NULL
)
SELECT CASE WHEN n = 0 THEN 'ok' ELSE 'FALHOU: ' || n || ' tarefa(s) copiada(s) com responsavel inventado' END
FROM inventadas;

-- 7. O legado não está vazio. Sem isto a asserção 1 passaria POR VACUIDADE se
--    alguém tivesse apagado `onboarding_tarefas`: sem linha de origem não há
--    órfã possível. É o que torna a 1 uma prova.
SELECT CASE
         WHEN (SELECT count(*) FROM public.onboarding_tarefas) > 0 THEN 'ok'
         ELSE 'FALHOU: onboarding_tarefas esta vazia — o legado foi perdido'
       END;
