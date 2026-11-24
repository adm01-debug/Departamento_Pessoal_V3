// V19-QA: Supabase Database Types - Re-export from official types
import type { Database as SupabaseDatabase } from './types';

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = SupabaseDatabase;

// Helper types for table operations
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Insertable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type Updatable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

// Common entity types - mapped from real tables
export type Empresa = Tables<'empresas'>;
export type Colaborador = Tables<'colaboradores'>;
export type Departamento = Tables<'departamentos'> | { id: string; empresa_id: string; nome: string; descricao: string | null; codigo: string | null; ativo: boolean; created_at: string };
export type Cargo = Tables<'rubricas_folha'> | { id: string; empresa_id: string; nome: string; descricao: string | null; cbo: string | null; salario_base: number | null; ativo: boolean; created_at: string };
export type FolhaPagamento = Tables<'folhas_pagamento'>;
export type Ferias = Tables<'ferias'>;
export type PontoRegistro = Tables<'registros_ponto'>;
export type Beneficio = Tables<'tipos_beneficio'> | { id: string; empresa_id: string; nome: string; tipo: string; valor_padrao: number | null; ativo: boolean; created_at: string };
export type Auditoria = Tables<'audit_log'> | { 
  id: string; 
  empresa_id: string | null; 
  usuario_id: string; 
  usuario_nome?: string;
  acao: string; 
  tabela: string | null; 
  registro_id: string | null; 
  dados_anteriores: Json | null; 
  dados_novos: Json | null; 
  created_at: string;
  ip_address?: string | null;
  user_agent?: string | null;
};
