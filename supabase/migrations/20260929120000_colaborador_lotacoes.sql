-- =============================================================================
-- colaborador_lotacoes: relacionamento real entre colaboradores e lotacoes
--
-- Contexto (auditoria da task "Unidade / Lotacao principal"): `lotacoes` e
-- usada como catalogo mestre por empresa — a pagina /lotacoes cria linhas
-- SEM preencher `colaborador_id`. A unica outra leitura da tabela
-- (colaboradorDetalhesService.listarLotacoes) filtra por `colaborador_id`,
-- que por isso sempre retornava vazio: nao existe hoje nenhum codigo em todo
-- o repositorio que grave essa coluna. Nao existe, portanto, vinculo real
-- entre colaborador e lotacao.
--
-- Esta migration cria a tabela de associacao M:N que faltava — sem alterar
-- `lotacoes` como catalogo mestre (nenhuma linha nova e criada nela por este
-- fluxo). `lotacoes.colaborador_id` NAO e removida aqui, apenas documentada
-- como deprecated no final deste arquivo.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.colaborador_lotacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  lotacao_id UUID NOT NULL REFERENCES public.lotacoes(id) ON DELETE CASCADE,
  principal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT colaborador_lotacoes_vinculo_unico UNIQUE (colaborador_id, lotacao_id)
);

COMMENT ON TABLE public.colaborador_lotacoes IS
  'Relacionamento colaborador <-> lotacao (M:N). Uma lotacao pode servir varios colaboradores; um colaborador pode ter mais de uma lotacao, com no maximo uma marcada principal = true (ver indice unico parcial abaixo). UI atual (aba Profissional) so gerencia a lotacao principal.';

-- No maximo 1 lotacao principal por colaborador — indice unico PARCIAL (o
-- mecanismo real do Postgres por tras de "UNIQUE(coluna) WHERE condicao";
-- nao existe UNIQUE CONSTRAINT condicional, so unique index parcial).
CREATE UNIQUE INDEX IF NOT EXISTS colaborador_lotacoes_principal_unica
  ON public.colaborador_lotacoes (colaborador_id)
  WHERE principal = true;

CREATE INDEX IF NOT EXISTS idx_colaborador_lotacoes_colaborador ON public.colaborador_lotacoes (colaborador_id);
CREATE INDEX IF NOT EXISTS idx_colaborador_lotacoes_lotacao ON public.colaborador_lotacoes (lotacao_id);
CREATE INDEX IF NOT EXISTS idx_colaborador_lotacoes_empresa ON public.colaborador_lotacoes (empresa_id);

-- -----------------------------------------------------------------------------
-- Defesa em profundidade multi-tenant: RLS (abaixo) so garante que o USUARIO
-- autenticado pertence a `empresa_id` da linha — nao impede, por si so, que
-- um `colaborador_id`/`lotacao_id` de OUTRO tenant seja referenciado dentro
-- de uma linha cuja `empresa_id` bate com a empresa do usuario (RLS nao
-- valida automaticamente o tenant de linhas referenciadas por FK em outras
-- tabelas). Trigger valida que as 3 pontas — linha, colaborador referenciado
-- e lotacao referenciada — pertencem a MESMA empresa antes de aceitar o
-- INSERT/UPDATE, sem depender do frontend enviar os dados corretos.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.colaborador_lotacoes_valida_tenant()
RETURNS TRIGGER AS $$
DECLARE
  colaborador_empresa UUID;
  lotacao_empresa UUID;
BEGIN
  SELECT empresa_id INTO colaborador_empresa FROM public.colaboradores WHERE id = NEW.colaborador_id;
  SELECT empresa_id INTO lotacao_empresa FROM public.lotacoes WHERE id = NEW.lotacao_id;

  IF colaborador_empresa IS DISTINCT FROM NEW.empresa_id THEN
    RAISE EXCEPTION 'colaborador_lotacoes: colaborador_id pertence a outra empresa (colaborador.empresa_id=%, linha.empresa_id=%)',
      colaborador_empresa, NEW.empresa_id;
  END IF;

  IF lotacao_empresa IS DISTINCT FROM NEW.empresa_id THEN
    RAISE EXCEPTION 'colaborador_lotacoes: lotacao_id pertence a outra empresa (lotacao.empresa_id=%, linha.empresa_id=%)',
      lotacao_empresa, NEW.empresa_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_colaborador_lotacoes_valida_tenant ON public.colaborador_lotacoes;
CREATE TRIGGER trg_colaborador_lotacoes_valida_tenant
  BEFORE INSERT OR UPDATE ON public.colaborador_lotacoes
  FOR EACH ROW EXECUTE FUNCTION public.colaborador_lotacoes_valida_tenant();

-- -----------------------------------------------------------------------------
-- RLS — usa `rls_tenant_or_admin`, o mesmo helper das migrations mais
-- recentes de outras tabelas (ver 20260719100000/20260719240000), nao os
-- padroes antigos "USING (true)" que ainda aparecem em tabelas legadas.
-- -----------------------------------------------------------------------------
ALTER TABLE public.colaborador_lotacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "colaborador_lotacoes_tenant" ON public.colaborador_lotacoes;
CREATE POLICY "colaborador_lotacoes_tenant" ON public.colaborador_lotacoes
  FOR ALL TO authenticated
  USING (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- -----------------------------------------------------------------------------
-- lotacoes.colaborador_id — deprecacao (nao remover nesta migration).
-- Auditoria confirmou (grep em todo `src/`) que nenhum codigo do app grava
-- esta coluna; RAISE NOTICE abaixo reporta a contagem real de linhas com a
-- coluna preenchida no ambiente onde esta migration rodar, para confirmar
-- (ou refutar) essa premissa em producao antes de qualquer remocao futura.
-- -----------------------------------------------------------------------------
COMMENT ON COLUMN public.lotacoes.colaborador_id IS
  'DEPRECATED (2026-09-29): sem fluxo de escrita no app, substituida por colaborador_lotacoes. Nao remover sem antes confirmar 0 linhas preenchidas em producao (ver RAISE NOTICE desta migration).';

DO $$
DECLARE
  preenchidas BIGINT;
BEGIN
  SELECT count(*) INTO preenchidas FROM public.lotacoes WHERE colaborador_id IS NOT NULL;
  RAISE NOTICE 'lotacoes.colaborador_id: % linha(s) preenchida(s) neste ambiente (esperado: 0 — nenhum codigo do app grava esta coluna)', preenchidas;
END;
$$;
