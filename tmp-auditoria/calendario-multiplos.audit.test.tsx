import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CalendarioTurmasDialog } from '../src/components/treinamentos/CalendarioTurmasDialog';
import { montarTurmas, type CursoTurma } from '../src/components/treinamentos/turmasDerivacoes';

const CURSO: CursoTurma = {
  id: 'curso-1',
  nome: 'Excel Avançado',
  categoria: 'Ferramentas',
  modalidade: 'presencial',
  carga_horaria: 20,
};

const TURMAS = montarTurmas(
  [
    { id: 'aula-3', curso_id: 'curso-1', data_inicio: '2026-09-15T13:00:00Z', status: 'planejado' },
    { id: 'aula-1', curso_id: 'curso-1', data_inicio: '2026-09-15T09:00:00Z', status: 'planejado' },
    { id: 'aula-2', curso_id: 'curso-1', data_inicio: '2026-09-15T11:00:00Z', status: 'em_curso' },
  ],
  [CURSO],
  [],
  new Date(2026, 8, 20)
);

describe('auditoria — calendário com várias turmas no mesmo dia', () => {
  it('mostra até dois chips ordenados por horário e sinaliza o excedente', () => {
    render(
      <CalendarioTurmasDialog
        open
        onOpenChange={vi.fn()}
        mesInicial={new Date(2026, 8, 14)}
        turmas={TURMAS}
        onAbrirTurma={vi.fn()}
      />
    );

    const dialogo = screen.getByRole('dialog');
    const dia = [...dialogo.querySelectorAll('[data-calendario-dia]')].find((el) => {
      const data = new Date(el.getAttribute('data-calendario-dia') as string);
      return data.getFullYear() === 2026 && data.getMonth() === 8 && data.getDate() === 15;
    });
    expect(dia).not.toBeNull();
    const chips = [...(dia?.querySelectorAll('[data-calendario-turma]') ?? [])];
    expect(chips).toHaveLength(2);
    expect(dia?.textContent).toContain('+1 turma(s)');
    expect(new Set(chips.map((c) => c.getAttribute('data-calendario-turma'))).size).toBe(2);
  });
});
