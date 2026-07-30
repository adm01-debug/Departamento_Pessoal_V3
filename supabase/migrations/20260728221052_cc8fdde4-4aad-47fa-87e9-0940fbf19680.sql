-- Vínculo conta de login (auth.users) <-> colaborador.
-- Modelagem: coluna nullable, não tabela de junção. Um colaborador tem no
-- máximo UM login; um login pode ser colaborador em várias empresas do grupo,
-- mas nunca duas vezes na mesma empresa (índice único parcial abaixo).
-- ON DELETE SET NULL: apagar a conta de login jamais pode apagar o cadastro
-- trabalhista (obrigação de guarda documental).
ALTER TABLE public.colaboradores
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.colaboradores.user_id IS
  'Conta de login vinculada. NULL = colaborador cadastrado pelo RH sem acesso ao portal.';

-- Um login não pode ocupar dois cadastros na mesma empresa.
-- Parcial: NULLs não conflitam entre si (vários colaboradores sem login).
CREATE UNIQUE INDEX IF NOT EXISTS colaboradores_user_id_empresa_uniq
  ON public.colaboradores (user_id, empresa_id)
  WHERE user_id IS NOT NULL;

-- Suporta o lookup do portal (WHERE user_id = auth.uid()) e o predicado da
-- política abaixo, evitando seq scan a cada render do portal.
CREATE INDEX IF NOT EXISTS colaboradores_user_id_idx
  ON public.colaboradores (user_id)
  WHERE user_id IS NOT NULL;

-- O portal precisa que a PESSOA leia o PRÓPRIO cadastro. As políticas atuais
-- só liberam quem pertence à empresa como usuário de RH/admin; um colaborador
-- comum não se enxerga. Escopo mínimo: a própria linha, nada mais.
DROP POLICY IF EXISTS "Colaborador vê o próprio cadastro" ON public.colaboradores;
CREATE POLICY "Colaborador vê o próprio cadastro"
  ON public.colaboradores
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
