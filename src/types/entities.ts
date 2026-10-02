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
  /** Vínculo com `auth.users` quando o colaborador tem acesso ao sistema. */
  user_id?: string | null;
  nome_completo: string;
  cpf: string;
  email: string;
  status: 'ativo' | 'afastado' | 'desligado';
  departamento?: string;
  cargo?: string;
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
  status:
    | 'pendente'
    | 'solicitada'
    | 'programada'
    | 'aprovada'
    | 'aprovado'
    | 'rejeitada'
    | 'em_gozo'
    | 'gozando'
    | 'em_andamento'
    | 'concluida'
    | 'vencida'
    | 'cancelada'
    | 'paga';
  empresa_id: string;
  created_at?: string;
  colaborador_nome?: string;
  aprovado_rh?: boolean | null;
  aprovado_gestor?: boolean | null;
  abono_pecuniario?: boolean | null;
  adiantamento_13?: boolean | null;
  adiantamento_13o?: boolean | null;
  aviso_pdf_url?: string | null;
  enviado_contabilidade?: boolean | null;
  cancelado?: boolean | null;
  pagamento_confirmado_em?: string | null;
  dias_gozo?: number;
  dias_ferias?: number | null;
  colaborador?: {
    nome_completo: string;
    foto_url?: string | null;
    cpf?: string;
    cargo?: string | null;
    departamento?: string | null;
  } | null;
}

/** ASO com embed de colaborador (select `colaborador:colaboradores(nome_completo, departamento)`). */
export type AsoComColaborador = import('@/integrations/supabase/database.types').Tables<'asos'> & {
  colaborador?: { nome_completo: string; departamento: string | null } | null;
};

/** Subconjunto de ASO usado em listagens/gráficos (fixtures de teste parciais compilam). */
export type AsoResumo = Pick<
  import('@/integrations/supabase/database.types').Tables<'asos'>,
  'id' | 'tipo' | 'data_exame' | 'data_validade' | 'medico_nome'
> & {
  colaborador?: { nome_completo?: string | null; departamento?: string | null } | null;
};

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
