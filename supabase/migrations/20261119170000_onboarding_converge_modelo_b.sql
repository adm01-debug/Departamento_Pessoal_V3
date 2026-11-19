-- ============================================================================
-- ONBOARDING — CONVERGÊNCIA DO MODELO LEGADO PARA O CANÔNICO
--
-- ADITIVA E IDEMPOTENTE. Nenhum DROP, nenhum DELETE, nenhuma mudança de schema.
-- Só COPIA (INSERT) tarefas do modelo legado para o canônico. As tabelas
-- legadas ficam intactas, com as 5 colunas que o canônico não tem.
--
-- ORIGEM: resgata a `20261005020000_onboarding_modelo_b_convergencia.sql` da PR
-- #546 ("muri", fechada sem merge). Aquela nunca rodou — não está no ledger do
-- canônico nem tem arquivo na `main` — e nenhuma migration da `main` faz esta
-- cópia. Sem ela, o histórico de onboarding de 6 colaboradores (27 tarefas com
-- data de conclusão) existe só no legado e não aparece em tela nenhuma.
--
-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ O VÍNCULO É O PONTO CRÍTICO DESTA MIGRATION, NÃO A CÓPIA.                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- A tabela legada liga tarefa → onboarding → COLABORADOR. O modelo canônico
-- liga tarefa → ADMISSÃO. Uma pessoa pode ter várias admissões, e o mesmo CPF
-- pode existir em EMPRESAS diferentes. Logo "achar a admissão do colaborador"
-- é uma decisão de negócio, e errar nela significa:
--   • atribuir histórico de uma contratação à readmissão seguinte; ou
--   • pior, copiar o histórico de uma empresa para dentro de outra.
--
-- A versão da muri fazia `JOIN admissoes a ON a.cpf = c.cpf`, sem empresa e sem
-- escolher: multiplicava a tarefa por todas as admissões daquele CPF, em
-- qualquer empresa. Uma primeira correção minha trocou isso por "a admissão
-- mais recente do CPF" — o que resolve a multiplicação e MANTÉM os dois erros
-- acima (empresa errada, readmissão errada). Nenhuma das duas serve.
--
-- A REGRA CERTA JÁ EXISTE NESTE REPO, e é a que o leitor canônico usa:
-- `src/services/onboardingJornadaService.ts:374-382` (`buscarJornadaDoColaborador`)
-- prefere o vínculo EXPLÍCITO `colaboradores.metadata.admissao_id`, gravado por
-- `admissaoService.concluir`, e o comentário de lá diz textualmente que
-- colaborador pré-existente com o MESMO CPF não é vínculo válido, porque "outra
-- admissão para o mesmo CPF na mesma empresa — inclusive uma tentativa
-- cancelada — sequestrava a jornada, e o dossiê cobrava tarefas do processo
-- errado". Esta migration passa a seguir a mesma regra, em três camadas:
--
--   1. VÍNCULO EXPLÍCITO: `colaboradores.metadata->>'admissao_id'`, exigindo que
--      a admissão seja da MESMA empresa do colaborador.
--   2. QUEDA POR CPF, só para registro legado anterior ao `metadata.admissao_id`:
--      mesma empresa E apenas quando existe UMA ÚNICA admissão com aquele CPF
--      naquela empresa.
--   3. AMBÍGUO OU AUSENTE: não copia. Nada é adivinhado, nada é perdido — a
--      tarefa continua no legado e o sidecar conta quantas ficaram de fora.
--
-- Copiar 20 tarefas no lugar certo é melhor que copiar 27 no lugar errado.
--
-- MAPEAMENTO DOS CAMPOS:
--   onboarding_tarefas.titulo         → tarefas_onboarding.titulo
--   onboarding_tarefas.descricao      → tarefas_onboarding.descricao
--   onboarding_tarefas.created_at     → tarefas_onboarding.created_at
--   onboarding_tarefas.concluida      → tarefas_onboarding.concluida
--   onboarding_tarefas.data_conclusao → tarefas_onboarding.concluida_em
--   onboarding_tarefas.data_prazo     → prazo_dias = (data_prazo − created_at)
--   responsavel_id                    → NULL
--
-- `prazo_dias` PODE SER NEGATIVO, de propósito. A tela calcula o vencimento como
-- `created_at + prazo_dias` (`src/components/admissoes/onboardingDerivacoes.ts`,
-- `prazoDaTarefa`). Tarefa legada com prazo ANTERIOR à inserção da linha — o
-- caso normal num histórico que está sendo importado — daria diferença negativa;
-- prender em zero com `GREATEST(0, …)`, como a muri fazia, faria a tela exibir a
-- data de criação como vencimento e APAGARIA a data histórica. Negativo
-- preserva o vencimento real.
--
-- `responsavel_id` fica NULL de propósito: o legado não guarda responsável. Tem
-- `concluida_por`, que é QUEM CONCLUIU, não quem responde pela tarefa.
--
-- IDEMPOTÊNCIA: a chave de deduplicação é (admissao_id, titulo, created_at), não
-- (admissao_id, titulo). Dois onboardings da mesma pessoa podem ter tarefas de
-- título IGUAL ("Entrega de equipamentos") e são tarefas DIFERENTES; o título
-- sozinho as fundiria e, pior, as duas passariam juntas num único INSERT (o
-- `NOT EXISTS` não compara as candidatas entre si). O `created_at` da linha
-- legada é o que as distingue.
-- ============================================================================

DO $$
DECLARE
  v_copiadas integer := 0;
  v_sem_vinculo integer := 0;
BEGIN
  -- Onboarding → admissão, pela regra de três camadas descrita acima.
  CREATE TEMP TABLE _vinculo_onboarding ON COMMIT DROP AS
  WITH explicito AS (
    SELECT
      oc.id   AS onboarding_id,
      a.id    AS admissao_id,
      'explicito'::text AS origem
    FROM public.onboarding_colaborador oc
    JOIN public.colaboradores c ON c.id = oc.colaborador_id
    JOIN public.admissoes a
      ON a.id = (c.metadata ->> 'admissao_id')::uuid
     -- RECORTE DE EMPRESA: sem isto, metadata apontando para fora da empresa do
     -- colaborador copiaria histórico entre tenants.
     AND a.empresa_id = c.empresa_id
    WHERE c.metadata ->> 'admissao_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ),
  por_cpf AS (
    SELECT
      oc.id AS onboarding_id,
      a.id  AS admissao_id,
      'cpf_unico_na_empresa'::text AS origem
    FROM public.onboarding_colaborador oc
    JOIN public.colaboradores c ON c.id = oc.colaborador_id
    JOIN public.admissoes a
      ON a.cpf = c.cpf
     AND a.empresa_id = c.empresa_id
    WHERE oc.id NOT IN (SELECT onboarding_id FROM explicito)
      AND c.cpf IS NOT NULL
      -- SÓ quando não há escolha a fazer. Mais de uma admissão para o mesmo CPF
      -- na mesma empresa = ambíguo = não copia (camada 3).
      AND (
        SELECT count(*)
        FROM public.admissoes a2
        WHERE a2.cpf = c.cpf AND a2.empresa_id = c.empresa_id
      ) = 1
  )
  SELECT * FROM explicito
  UNION ALL
  SELECT * FROM por_cpf;

  INSERT INTO public.tarefas_onboarding
    (admissao_id, titulo, descricao, responsavel_id, prazo_dias, concluida, concluida_em, created_at)
  SELECT
    v.admissao_id,
    ot.titulo,
    ot.descricao,
    NULL,
    COALESCE(ot.data_prazo - ot.created_at::date, 5),
    COALESCE(ot.concluida, false),
    ot.data_conclusao,
    ot.created_at
  FROM public.onboarding_tarefas ot
  JOIN _vinculo_onboarding v ON v.onboarding_id = ot.onboarding_id
  WHERE ot.titulo IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.tarefas_onboarding t
      WHERE t.admissao_id = v.admissao_id
        AND t.titulo = ot.titulo
        AND t.created_at = ot.created_at
    );

  GET DIAGNOSTICS v_copiadas = ROW_COUNT;

  SELECT count(*) INTO v_sem_vinculo
  FROM public.onboarding_tarefas ot
  WHERE ot.titulo IS NOT NULL
    AND ot.onboarding_id NOT IN (SELECT onboarding_id FROM _vinculo_onboarding);

  RAISE NOTICE '[convergencia onboarding] copiadas: % | sem vinculo resolvido (seguem so no legado): %',
    v_copiadas, v_sem_vinculo;

  -- Pós-condição fail-closed: toda tarefa legada cujo onboarding TEM vínculo
  -- resolvido precisa ter destino. As sem vínculo são exclusão consciente, não
  -- falha — por isso a condição olha só as com vínculo.
  IF EXISTS (
    SELECT 1
    FROM public.onboarding_tarefas ot
    JOIN _vinculo_onboarding v ON v.onboarding_id = ot.onboarding_id
    WHERE ot.titulo IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.tarefas_onboarding t
        WHERE t.admissao_id = v.admissao_id
          AND t.titulo = ot.titulo
          AND t.created_at = ot.created_at
      )
  ) THEN
    RAISE EXCEPTION 'pos-condicao: tarefa legada com vinculo resolvido ficou sem destino no canonico';
  END IF;

  -- Pós-condição de tenant: nenhuma tarefa pode ter caído em admissão de outra
  -- empresa que não a do colaborador de origem. É a asserção que o vazamento
  -- entre empresas violaria.
  IF EXISTS (
    SELECT 1
    FROM _vinculo_onboarding v
    JOIN public.onboarding_colaborador oc ON oc.id = v.onboarding_id
    JOIN public.colaboradores c ON c.id = oc.colaborador_id
    JOIN public.admissoes a ON a.id = v.admissao_id
    WHERE a.empresa_id IS DISTINCT FROM c.empresa_id
  ) THEN
    RAISE EXCEPTION 'pos-condicao: vinculo cruzou empresa — admissao de empresa diferente do colaborador';
  END IF;
END $$;

-- Nenhum DELETE, nenhum DROP: \`onboarding_tarefas\` e \`onboarding_colaborador\`
-- seguem intactas, com \`categoria\`, \`ordem\`, \`concluida_por\`, \`observacoes\` e
-- \`template_tarefa_id\`, que não têm coluna no modelo canônico.
--
-- ============================================================================
-- DECISÃO SOBRE ESSAS 5 COLUNAS: NÃO acrescentá-las ao modelo canônico.
--
-- Razões, nesta ordem:
--   1. nenhuma tela lê qualquer uma delas. Conferido: \`git grep\` por
--      \`concluida_por\` e \`template_tarefa_id\` em \`src/\` não acha consumidor, e a
--      única menção a \`categoria\` em \`src/components/admissoes/\` é um COMENTÁRIO
--      em \`GestaoKits.tsx:127\` sobre \`onboarding_kits\`, outra tabela. Coluna
--      nova nasceria morta;
--   2. o legado continua intacto com as 5, então NADA se perde — trazer
--      qualquer uma depois é um ALTER TABLE mais um UPDATE, a qualquer momento;
--   3. acrescentar coluna em tabela canônica para dado que nenhuma tela mostra
--      é churn de schema; só teria efeito junto de trabalho de UI, o que é
--      funcionalidade nova e não parte deste resgate;
--   4. o objetivo do resgate se cumpre sem elas: o histórico que estava
--      invisível — título, descrição, prazo e a data real de conclusão —
--      passa a aparecer.
--
-- Se mais adiante o RH pedir categoria ou observação em tela, entra como
-- feature própria, com coluna, UI e teste no mesmo PR.
-- ============================================================================
