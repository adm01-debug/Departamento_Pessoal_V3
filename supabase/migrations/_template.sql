-- TEMPLATE — não é uma migration real. Copie o padrão abaixo ao escrever
-- uma migration que faz DROP POLICY (E50-12, causa raiz de A-036).
--
-- O QUE ACONTECEU SEM ISSO (A-036, lote 19-31/07/2026)
-- `DROP POLICY IF EXISTS "nome"` é silencioso por natureza: se o nome não
-- bater exatamente (acento, cedilha, espaço), o comando não dropa nada e
-- não avisa nada. A migration "passou" no CI e ficou meses no repositório
-- parecendo aplicada, enquanto a policy antiga e insegura continuava viva
-- em produção ao lado da nova. `scripts/audit-migration-style.mjs` reprova
-- todo `DROP POLICY IF EXISTS` que não seja fail-closed como abaixo, ou
-- explicitamente marcado como exceção revisada (ver rodapé deste arquivo).
--
-- O padrão: checar que a policy existe ANTES do drop (se a suposição sobre
-- o estado vivo estiver errada, falhar a migration em vez de silenciar) e
-- confirmar que ela sumiu DEPOIS. Nomes de policy sempre lidos ao vivo via
-- MCP antes de escrever a migration — nunca copiados de outra migration ou
-- do PLANO_50.md, que podem estar desatualizados.

DO $migration$
DECLARE
  policy_exists boolean;
BEGIN
  -- 1. Confirma que a policy antiga existe com o nome exato antes de tentar
  --    dropar. Se não existir, a suposição sobre o estado vivo está errada
  --    — falha alto e claro em vez de seguir em frente calado.
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'NOME_DA_TABELA'
      AND policyname = 'nome_da_policy_antiga'
  ) INTO policy_exists;

  IF NOT policy_exists THEN
    RAISE EXCEPTION
      'Migration esperava a policy "nome_da_policy_antiga" viva em public.NOME_DA_TABELA e não a encontrou -- nome pode ter mudado, confirmar ao vivo antes de reaplicar.';
  END IF;

  -- 2. Cria a policy nova (se for o caso) antes de derrubar a antiga, para
  --    nunca ter uma janela sem RLS ativo na tabela.
  -- CREATE POLICY nome_da_policy_nova ON public.NOME_DA_TABELA
  --   FOR ALL TO authenticated
  --   USING ( ... )
  --   WITH CHECK ( ... );

  -- 3. Dropa a antiga pelo nome exato confirmado no passo 1.
  DROP POLICY "nome_da_policy_antiga" ON public.NOME_DA_TABELA;

  -- 4. Confirma que sumiu. Se ainda existir (ex.: outra policy com nome
  --    parecido, ou o DROP acima não rodou por algum motivo), falha em vez
  --    de reportar sucesso.
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'NOME_DA_TABELA'
      AND policyname = 'nome_da_policy_antiga'
  ) INTO policy_exists;

  IF policy_exists THEN
    RAISE EXCEPTION
      'DROP POLICY "nome_da_policy_antiga" em public.NOME_DA_TABELA não removeu a policy -- investigar antes de considerar esta migration aplicada.';
  END IF;
END
$migration$;

-- EXCEÇÃO REVISADA (uso raro — limpeza de policy que se sabe morta, sem
-- policy substituta): anote imediatamente ACIMA da linha do DROP, não neste
-- rodapé, para o lint (scripts/audit-migration-style.mjs) reconhecer:
--
--   -- audit-migration-style: allow-silent-drop <motivo em 1 linha>
--   DROP POLICY IF EXISTS "nome_da_policy_morta" ON public.tabela;
--
-- Só use quando tiver certeza do nome exato (confirmado ao vivo) e não
-- houver policy substituta para criar antes -- caso contrário, use o padrão
-- fail-closed acima.
