import { describe, expect, it } from 'vitest';
import {
  diasDaSemanaComTurmas,
  formatarDataTurma,
  formatarHoraTurma,
  formatarIntervaloSemana,
  inicioSemana,
  lerDataTurma,
  montarTurmas,
  type CursoTurma,
} from '../src/components/treinamentos/turmasDerivacoes';

const CURSO: CursoTurma = {
  id: 'curso-1',
  nome: 'Excel Avançado',
  categoria: 'Ferramentas',
  modalidade: 'presencial',
  carga_horaria: 20,
};

const turma = (id: string, data_inicio: string, data_fim?: string) => ({
  id,
  curso_id: 'curso-1',
  data_inicio,
  data_fim,
  status: 'planejado',
});

describe('auditoria — bordas de data', () => {
  it('coloca turmas no primeiro e no último dia do mês sem deslocamento', () => {
    const turmas = montarTurmas(
      [turma('primeiro', '2026-09-01T12:00:00Z'), turma('ultimo', '2026-09-30T12:00:00Z')],
      [CURSO],
      [],
      new Date(2026, 8, 20)
    );
    const semanaDoPrimeiro = diasDaSemanaComTurmas(turmas, new Date(2026, 8, 1));
    const semanaDoUltimo = diasDaSemanaComTurmas(turmas, new Date(2026, 8, 30));
    expect(semanaDoPrimeiro[1].turmas.map((t) => t.id)).toEqual(['primeiro']);
    expect(semanaDoUltimo[2].turmas.map((t) => t.id)).toEqual(['ultimo']);
    expect(formatarDataTurma('2026-09-01')).toBe('01/09/2026');
    expect(formatarDataTurma('2026-09-30')).toBe('30/09/2026');
  });

  it('usa SOMENTE data_inicio para posicionar a turma (data_fim não repete)', () => {
    const turmas = montarTurmas(
      [turma('atravessa', '2026-09-30T12:00:00Z', '2026-10-05T12:00:00Z')],
      [CURSO],
      [],
      new Date(2026, 8, 20)
    );
    const semanaDoInicio = diasDaSemanaComTurmas(turmas, new Date(2026, 8, 28));
    const semanaSeguinte = diasDaSemanaComTurmas(turmas, new Date(2026, 9, 5));
    expect(semanaDoInicio.flatMap((d) => d.turmas).map((t) => t.id)).toEqual(['atravessa']);
    expect(semanaSeguinte.flatMap((d) => d.turmas)).toEqual([]);
  });

  it('duas turmas no mesmo dia aparecem juntas, sem duplicação', () => {
    const turmas = montarTurmas(
      [turma('a', '2026-09-15T09:00:00Z'), turma('b', '2026-09-15T11:00:00Z')],
      [CURSO],
      [],
      new Date(2026, 8, 20)
    );
    const dias = diasDaSemanaComTurmas(turmas, new Date(2026, 8, 14));
    expect(dias[1].turmas).toHaveLength(2);
    expect(dias.flatMap((d) => d.turmas)).toHaveLength(2);
  });

  it('atravessa ano na semana e no rótulo', () => {
    const segunda = inicioSemana(new Date(2027, 0, 1));
    expect(segunda.getFullYear()).toBe(2026);
    expect(segunda.getMonth()).toBe(11);
    expect(segunda.getDate()).toBe(28);
    expect(formatarIntervaloSemana(segunda)).toBe('28 dez 2026 – 03 jan 2027');
  });

  it('preserva horário local próximo da meia-noite e data-only sem UTC', () => {
    expect(formatarDataTurma('2026-11-04')).toBe('04/11/2026');
    expect(formatarHoraTurma('2026-11-04T00:30:00-03:00')).toBe('00:30');
    expect(formatarDataTurma('2026-11-04T00:30:00-03:00')).toBe('04/11/2026');
  });

  it('data inválida: texto inválido vira null; data-only impossível ROULA (achado)', () => {
    expect(lerDataTurma('invalida')).toBeNull();
    expect(lerDataTurma(null)).toBeNull();
    const impossivel = lerDataTurma('2026-02-30');
    expect(impossivel).not.toBeNull();
    expect(formatarDataTurma('2026-02-30')).toBe('02/03/2026');
    expect(formatarDataTurma('2026-13-01')).toBe('01/01/2027');
  });
});
