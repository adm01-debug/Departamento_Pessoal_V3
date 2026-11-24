// Logica pura da apuracao do dia (sem I/O) — extraida de index.ts para poder
// ser testada com `deno test`. index.ts reaproveita tudo daqui; nada de
// comportamento novo.

const MINUTO = 1;
const NOITE_INI = 22 * 60; // 22:00
const NOITE_FIM = 5 * 60; // 05:00 (dia seguinte)

export const timeToMin = (t: string): number => {
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + (m || 0);
};

export const fmt = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

// Minutos trabalhados dentro do período noturno legal (22h–05h) de um
// intervalo [ini, fim) em minutos absolutos (fim pode passar de 1440).
export const minutosNoturnos = (ini: number, fim: number): number => {
  let total = 0;
  for (let s = ini; s < fim; s++) {
    const h = ((s % 1440) + 1440) % 1440;
    if (h >= NOITE_INI || h < NOITE_FIM) total += MINUTO;
  }
  return total;
};

export interface JornadaDia {
  minutos: number;
  entradaEsperada: number | null; // minutos
  intervaloMin: number;
  toleranciaMin: number;
  folga?: boolean; // grade marca o dia como não trabalhado → tudo é HE 100%
}

export interface BatidaDia {
  data: string;
  hora: string;
  tipo?: string | null;
  ordem?: number | null;
}

export interface ResultadoDia {
  totalMin: number;
  extra50Min: number;
  extra100Min: number;
  noturnoMin: number;
  faltaMin: number;
  atrasoMin: number;
  incompleto: boolean;
  // Slots do espelho em ordem cronológica: cada turno é {entrada, saida} — a
  // saída pode pertencer ao dia seguinte (virada) e uma entrada pendente
  // aparece com saida=null (nunca ocupa o slot de saída de outro turno).
  slots: Array<{ entrada: BatidaDia; saida: BatidaDia | null }>;
}

// Apura um dia: pares entrada/saída com suporte a virada de dia,
// tolerância "tudo ou nada" (art. 58 §1º — variação ≤ tolerância é
// desconsiderada por inteiro; acima dela conta-se tudo), HE 100% em
// domingo/feriado e minutos noturnos (22h–05h).
// `batidas` já vem ordenada (data, ordem) e pode conter o primeiro batida do
// dia seguinte — só fechamos pares cuja ENTRADA pertence a `dataRef`; um par
// que atravessa meia-noite pertence inteiro ao dia da entrada.
export const apurarDia = (
  batidas: BatidaDia[],
  dataRef: string,
  jornada: JornadaDia,
  ehDsr: boolean,
  diaEmAndamento: boolean,
): ResultadoDia => {
  const pares: Array<[number, number]> = [];
  const slots: Array<{ entrada: BatidaDia; saida: BatidaDia | null }> = [];
  let incompleto = false;
  for (let i = 0; i < batidas.length;) {
    const entrada = batidas[i];
    if (entrada.data !== dataRef) break; // batida seguinte abre jornada do próximo dia
    // Uma 'saida' na cabeça da fila nunca abre par — saída órfã/rejeitada
    // é quarentena, não entrada (senão 2 saídas viravam turno pagável).
    if (entrada.tipo === 'saida') {
      // Quarentena visível: a saída órfã aparece no espelho como slot
      // aberto — sumir com a batida reportava o dia como sem_registro.
      incompleto = true;
      slots.push({ entrada, saida: null });
      i += 1;
      continue;
    }
    const saida = batidas[i + 1];
    // Uma batida marcada 'entrada' nunca fecha o turno anterior — sem isso a
    // entrada do turno seguinte vira saída fake de uma jornada aberta (turno
    // fictício de 10h+). O turno fica aberto e a batida abre par próprio.
    if (!saida || saida.tipo === 'entrada') {
      incompleto = true;
      slots.push({ entrada, saida: null });
      if (!saida || saida.data !== dataRef) break;
      i += 1;
      continue;
    }
    const e = timeToMin(entrada.hora);
    let s = timeToMin(saida.hora);
    if (saida.data !== entrada.data) {
      // Saída em dia seguinte soma a diferença real de dias — s>e sem o
      // +1440 apagava 24h de turnos longos (08:00→10:00 do dia seguinte
      // contava 2h). Turno > 24h segue flaggeado como inconsistente.
      const dias = Math.round((Date.parse(saida.data) - Date.parse(entrada.data)) / 86400000);
      s += Math.max(1, dias) * 1440;
      if (s - e > 1440) {
        // Turno > 24h é dado inconsistente (quase sempre saída esquecida de
        // outro dia): vai a quarentena no espelho, nunca vira hora paga
        // nem crédito de banco de horas.
        incompleto = true;
        slots.push({ entrada, saida });
        i += 2;
        continue;
      }
    } else if (s <= e) {
      // Saída no MESMO dia com hora <= entrada = dado inconsistente
      // (batida fora de ordem/ajuste). Não inventa turno de 20h+: a
      // entrada fica pendente para revisão E a saída rejeitada é
      // consumida — deixá-la na cabeça da fila a transformava em entrada
      // do próximo par (turno falso pagável).
      incompleto = true;
      slots.push({ entrada, saida: null });
      i += 2;
      continue;
    }
    pares.push([e, s]);
    slots.push({ entrada, saida });
    i += 2;
  }

  const totalMin = pares.reduce((acc, [e, s]) => acc + (s - e), 0);
  const noturnoMin = pares.reduce((acc, [e, s]) => acc + minutosNoturnos(e, s), 0);

  let atrasoMin = 0;
  if (jornada.entradaEsperada !== null && pares.length > 0) {
    const delta = pares[0][0] - jornada.entradaEsperada;
    if (delta > jornada.toleranciaMin) atrasoMin = delta; // tudo ou nada
  }

  if (ehDsr) {
    // Domingo/feriado/folga trabalhado: tudo é HE 100% (DSR); sem falta/atraso.
    return { totalMin, extra50Min: 0, extra100Min: totalMin, noturnoMin, faltaMin: 0, atrasoMin: 0, incompleto, slots };
  }

  const brutoExtra = Math.max(0, totalMin - jornada.minutos);
  const extra50Min = brutoExtra > jornada.toleranciaMin ? brutoExtra : 0; // tudo ou nada
  // Jornada aberta no dia corrente ainda não configura falta — a saída pode
  // estar pendente. Dias passados com batida ímpar seguem com falta medida.
  const faltaMin = incompleto && diaEmAndamento ? 0 : Math.max(0, jornada.minutos - totalMin);
  return { totalMin, extra50Min, extra100Min: 0, noturnoMin, faltaMin, atrasoMin, incompleto, slots };
};
