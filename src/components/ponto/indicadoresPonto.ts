/**
 * @fileoverview Cálculo dos indicadores da semana do "Meu Ponto".
 *
 * Os quatro números saem de `registros_ponto` do colaborador logado nos últimos
 * 7 dias — são indicadores REAIS, não métricas de vitrine:
 *  - Pontualidade: entradas no horário sobre entradas registradas;
 *  - Média diária: minutos trabalhados ÷ dias com registro;
 *  - Saldo da semana: extras − horas devidas;
 *  - Dias com registro: cobertura da semana (de 7).
 *
 * Dias sem registro ficam fora das duas primeiras contas: incluí-los como
 * "zero hora" puniria férias, feriado e folga como se fossem falta.
 *
 * Módulo separado (e sem JSX) porque o mesmo cálculo alimenta os KPI Cards da
 * página e os testes — a regra de negócio não pode morar dentro do componente
 * visual.
 */
import { CalendarCheck, Scale, Target, Timer, type LucideIcon } from 'lucide-react';
import type { MetricTone } from '@/components/dashboard/MetricCard';
import { formatarMinutosDuracao, minutosDeDuracao } from '@/utils/pontoDuracao';

/** Recorte de `registros_ponto` que estes indicadores leem. */
export interface RegistroIndicador {
  data?: string | null;
  entrada_1?: string | null;
  atraso_minutos?: number | null;
  horas_trabalhadas?: string | null;
  horas_extras?: string | null;
  horas_falta?: string | null;
}

/** Um KPI Card pronto para render (título, valor, descrição, ícone e tom). */
export interface IndicadorPonto {
  /** Chave estável — usada como `key` na lista. */
  chave: string;
  titulo: string;
  valor: string;
  descricao: string;
  icone: LucideIcon;
  tone: MetricTone;
  /** Vermelho vibrante do módulo (o mesmo dos débitos) no saldo negativo. */
  vividRed?: boolean;
}

/** Janela de referência dos indicadores. */
export const DIAS_NA_SEMANA = 7;

/**
 * Converte o recorte semanal em quatro KPI Cards.
 *
 * `useMemo` fica no call site: aqui é função pura, testável sem render.
 */
export function calcularIndicadoresPonto(registrosSemana: RegistroIndicador[] = []): IndicadorPonto[] {
  const comEntrada = registrosSemana.filter((registro) => !!registro?.entrada_1);
  const pontuais = comEntrada.filter((registro) => !Number(registro?.atraso_minutos)).length;
  const pontualidade = comEntrada.length > 0 ? Math.round((pontuais / comEntrada.length) * 100) : 0;

  const diasComRegistro = new Set(registrosSemana.map((registro) => registro?.data).filter(Boolean)).size;

  const totalTrabalhado = registrosSemana.reduce(
    (soma, registro) => soma + minutosDeDuracao(registro?.horas_trabalhadas ?? null),
    0
  );
  const mediaDiaria = diasComRegistro > 0 ? Math.round(totalTrabalhado / diasComRegistro) : 0;

  const saldoSemana = registrosSemana.reduce(
    (soma, registro) =>
      soma + minutosDeDuracao(registro?.horas_extras ?? null) - minutosDeDuracao(registro?.horas_falta ?? null),
    0
  );

  return [
    {
      chave: 'pontualidade',
      titulo: 'Pontualidade',
      valor: `${pontualidade}%`,
      descricao: 'Entradas no horário',
      icone: Target,
      tone: 'success',
    },
    {
      chave: 'media-diaria',
      titulo: 'Média diária',
      valor: formatarMinutosDuracao(mediaDiaria),
      descricao: 'Por dia com registro',
      icone: Timer,
      tone: 'info',
    },
    {
      chave: 'saldo-semana',
      titulo: 'Saldo da semana',
      valor: formatarMinutosDuracao(saldoSemana, { sinal: true }),
      descricao: 'Extras − devidas',
      icone: Scale,
      tone: saldoSemana < 0 ? 'destructive' : 'success',
      vividRed: saldoSemana < 0,
    },
    {
      chave: 'dias-com-registro',
      titulo: 'Dias com registro',
      valor: `${diasComRegistro} de ${DIAS_NA_SEMANA}`,
      descricao: 'Últimos 7 dias',
      icone: CalendarCheck,
      tone: 'primary',
    },
  ];
}
