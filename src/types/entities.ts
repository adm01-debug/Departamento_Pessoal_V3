import type { Database } from '@/integrations/supabase/types';

export interface Cargo {
  id: string;
  nome: string;
  descricao?: string;
  cbo?: string;
  nivel_hierarquico?: number;
  salario_base?: number;
  ativo?: boolean;
  empresa_id?: string;
  version?: number;
  created_at?: string;
}

export interface Departamento {
  id: string;
  nome: string;
  codigo_centro_custo?: string;
  departamento_pai_id?: string;
  ativo?: boolean;
  empresa_id?: string;
  created_at?: string;
}

export interface Empresa {
  id: string;
  nome_fantasia: string | null;
  razao_social: string;
  cnpj: string | null;
  inscricao_estadual?: string | null;
  inscricao_municipal?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  telefone?: string | null;
  email?: string | null;
  logo_url?: string | null;
  ativa?: boolean;
  ativo?: boolean; // added both for compatibility
  created_at?: string;
  updated_at?: string;
}


export interface Colaborador {
  id: string;
  nome_completo: string;
  cpf: string;
  email: string;
  status: Database['public']['Enums']['status_colaborador'];
  departamento?: string;
  cargo?: string;
  cargo_id?: string | null;
  cbo?: string | null;
  centro_custo_id?: string | null;
  centro_custo?: string | null;
  local_trabalho_id?: string | null;
  local_trabalho?: string | null;
  time_id?: string | null;
  jornada_semanal?: number | null;
  horario_entrada?: string | null;
  horario_saida?: string | null;
  horario_intervalo?: number | null;
  empresa_id: string;
  version?: number;
  created_at?: string;
  foto_url?: string;
  data_admissao?: string;
  salario_base?: number;
  cidade?: string;
  uf?: string;
  observacoes?: string;
  matricula?: string;
}


export interface Ferias {
  id: string;
  colaborador_id: string;
  data_inicio: string;
  data_fim: string;
  status: 'pendente' | 'aprovada' | 'rejeitada' | 'cancelada';
  empresa_id: string;
  created_at?: string;
  colaborador_nome?: string;
  colaborador?: {
    nome_completo: string;
    foto_url: string | null;
  };
}

export interface Documento {
  id: string;
  nome: string;
  url: string;
  tipo: string;
  colaborador_id?: string;
  empresa_id?: string;
  created_at?: string;
}

/** Funcionario — alias semântico para Colaborador (compatibilidade) */
export interface Funcionario extends Colaborador {
  matricula: string;
}

export interface Dependente {
  id: string;
  colaborador_id: string;
  nome_completo: string;
  cpf?: string;
  data_nascimento?: string;
  grau_parentesco?: string;
  irrf_dependente?: boolean;
  salario_familia?: boolean;
  created_at?: string;
}

export interface Endereco {
  id: string;
  colaborador_id?: string;
  empresa_id?: string;
  cep: string;
  logradouro: string;
  numero?: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  tipo?: string;
  created_at?: string;
}

export interface Periodo {
  dataInicio: string;
  dataFim: string;
}

