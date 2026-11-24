-- A edge auth-gov-br já escreve/lê govbr_auth_state.user_id, mas a coluna
-- nunca foi criada em migration — o INSERT de get_auth_url falhava. Agora
-- nullable: states anônimos (botão "Entrar com gov.br" na tela de login,
-- sem sessão) vs. states vinculados (usuário logado vinculando a conta).
ALTER TABLE public.govbr_auth_state
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_govbr_auth_state_user_id ON public.govbr_auth_state(user_id);
