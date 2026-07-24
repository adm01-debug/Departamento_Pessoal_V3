-- 1. Tabela para assinaturas de Push (Web Push API)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    device_info JSONB,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Usuários gerenciam suas próprias assinaturas" ON public.push_subscriptions;
CREATE POLICY "Usuários gerenciam suas próprias assinaturas"
ON public.push_subscriptions
FOR ALL
USING (auth.uid() = user_id);

-- 2. Adicionar preferências no perfil
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notificacoes_push BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notificacoes_email BOOLEAN DEFAULT true;

-- 3. Função para enfileirar notificações
CREATE OR REPLACE FUNCTION public.fn_enqueue_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Exemplo: Notificar quando um holerite é criado
    IF (TG_TABLE_NAME = 'holerites') THEN
        INSERT INTO public.notificacoes (
            user_id,
            titulo,
            mensagem,
            tipo,
            lida
        ) VALUES (
            NEW.colaborador_id, -- Assume-se que colaborador_id é o user_id aqui por simplicidade no MVP
            'Novo Holerite Disponível',
            'Seu holerite de ' || NEW.competencia || ' já está disponível para visualização.',
            'folha',
            false
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para holerites
DROP TRIGGER IF EXISTS tr_notify_new_holerite ON public.holerites;
CREATE TRIGGER tr_notify_new_holerite
AFTER INSERT ON public.holerites
FOR EACH ROW
EXECUTE FUNCTION public.fn_enqueue_notification();
