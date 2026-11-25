/**
 * ============================================================================
 * GRADE MENSAL — o que o refinamento não pode perder.
 * ============================================================================
 *
 * A grade mensal deixou de ser "decorativa e quase invisível" e passou a abrir
 * o detalhe do dia num modal. Estes testes travam os contratos:
 *
 *   1. cada dia é um BOTÃO (o clique abre o modal) com `aria-pressed` do dia
 *      aberto — o estado selecionado não é só cor;
 *   2. dia com escala e dia sem escala se distinguem por borda/tinta E por
 *      texto ("N escalas" × "Sem escala");
 *   3. hoje tem etiqueta própria ("Hoje"), que não depende de cor;
 *   4. nenhuma lista de detalhes é renderizada abaixo da grade — o clique não
 *      insere seção (a altura da página não muda).
 * ============================================================================
 */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { CalendarioMensal } from '../CalendarioMensal';
import { chaveData, intervaloDoPeriodo } from '../turnosCalendario';
import type { EscalaRegistro, TurnoRegistro } from '../turnosMetricas';

const TURNOS: TurnoRegistro[] = [
  {
    id: 't-adm',
    nome: 'Administrativo',
    cor: '#22c55e',
    horario_inicio: '08:00',
    horario_fim: '17:00',
    intervalo_minutos: 60,
    ativo: true,
  },
  {
    id: 't-noite',
    nome: 'Noturno',
    cor: '#8b5cf6',
    horario_inicio: '22:00',
    horario_fim: '06:00',
    intervalo_minutos: 30,
    ativo: true,
  },
];

/** Mês corrente — assim o dia de hoje está sempre na grade. */
const PERIODO = intervaloDoPeriodo('mes', new Date());
const HOJE = chaveData(new Date());
/** Outro dia do mês (com escala própria) para não confundir com o "hoje". */
const OUTRO_DIA = PERIODO.dias.find((dia) => dia !== HOJE) ?? HOJE;

const ESCALAS_POR_DIA = new Map<string, EscalaRegistro[]>([
  [
    HOJE,
    [
      {
        id: 'e1',
        data: HOJE,
        status: 'agendado',
        colaborador_id: 'c1',
        turno_id: 't-adm',
        colaborador: { nome_completo: 'Ana Souza', departamento: 'Logística' },
      },
      {
        id: 'e2',
        data: HOJE,
        status: 'agendado',
        colaborador_id: 'c2',
        turno_id: 't-noite',
        colaborador: { nome_completo: 'Bruno Lima', departamento: 'RH' },
      },
    ],
  ],
  [
    OUTRO_DIA,
    [
      {
        id: 'e3',
        data: OUTRO_DIA,
        status: 'agendado',
        colaborador_id: 'c3',
        turno_id: 't-adm',
        colaborador: { nome_completo: 'Carla Dias', departamento: 'Produto' },
      },
    ],
  ],
]);

function renderizar(selecionado: string | null = null) {
  const onSelecionarDia = vi.fn();
  render(
    <CalendarioMensal
      periodo={PERIODO}
      escalasPorDia={ESCALAS_POR_DIA}
      turnos={TURNOS}
      selecionado={selecionado}
      onSelecionarDia={onSelecionarDia}
    />
  );
  return { onSelecionarDia };
}

describe('CalendarioMensal — células e abertura do dia', () => {
  it('desenha um botão por dia do mês e abre o dia escolhido no clique', () => {
    const { onSelecionarDia } = renderizar();

    const celulaDoDia = screen.getByRole('button', { name: new RegExp(`: 2 escala\\(s\\)`) });
    fireEvent.click(celulaDoDia);

    expect(onSelecionarDia).toHaveBeenCalledWith(HOJE);
  });

  it('distingue dia com escala de dia sem escala sem depender só da cor', () => {
    renderizar();

    // Dia com escala (e que não é hoje): borda mais forte + quantidade escrita.
    const comEscala = screen.getByRole('button', { name: /: 1 escala\(s\)/ });
    expect(comEscala.className).toContain('border-border/70');
    expect(comEscala).toHaveTextContent('1 escala');

    // Qualquer outro dia do mês está vazio: borda base + texto "Sem escala".
    const semEscala = screen.getAllByRole('button', { name: /: 0 escala\(s\)/ })[0];
    expect(semEscala.className).toContain('border-border/50');
    expect(semEscala).toHaveTextContent('Sem escala');
  });

  it('marca o dia de hoje com etiqueta própria, além da cor', () => {
    renderizar();

    const hoje = screen.getByRole('button', { name: /: 2 escala\(s\) — hoje/ });
    expect(hoje).toHaveTextContent('Hoje');
    expect(hoje.className).toContain('border-primary/45');
  });

  it('marca o dia aberto no modal com anel e `aria-pressed`', () => {
    renderizar(HOJE);

    const hoje = screen.getByRole('button', { name: /: 2 escala\(s\)/ });
    expect(hoje).toHaveAttribute('aria-pressed', 'true');
    expect(hoje.className).toContain('ring-2');

    const outroDia = screen.getAllByRole('button', { name: /: 0 escala\(s\)/ })[0];
    expect(outroDia).toHaveAttribute('aria-pressed', 'false');
    expect(outroDia.className).not.toContain('ring-2');
  });

  it('não renderiza lista de detalhes abaixo da grade', () => {
    renderizar();

    expect(screen.queryByText(/escala\(s\)$/)).not.toBeInTheDocument();
    expect(screen.queryByText('Nenhuma escala cadastrada neste dia.')).not.toBeInTheDocument();
  });
});
