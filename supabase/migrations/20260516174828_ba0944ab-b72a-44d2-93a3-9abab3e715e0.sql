-- 1. Tabelas de Configurações
CREATE TABLE IF NOT EXISTS public.configuracoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    chave TEXT NOT NULL,
    valor JSONB,
    descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(empresa_id, chave)
);

CREATE TABLE IF NOT EXISTS public.configuracoes_ponto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    tolerancia_minutos INTEGER DEFAULT 10,
    permite_ponto_offline BOOLEAN DEFAULT false,
    exige_geolocalizacao BOOLEAN DEFAULT true,
    exige_foto BOOLEAN DEFAULT false,
    bloqueia_fora_raio BOOLEAN DEFAULT false,
    raio_maximo_metros INTEGER DEFAULT 500,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(empresa_id)
);

CREATE TABLE IF NOT EXISTS public.configuracoes_esocial (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    ambiente INTEGER DEFAULT 2,
    certificado_digital_id UUID,
    transmissao_automatica BOOLEAN DEFAULT false,
    contato_nome TEXT,
    contato_email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(empresa_id)
);

CREATE TABLE IF NOT EXISTS public.configuracoes_intervalo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    minutos_minimo INTEGER DEFAULT 60,
    minutos_maximo INTEGER DEFAULT 120,
    deducao_automatica BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(empresa_id)
);

-- 2. Logs e Auditoria
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    usuario_id UUID,
    tabela TEXT NOT NULL,
    registro_id UUID,
    acao TEXT NOT NULL,
    dados_antigos JSONB,
    dados_novos JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.auditoria_contratual (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
    campo_alterado TEXT NOT NULL,
    valor_anterior TEXT,
    valor_novo TEXT,
    motivo TEXT,
    usuario_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.auditoria_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    evento TEXT NOT NULL,
    descricao TEXT,
    severidade TEXT DEFAULT 'info',
    metadados JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.automacao_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nome_fluxo TEXT NOT NULL,
    status TEXT NOT NULL,
    mensagem_erro TEXT,
    duracao_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.logs_sincronizacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    sistema_externo TEXT NOT NULL,
    tipo_entidade TEXT NOT NULL,
    status TEXT NOT NULL,
    mensagem TEXT,
    payload_enviado JSONB,
    resposta_recebida JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Segurança e Controle de Acesso
CREATE TABLE IF NOT EXISTS public.blocked_ips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    ip_address TEXT NOT NULL,
    motivo TEXT,
    bloqueado_ate TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(empresa_id, ip_address)
);

CREATE TABLE IF NOT EXISTS public.permissao_perfis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    descricao TEXT,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(empresa_id, nome)
);

CREATE TABLE IF NOT EXISTS public.permissao_recursos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    descricao TEXT,
    modulo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.controle_acesso (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    perfil_id UUID NOT NULL REFERENCES public.permissao_perfis(id) ON DELETE CASCADE,
    recurso_id UUID NOT NULL REFERENCES public.permissao_recursos(id) ON DELETE CASCADE,
    pode_ler BOOLEAN DEFAULT true,
    pode_escrever BOOLEAN DEFAULT false,
    pode_deletar BOOLEAN DEFAULT false,
    pode_exportar BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(empresa_id, perfil_id, recurso_id)
);

-- 4. Parâmetros e Sessões
CREATE TABLE IF NOT EXISTS public.parametros_sistema (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    valor TEXT,
    tipo_dado TEXT DEFAULT 'string',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(empresa_id, nome)
);

CREATE TABLE IF NOT EXISTS public.auth_gov_br_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    session_state TEXT,
    access_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.versao_banco (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    versao TEXT NOT NULL,
    descricao TEXT,
    executado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Segurança RLS
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_ponto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_esocial ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_intervalo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_contratual ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automacao_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_sincronizacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissao_perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissao_recursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.controle_acesso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parametros_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_gov_br_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.versao_banco ENABLE ROW LEVEL SECURITY;

-- 6. Triggers updated_at
DROP TRIGGER IF EXISTS tr_updated_at_configuracoes ON public.configuracoes;
CREATE TRIGGER tr_updated_at_configuracoes BEFORE UPDATE ON public.configuracoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS tr_updated_at_config_ponto ON public.configuracoes_ponto;
CREATE TRIGGER tr_updated_at_config_ponto BEFORE UPDATE ON public.configuracoes_ponto FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS tr_updated_at_config_esocial ON public.configuracoes_esocial;
CREATE TRIGGER tr_updated_at_config_esocial BEFORE UPDATE ON public.configuracoes_esocial FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS tr_updated_at_config_intervalo ON public.configuracoes_intervalo;
CREATE TRIGGER tr_updated_at_config_intervalo BEFORE UPDATE ON public.configuracoes_intervalo FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS tr_updated_at_blocked_ips ON public.blocked_ips;
CREATE TRIGGER tr_updated_at_blocked_ips BEFORE UPDATE ON public.blocked_ips FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS tr_updated_at_permissao_perfis ON public.permissao_perfis;
CREATE TRIGGER tr_updated_at_permissao_perfis BEFORE UPDATE ON public.permissao_perfis FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS tr_updated_at_controle_acesso ON public.controle_acesso;
CREATE TRIGGER tr_updated_at_controle_acesso BEFORE UPDATE ON public.controle_acesso FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS tr_updated_at_parametros_sistema ON public.parametros_sistema;
CREATE TRIGGER tr_updated_at_parametros_sistema BEFORE UPDATE ON public.parametros_sistema FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS tr_updated_at_auth_gov_br ON public.auth_gov_br_sessions;
CREATE TRIGGER tr_updated_at_auth_gov_br BEFORE UPDATE ON public.auth_gov_br_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
