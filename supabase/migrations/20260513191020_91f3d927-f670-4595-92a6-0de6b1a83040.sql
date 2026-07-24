-- 1. Criar o bucket para biometria (se não existir)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ponto-biometria', 'ponto-biometria', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Políticas de Storage para Biometria
DROP POLICY IF EXISTS "Colaboradores podem dar upload de sua própria biometria" ON storage.objects;
CREATE POLICY "Colaboradores podem dar upload de sua própria biometria"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ponto-biometria' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Colaboradores podem ver sua própria biometria" ON storage.objects;
CREATE POLICY "Colaboradores podem ver sua própria biometria"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'ponto-biometria' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Gestores podem ver todas as biometrias" ON storage.objects;
CREATE POLICY "Gestores podem ver todas as biometrias"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'ponto-biometria' AND (
    SELECT public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor')
));

-- 3. Melhorar as tabelas para suportar a lógica de IA
ALTER TABLE public.colaboradores 
ADD COLUMN IF NOT EXISTS foto_referencia_url TEXT,
ADD COLUMN IF NOT EXISTS face_id TEXT;

ALTER TABLE public.batidas_ponto
ADD COLUMN IF NOT EXISTS biometria_status TEXT DEFAULT 'nao_validada', -- 'valido', 'invalido', 'nao_validada', 'erro'
ADD COLUMN IF NOT EXISTS biometria_score FLOAT,
ADD COLUMN IF NOT EXISTS hash_biometrico TEXT;

-- 4. Função para auditar falhas biométricas críticas
CREATE OR REPLACE FUNCTION public.fn_audit_biometric_failure()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.biometria_status = 'invalido') THEN
        INSERT INTO public.auditoria_logs (
            tabela, 
            registro_id, 
            acao, 
            dados_novos, 
            user_id
        ) VALUES (
            'batidas_ponto',
            NEW.id,
            'ALERTA_FALHA_BIOMETRICA',
            jsonb_build_object(
                'colaborador_id', NEW.colaborador_id,
                'status', NEW.biometria_status,
                'score', NEW.biometria_score,
                'data_batida', NEW.data || ' ' || NEW.hora
            ),
            NEW.colaborador_id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger de auditoria de biometria
DROP TRIGGER IF EXISTS tr_audit_biometric_failure ON public.batidas_ponto;
CREATE TRIGGER tr_audit_biometric_failure
AFTER UPDATE OR INSERT ON public.batidas_ponto
FOR EACH ROW
EXECUTE FUNCTION public.fn_audit_biometric_failure();
