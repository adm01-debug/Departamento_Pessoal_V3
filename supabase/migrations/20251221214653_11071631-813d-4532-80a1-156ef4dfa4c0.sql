-- Criar tabelas faltantes para o projeto

-- Tabela de configuração do Bitrix24
CREATE TABLE IF NOT EXISTS public.bitrix24_config (
  id SERIAL PRIMARY KEY,
  habilitado BOOLEAN DEFAULT FALSE,
  intervalo_minutos INTEGER DEFAULT 60,
  horario_inicio VARCHAR(5),
  horario_fim VARCHAR(5),
  dias_semana INTEGER[],
  sync_colaboradores BOOLEAN DEFAULT TRUE,
  sync_departamentos BOOLEAN DEFAULT TRUE,
  sync_cargos BOOLEAN DEFAULT FALSE,
  notificar_erros BOOLEAN DEFAULT TRUE,
  notificar_sucesso BOOLEAN DEFAULT FALSE,
  max_tentativas INTEGER DEFAULT 3,
  ultima_execucao TIMESTAMP WITH TIME ZONE,
  proxima_execucao TIMESTAMP WITH TIME ZONE,
  webhook_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de logs de sincronização do Bitrix24
CREATE TABLE IF NOT EXISTS public.bitrix24_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL,
  direcao VARCHAR(50) NOT NULL,
  registros_processados INTEGER DEFAULT 0,
  registros_sucesso INTEGER DEFAULT 0,
  registros_erro INTEGER DEFAULT 0,
  sucesso INTEGER DEFAULT 0,
  erros INTEGER DEFAULT 0,
  conflitos INTEGER DEFAULT 0,
  detalhes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de configurações gerais
CREATE TABLE IF NOT EXISTS public.configuracoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chave VARCHAR(255) NOT NULL UNIQUE,
  valor JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de logs de auditoria customizada
CREATE TABLE IF NOT EXISTS public.auditoria_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  acao VARCHAR(50) NOT NULL,
  entidade VARCHAR(100) NOT NULL,
  entidade_id VARCHAR(255),
  descricao TEXT,
  dados_anteriores JSONB,
  dados_novos JSONB,
  user_id UUID,
  user_email VARCHAR(255),
  ip_address VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.bitrix24_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bitrix24_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para bitrix24_config (apenas usuários autenticados)
DROP POLICY IF EXISTS "Usuários autenticados podem ver config bitrix24" ON public.bitrix24_config;
CREATE POLICY "Usuários autenticados podem ver config bitrix24"
  ON public.bitrix24_config FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem atualizar config bitrix24" ON public.bitrix24_config;
CREATE POLICY "Usuários autenticados podem atualizar config bitrix24"
  ON public.bitrix24_config FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem inserir config bitrix24" ON public.bitrix24_config;
CREATE POLICY "Usuários autenticados podem inserir config bitrix24"
  ON public.bitrix24_config FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Políticas RLS para bitrix24_sync_logs
DROP POLICY IF EXISTS "Usuários autenticados podem ver logs bitrix24" ON public.bitrix24_sync_logs;
CREATE POLICY "Usuários autenticados podem ver logs bitrix24"
  ON public.bitrix24_sync_logs FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem inserir logs bitrix24" ON public.bitrix24_sync_logs;
CREATE POLICY "Usuários autenticados podem inserir logs bitrix24"
  ON public.bitrix24_sync_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Políticas RLS para configuracoes
DROP POLICY IF EXISTS "Usuários autenticados podem ver configuracoes" ON public.configuracoes;
CREATE POLICY "Usuários autenticados podem ver configuracoes"
  ON public.configuracoes FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem atualizar configuracoes" ON public.configuracoes;
CREATE POLICY "Usuários autenticados podem atualizar configuracoes"
  ON public.configuracoes FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem inserir configuracoes" ON public.configuracoes;
CREATE POLICY "Usuários autenticados podem inserir configuracoes"
  ON public.configuracoes FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Políticas RLS para auditoria_logs
DROP POLICY IF EXISTS "Usuários autenticados podem ver auditoria_logs" ON public.auditoria_logs;
CREATE POLICY "Usuários autenticados podem ver auditoria_logs"
  ON public.auditoria_logs FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem inserir auditoria_logs" ON public.auditoria_logs;
CREATE POLICY "Usuários autenticados podem inserir auditoria_logs"
  ON public.auditoria_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Adicionar colunas bitrix_id ao colaboradores se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'colaboradores' AND column_name = 'bitrix_id') THEN
    ALTER TABLE public.colaboradores ADD COLUMN bitrix_id VARCHAR(50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'colaboradores' AND column_name = 'bitrix_sync_status') THEN
    ALTER TABLE public.colaboradores ADD COLUMN bitrix_sync_status VARCHAR(50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'colaboradores' AND column_name = 'bitrix_ultima_sync') THEN
    ALTER TABLE public.colaboradores ADD COLUMN bitrix_ultima_sync TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;