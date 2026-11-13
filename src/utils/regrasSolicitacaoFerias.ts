import { differenceInCalendarDays, parseISO } from 'date-fns';

/** Antecedência mínima do aviso de férias (Art. 135 CLT). */
export const DIAS_AVISO_FERIAS = 30;

export interface FeriasLancada {
  periodo_aquisitivo_id: string | null;
  dias_gozo: number;
  dias_abono: number | null;
  status: string | null;
}

export interface UsoPeriodo {
  /** Dias consumidos (gozo + abono) por férias não rejeitadas/canceladas. */
  usado: number;
  /** Dias de abono pecuniário já convertidos no período. */
  abonoUsado: number;
  /** Partes já lançadas (critério de validar_split_ferias: conta todas as linhas). */
  partes: number;
  maiorParte: number;
}

export const USO_VAZIO: UsoPeriodo = { usado: 0, abonoUsado: 0, partes: 0, maiorParte: 0 };

export function resumirUsoPorPeriodo(lancadas: FeriasLancada[]): Map<string, UsoPeriodo> {
  const mapa = new Map<string, UsoPeriodo>();
  for (const f of lancadas) {
    if (!f.periodo_aquisitivo_id) continue;
    const atual = mapa.get(f.periodo_aquisitivo_id) ?? { ...USO_VAZIO };
    atual.partes += 1;
    atual.maiorParte = Math.max(atual.maiorParte, f.dias_gozo);
    if (f.status !== 'rejeitada' && f.status !== 'cancelada') {
      atual.usado += f.dias_gozo + (f.dias_abono ?? 0);
      atual.abonoUsado += f.dias_abono ?? 0;
    }
    mapa.set(f.periodo_aquisitivo_id, atual);
  }
  return mapa;
}

/** Saldo, abono (Art. 143) e fracionamento (Art. 134 §1º) do período. Retorna a mensagem de erro ou null. */
export function validarSaldoFerias(params: {
  diasDireito: number;
  uso: UsoPeriodo;
  diasGozo: number;
  diasAbono: number;
}): string | null {
  const { diasDireito, uso, diasGozo, diasAbono } = params;
  const saldo = diasDireito - uso.usado;
  if (diasGozo + diasAbono > saldo) {
    return `Dias de gozo + abono excedem o direito disponível no período (saldo ${Math.max(saldo, 0)} de ${diasDireito} dias).`;
  }
  const limiteAbono = Math.floor(diasDireito / 3);
  if (uso.abonoUsado + diasAbono > limiteAbono) {
    return `Abono pecuniário limitado a 1/3 do direito do período: ${limiteAbono} dias (já convertidos ${uso.abonoUsado}) — Art. 143 CLT.`;
  }
  if (uso.partes >= 3) {
    return 'Este período aquisitivo já tem 3 períodos de férias (máximo — Art. 134 §1º CLT).';
  }
  const temParteDe14 = Math.max(uso.maiorParte, diasGozo) >= 14;
  if (uso.partes >= 1 && !temParteDe14) {
    return 'Ao fracionar, um dos períodos deve ter no mínimo 14 dias corridos (Art. 134 §1º CLT).';
  }
  const restante = saldo - diasGozo - diasAbono;
  if (!temParteDe14 && restante > 0 && restante < 14) {
    return `Este fracionamento deixa ${restante} dias no período, sem como cumprir o período mínimo de 14 dias corridos (Art. 134 §1º CLT).`;
  }
  return null;
}

/** Bloqueia início no passado (hoje no formato yyyy-MM-dd). */
export function validarInicioFerias(dataInicio: string, hoje: string): string | null {
  return dataInicio && dataInicio < hoje ? 'A data de início não pode estar no passado.' : null;
}

/** Aviso (não bloqueante) quando o início está a menos de 30 dias (Art. 135 CLT). */
export function avisoAntecedenciaFerias(dataInicio: string, hoje: string): string | null {
  if (!dataInicio || dataInicio < hoje) return null;
  const dias = differenceInCalendarDays(parseISO(dataInicio), parseISO(hoje));
  return dias < DIAS_AVISO_FERIAS
    ? `Início em ${dias} dia(s): o aviso de férias deve ser dado com ${DIAS_AVISO_FERIAS} dias de antecedência (Art. 135 CLT).`
    : null;
}
