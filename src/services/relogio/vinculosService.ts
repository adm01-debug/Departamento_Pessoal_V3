import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

/**
 * Vínculo funcionário do relógio (AtecSoft/Henry) -> colaborador do DP e de-para
 * das justificativas. Leitura direta (RLS: admin/RH da empresa); escrita só pelas
 * RPCs SECURITY DEFINER da migration 20261121221000_ponto_rep_vinculos.sql.
 */

export type VinculoMetodo = 'cpf' | 'pis' | 'matricula' | 'manual';

export const TIPOS_DIA_RELOGIO = [
  'normal',
  'feriado',
  'compensado',
  'folga',
  'falta',
  'atestado',
  'ferias',
  'licenca',
] as const;
export type TipoDiaRelogio = (typeof TIPOS_DIA_RELOGIO)[number];

export interface FuncionarioRelogio {
  id: string;
  dispositivoId: string;
  codigo: number;
  nome: string | null;
  /** Só os 4 últimos dígitos: `authenticated` não tem GRANT de SELECT no CPF
   * completo de `ponto_rep_funcionarios` (migration 20261122110000) — o banco
   * nunca entrega o CPF inteiro, não é só mascaramento de UI. */
  cpfLast4: string | null;
  matricula: string | null;
  situacao: string | null;
  colaboradorId: string | null;
  colaboradorNome: string | null;
  vinculoMetodo: VinculoMetodo | null;
  vinculadoEm: string | null;
}

export interface ColaboradorOpcao {
  id: string;
  nomeCompleto: string;
  cpfLast4: string | null;
  matricula: string | null;
  status: string;
}

export interface JustificativaRelogio {
  id: string;
  dispositivoId: string;
  codigo: number;
  nome: string;
  consideraNormal: boolean;
  consideraFalta: boolean;
  tipoDia: TipoDiaRelogio | null;
}

/** Colaboradores com contrato vigente (desligado/pendente não entram na escolha). */
const STATUS_ELEGIVEIS = ['ativo', 'ferias', 'afastado'] as const;

export function mascararCpfLast4(last4: string | null | undefined): string {
  return last4 ? `***.***.*${last4.slice(0, 2)}-${last4.slice(2)}` : '—';
}

function comoMetodo(valor: string | null): VinculoMetodo | null {
  return valor === 'cpf' || valor === 'pis' || valor === 'matricula' || valor === 'manual' ? valor : null;
}

function comoTipoDia(valor: string | null): TipoDiaRelogio | null {
  return (TIPOS_DIA_RELOGIO as readonly string[]).includes(valor ?? '') ? (valor as TipoDiaRelogio) : null;
}

export const vinculosRelogioService = {
  async listarFuncionarios(empresaId: string): Promise<FuncionarioRelogio[]> {
    const { data, error } = await supabase
      .from('ponto_rep_funcionarios')
      .select(
        'id, dispositivo_id, codigo, nome, cpf_last4, matricula, situacao, colaborador_id, vinculo_metodo, vinculado_em, colaborador:colaboradores!ponto_rep_funcionarios_colaborador_id_fkey(nome_completo)'
      )
      .eq('empresa_id', empresaId)
      .order('nome', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id,
      dispositivoId: row.dispositivo_id,
      codigo: row.codigo,
      nome: row.nome,
      cpfLast4: row.cpf_last4,
      matricula: row.matricula,
      situacao: row.situacao,
      colaboradorId: row.colaborador_id,
      colaboradorNome: row.colaborador?.nome_completo ?? null,
      vinculoMetodo: comoMetodo(row.vinculo_metodo),
      vinculadoEm: row.vinculado_em,
    }));
  },

  async listarColaboradoresElegiveis(empresaId: string): Promise<ColaboradorOpcao[]> {
    const { data, error } = await supabase
      .from('colaboradores')
      .select('id, nome_completo, cpf_last4, matricula, status')
      .eq('empresa_id', empresaId)
      .in('status', [...STATUS_ELEGIVEIS])
      .order('nome_completo', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id,
      nomeCompleto: row.nome_completo,
      cpfLast4: row.cpf_last4,
      matricula: row.matricula,
      status: row.status,
    }));
  },

  async listarJustificativas(empresaId: string): Promise<JustificativaRelogio[]> {
    const { data, error } = await supabase
      .from('ponto_rep_justificativas')
      .select('id, dispositivo_id, codigo, nome, considera_normal, considera_falta, tipo_dia')
      .eq('empresa_id', empresaId)
      .order('codigo', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id,
      dispositivoId: row.dispositivo_id,
      codigo: row.codigo,
      nome: row.nome,
      consideraNormal: row.considera_normal,
      consideraFalta: row.considera_falta,
      tipoDia: comoTipoDia(row.tipo_dia),
    }));
  },

  async vincular(funcionarioId: string, colaboradorId: string): Promise<void> {
    const { error } = await supabase.rpc('vincular_funcionario_relogio', {
      _funcionario_id: funcionarioId,
      _colaborador_id: colaboradorId,
    });
    if (error) throw error;
  },

  async desvincular(funcionarioId: string): Promise<void> {
    const { error } = await supabase.rpc('desvincular_funcionario_relogio', {
      _funcionario_id: funcionarioId,
    });
    if (error) throw error;
  },

  async definirTipoDia(justificativaId: string, tipoDia: TipoDiaRelogio | null): Promise<void> {
    // O gerador tipa argumento text como `string`; a RPC aceita NULL ("Sem efeito").
    const { error } = await supabase.rpc('definir_tipo_dia_justificativa_relogio', {
      _justificativa_id: justificativaId,
      _tipo_dia: tipoDia,
    } as unknown as Database['public']['Functions']['definir_tipo_dia_justificativa_relogio']['Args']);
    if (error) throw error;
  },
};
