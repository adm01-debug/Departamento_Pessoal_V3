-- V16-001: Core Database Schema
-- Sistema Departamento Pessoal - Production Ready

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- EMPRESAS
CREATE TABLE IF NOT EXISTS empresas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  razao_social VARCHAR(255) NOT NULL,
  nome_fantasia VARCHAR(255),
  cnpj CHAR(14) UNIQUE NOT NULL,
  inscricao_estadual VARCHAR(20),
  inscricao_municipal VARCHAR(20),
  email VARCHAR(255),
  telefone VARCHAR(20),
  celular VARCHAR(20),
  website VARCHAR(255),
  cep CHAR(8),
  logradouro VARCHAR(255),
  numero VARCHAR(10),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  uf CHAR(2),
  regime_tributario VARCHAR(50) DEFAULT 'simples_nacional',
  cnae_principal VARCHAR(10),
  natureza_juridica VARCHAR(10),
  porte VARCHAR(20),
  capital_social DECIMAL(15,2),
  data_abertura DATE,
  responsavel_nome VARCHAR(255),
  responsavel_cpf CHAR(11),
  contador_nome VARCHAR(255),
  contador_crc VARCHAR(20),
  esocial_ambiente VARCHAR(20) DEFAULT 'producao_restrita',
  esocial_processo VARCHAR(20),
  logo_url TEXT,
  ativa BOOLEAN DEFAULT true,
  status VARCHAR(20) DEFAULT 'ativa',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

-- DEPARTAMENTOS
CREATE TABLE IF NOT EXISTS departamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  codigo VARCHAR(20),
  centro_custo VARCHAR(20),
  gestor_id UUID,
  departamento_pai_id UUID REFERENCES departamentos(id),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CARGOS
CREATE TABLE IF NOT EXISTS cargos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  cbo VARCHAR(10),
  nivel VARCHAR(20),
  salario_base DECIMAL(12,2),
  salario_teto DECIMAL(12,2),
  periculosidade BOOLEAN DEFAULT false,
  insalubridade VARCHAR(20),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SINDICATOS
CREATE TABLE IF NOT EXISTS sindicatos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  cnpj CHAR(14),
  codigo_sindical VARCHAR(20),
  data_base DATE,
  contribuicao_percentual DECIMAL(5,2),
  email VARCHAR(255),
  telefone VARCHAR(20),
  endereco TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_empresas_cnpj ON empresas(cnpj);
CREATE INDEX IF NOT EXISTS idx_empresas_status ON empresas(status);
CREATE INDEX IF NOT EXISTS idx_departamentos_empresa ON departamentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_cargos_empresa ON cargos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_sindicatos_empresa ON sindicatos(empresa_id);
