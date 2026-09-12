import { supabase } from '@/integrations/supabase/client';

/**
 * Serviço de provisões mensais de folha (13º salário e férias + encargos).
 *
 * Regra contábil (CPC 25 / CLT):
 *  - 13º salário: 1/12 do salário base por mês trabalhado.
 *  - Férias: 1/12 do salário base acrescido do terço constitucional (Art. 7º, XVII CF).
 *  - Encargos: INSS patronal + RAT/FAP + Terceiros + FGTS incidentes sobre a provisão.
 */

/** Fallback explícito para chamadas puramente matemáticas legadas. */
export const ALIQUOTA_ENCARGOS_PROVISAO = 0.368;
const ALIQUOTA_FGTS = 0.08;
const ALIQUOTA_CPP = 0.2;

export interface ConfiguracaoEncargosEmpresa {
  regime_tributario: 'simples_nacional' | 'lucro_presumido' | 'lucro_real' | 'mei';
  rat: number | null;
  fap: number | null;
  terceiros: number | null;
  simples_anexo: 'I' | 'II' | 'III' | 'IV' | 'V' | null;
  aliquota_encargos_folha: number | null;
}

function taxaValida(value: number | null, fallback: number, field: string, maximum = 1): number {
  const normalized = value ?? fallback;
  if (!Number.isFinite(normalized) || normalized < 0 || normalized > maximum) {
    throw new Error(`Configuração de encargos inválida: ${field}`);
  }
  return normalized;
}

export function calcularAliquotaEncargosProvisao(config: ConfiguracaoEncargosEmpresa): number {
  if (config.aliquota_encargos_folha !== null) {
    return taxaValida(config.aliquota_encargos_folha, 0, 'alíquota efetiva de encargos');
  }
  if (config.regime_tributario === 'mei') {
    // MEI com empregado: 3% de CPP patronal + 8% de FGTS.
    return ALIQUOTA_FGTS + 0.03;
  }
  if (config.regime_tributario === 'simples_nacional') {
    if (!config.simples_anexo) {
      throw new Error('Anexo do Simples Nacional obrigatório para calcular encargos');
    }
    if (config.simples_anexo !== 'IV') return ALIQUOTA_FGTS;
    // No Anexo IV a CPP e o RAT/FAP ficam fora do DAS. Empresas optantes
    // pelo Simples não recolhem contribuições de terceiros neste cálculo.
    const rat = taxaValida(config.rat, 0.02, 'RAT', 0.03);
    const fap = taxaValida(config.fap, 1, 'FAP', 2);
    return ALIQUOTA_FGTS + ALIQUOTA_CPP + rat * fap;
  }
  if (config.regime_tributario !== 'lucro_presumido' && config.regime_tributario !== 'lucro_real') {
    throw new Error('Regime tributário sem regra de provisão homologada');
  }

  const rat = taxaValida(config.rat, 0.02, 'RAT', 0.03);
  const fap = taxaValida(config.fap, 1, 'FAP', 2);
  const terceiros = taxaValida(config.terceiros, 0.058, 'Terceiros', 0.2);
  const aliquota = ALIQUOTA_FGTS + ALIQUOTA_CPP + rat * fap + terceiros;
  if (aliquota > 1) throw new Error('Alíquota agregada de encargos excede 100%');
  return aliquota;
}

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
  aliquotaEncargos = ALIQUOTA_ENCARGOS_PROVISAO
): Pick<ProvisaoCalculada, 'valor_13_salario' | 'valor_ferias' | 'encargos_provisao' | 'valor_total'> {
  const base = Number.isFinite(salarioBase) && salarioBase > 0 ? salarioBase : 0;

  const valor13 = round2(base / 12);
  const valorFerias = round2((base / 12) * (1 + TERCO_CONSTITUCIONAL));
  const encargos = round2((valor13 + valorFerias) * aliquotaEncargos);

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

    const [{ data: empresa, error: empresaError }, { data: colaboradores, error }] = await Promise.all([
      supabase
        .from('empresas')
        .select('regime_tributario, rat, fap, terceiros, simples_anexo, aliquota_encargos_folha')
        .eq('id', empresaId)
        .maybeSingle(),
      supabase
        .from('colaboradores')
        .select('id, salario_base, nome_completo')
        .eq('empresa_id', empresaId)
        .eq('status', 'ativo'),
    ]);

    if (empresaError) throw empresaError;
    if (!empresa) throw new Error('Configuração tributária da empresa não encontrada');
    if (error) throw error;
    if (!colaboradores) return undefined;
    const aliquotaEncargos = calcularAliquotaEncargosProvisao(empresa as ConfiguracaoEncargosEmpresa);

    for (const colaborador of colaboradores) {
      const valores = calcularProvisaoColaborador(Number(colaborador.salario_base ?? 0), aliquotaEncargos);

      const payload: ProvisaoCalculada = {
        empresa_id: empresaId,
        colaborador_id: String(colaborador.id),
        competencia,
        ...valores,
      };

      const { error: upsertError } = await supabase
        .from('provisoes_folha')
        .upsert(payload, { onConflict: 'empresa_id,colaborador_id,competencia' });

      if (upsertError) throw upsertError;
    }

    return true;
  },
};
