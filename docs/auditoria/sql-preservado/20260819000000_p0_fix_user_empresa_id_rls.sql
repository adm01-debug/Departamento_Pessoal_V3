-- P0-FIX-RLS: Corrige public.user_empresa_id() para usar a tabela user_empresas
-- como fonte de verdade do vínculo usuário↔empresa.
--
-- PROBLEMA: a função original lia APENAS `auth.jwt() -> 'user_metadata' ->> 'empresa_id'`.
-- Quando o usuário tem vínculo na tabela user_empresas mas o JWT não tem
-- empresa_id no user_metadata (cenário comum após login via auth-login edge
-- function que não popula user_metadata.empresa_id), a função retorna NULL,
-- e TODAS as policies RLS filtram para zero registros — usuário vê listas vazias.
--
-- SOLUÇÃO: a função agora consulta a tabela user_empresas e retorna a empresa
-- padrão (is_default=true) ou a primeira vinculada. Mantém fallback para
-- user_metadata.empresa_id se houver (compat com logins antigos).
--
-- Esta correção só pode AMPLIAR acesso, nunca reduzir — usuários que tinham
-- empresa_id no user_metadata continuam com a mesma policy efetiva, e os
-- que estavam sem agora passam a ver os dados da empresa vinculada.

CREATE OR REPLACE FUNCTION public.user_empresa_id()
RETURNS UUID AS $$
  DECLARE
    v_empresa UUID;
  BEGIN
    -- Prioridade 1: user_metadata.empresa_id (logins antigos, mantém compat).
    v_empresa := (auth.jwt() -> 'user_metadata' ->> 'empresa_id')::UUID;
    IF v_empresa IS NOT NULL THEN
      RETURN v_empresa;
    END IF;

    -- Prioridade 2: empresa padrão (is_default=true) do vínculo do usuário.
    SELECT empresa_id INTO v_empresa
      FROM public.user_empresas
      WHERE user_id = auth.uid() AND is_default = true
      LIMIT 1;
    IF v_empresa IS NOT NULL THEN
      RETURN v_empresa;
    END IF;

    -- Prioridade 3: primeira empresa vinculada (caso não tenha is_default).
    SELECT empresa_id INTO v_empresa
      FROM public.user_empresas
      WHERE user_id = auth.uid()
      ORDER BY created_at ASC
      LIMIT 1;

    RETURN v_empresa;
  END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;