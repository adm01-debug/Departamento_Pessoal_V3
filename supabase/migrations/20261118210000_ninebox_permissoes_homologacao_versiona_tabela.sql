-- Versiona public.ninebox_permissoes_homologacao, que existe em producao desde
-- 2026-10-20 mas nunca teve CREATE em nenhum arquivo do repo nem em nenhuma
-- branch (o unico CREATE encontrado foi um scaffold de teste local em
-- pr/546:tmp-estabilizacao-ninebox/pg-setup.sql, com schema solto e incompleto).
--
-- Consequencia da lacuna: um rebuild/restore do banco a partir do repo nao cria
-- a tabela, e o lote NineBox aborta no proprio preflight de
-- 20261115150000_ninebox_canoniza_funcoes_do_canonico.sql:138-139
-- ("pode_aprovar_colaborador le essa tabela"), travando o deploy de banco.
--
-- A forma abaixo reproduz producao exatamente (colunas, defaults, PK, FK e grants).
-- RLS fica habilitada e SEM policies DE PROPOSITO: nenhum acesso por anon ou
-- authenticated via PostgREST. A leitura legitima acontece dentro de
-- public.pode_aprovar_colaborador / pode_editar_colaborador, que sao SECURITY
-- DEFINER e portanto nao passam por RLS. Criar policy permissiva aqui afrouxaria
-- o controle sem necessidade.
--
-- Idempotente: pode rodar em producao (onde a tabela ja existe) sem efeito.

CREATE TABLE IF NOT EXISTS public.ninebox_permissoes_homologacao (
  user_id    uuid        NOT NULL,
  habilitado boolean     NOT NULL DEFAULT false,
  expira_em  timestamptz NOT NULL,
  criado_em  timestamptz NOT NULL DEFAULT now()
);

DO $pk$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.ninebox_permissoes_homologacao'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE public.ninebox_permissoes_homologacao
      ADD CONSTRAINT ninebox_permissoes_homologacao_pkey PRIMARY KEY (user_id);
  END IF;
END $pk$;

DO $fk$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.ninebox_permissoes_homologacao'::regclass
      AND contype = 'f'
      AND conname = 'ninebox_permissoes_homologacao_user_id_fkey'
  ) THEN
    ALTER TABLE public.ninebox_permissoes_homologacao
      ADD CONSTRAINT ninebox_permissoes_homologacao_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $fk$;

ALTER TABLE public.ninebox_permissoes_homologacao ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.ninebox_permissoes_homologacao FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.ninebox_permissoes_homologacao TO dp_mcp_role;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.ninebox_permissoes_homologacao TO service_role;

COMMENT ON TABLE public.ninebox_permissoes_homologacao IS
  'Excecao de homologacao do 9-box: quem, fora da regra padrao, pode aprovar avaliacao de colaborador, com validade por expira_em. Lida apenas por funcoes SECURITY DEFINER (pode_aprovar_colaborador). RLS habilitada sem policies e intencional: zero acesso via API.';
