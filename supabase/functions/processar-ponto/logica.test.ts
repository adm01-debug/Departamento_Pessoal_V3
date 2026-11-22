// deno test supabase/functions/processar-ponto/logica.test.ts
import { assert, assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { apurarDia, fmt, minutosNoturnos, timeToMin } from './logica.ts';
import type { BatidaDia, JornadaDia } from './logica.ts';

const jornada = (extra: Partial<JornadaDia> = {}): JornadaDia => ({
  minutos: 480,
  entradaEsperada: timeToMin('08:00'),
  intervaloMin: 60,
  toleranciaMin: 10,
  ...extra,
});

const b = (data: string, hora: string, tipo: 'entrada' | 'saida'): BatidaDia => ({ data, hora, tipo });

Deno.test('etapa 70 — dia corrente aberto NAO vira falta', () => {
  // Entrada so, sem saida, no proprio dia: jornada aberta.
  const r = apurarDia([b('2026-11-22', '08:00', 'entrada')], '2026-11-22', jornada(), false, true);
  assertEquals(r.incompleto, true);
  assertEquals(r.faltaMin, 0, 'dia em andamento nao pode medir falta');
});

Deno.test('etapa 70 — dia passado com batida impar MEDE falta', () => {
  const r = apurarDia([b('2026-11-21', '08:00', 'entrada')], '2026-11-21', jornada(), false, false);
  assertEquals(r.incompleto, true);
  assertEquals(r.faltaMin, 480, 'dia encerrado sem saida e falta integral');
});

Deno.test('etapa 70 — dia corrente completo nao vira falta nem sobra', () => {
  const r = apurarDia(
    [b('2026-11-22', '08:00', 'entrada'), b('2026-11-22', '17:00', 'saida')],
    '2026-11-22', jornada(), false, true,
  );
  assertEquals(r.incompleto, false);
  assertEquals(r.totalMin, 540);
  assertEquals(r.faltaMin, 0);
  assertEquals(r.extra50Min, 60);
});

Deno.test('etapa 70 — dia corrente com zero batidas nao vira falta pelo calculo', () => {
  const r = apurarDia([], '2026-11-22', jornada(), false, true);
  assertEquals(r.faltaMin, 480, 'sem batida nenhuma o status e sem_registro, nao falta');
});