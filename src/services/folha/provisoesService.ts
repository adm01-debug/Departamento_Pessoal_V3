import { supabase } from '@/integrations/supabase/client';

/**
 * Serviço de provisões mensais de folha (13º salário e férias + encargos).
 *
 * Regra contábil (CPC 25 / CLT):
 *  - 13º salário: 1/12 do salário base por mês trabalhado.
 *  - Férias: 1/12 do salário base acrescido do terço constitucional (Art. 7º, XVII CF).
 *  - Encargos: INSS patronal + RAT/FAP + Terceiros + FGTS incidentes sobre a provisão.
 */

/** Alíquota agregada de encargos patronais sobre provisões (INSS 20% + Terceiros 5,8% + RAT 1% + FGTS 8%). */
export const ALIQUOTA_ENCARGOS_PROVISAO = 0.348;

/** Terço constitucional de férias. */
const TERCO_CONSTITUCIONAL = 1 / 3;

export interface ProvisaoCalculada {
  empresa_id: string;
  colaborador_id: string;
  competencia: string;
  valor_13_salario: number;
  valor_ferias: number;
  encargos_provisao: number;
  valor_total: number;
}

/** Arredonda para 2 casas evitando erro de ponto flutuante binário. */
function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calcularProvisaoColaborador(
  salarioBase: number,
): Pick<ProvisaoCalculada, 'valor_13_salario' | 'valor_ferias' | 'encargos_provisao' | 'valor_total'> {
  const base = Number.isFinite(salarioBase) && salarioBase > 0 ? salarioBase : 0;

  const valor13 = round2(base / 12);
  const valorFerias = round2((base / 12) * (1 + TERCO_CONSTITUCIONAL));
  const encargos = round2((valor13 + valorFerias) * ALIQUOTA_ENCARGOS_PROVISAO);

  return {
    valor_13_salario: valor13,
    valor_ferias: valorFerias,
    encargos_provisao: encargos,
    valor_total: round2(valor13 + valorFerias + encargos),
  };
}

export const provisoesService = {
  /**
   * Calcula e persiste as provisões de todos os colaboradores ativos da empresa.
   * Retorna `undefined` quando a consulta não retorna registros (falha/erro de leitura)
   * e `true` quando o processamento é concluído.
   */
  async calcularProvisoesMensais(empresaId: string, competencia: string): Promise<true | undefined> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    if (!competencia) throw new Error('competência obrigatória');

    const { data: colaboradores, error } = await (supabase as any)
      .from('colaboradores')
      .select('id, salario_base, nome_completo')
      .eq('empresa_id', empresaId)
      .eq('status', 'ativo');

    if (error) throw error;
    if (!colaboradores) return undefined;

    for (const colaborador of colaboradores as Array<Record<string, unknown>>) {
      const valores = calcularProvisaoColaborador(Number(colaborador.salario_base ?? 0));

      const payload: ProvisaoCalculada = {
        empresa_id: empresaId,
        colaborador_id: String(colaborador.id),
        competencia,
        ...valores,
      };

      const { error: upsertError } = await (supabase as any)
        .from('provisoes_folha')
        .upsert(payload, { onConflict: 'empresa_id,colaborador_id,competencia' });

      if (upsertError) throw upsertError;
    }

    return true;
  },
};
