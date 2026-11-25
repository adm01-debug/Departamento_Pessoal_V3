/**
 * ============================================================================
 * GRADE SEMANAL — o que o refino visual NÃO pode perder.
 * ============================================================================
 *
 * Três invariantes que a vitrine aprovada exige e que nenhum teste de dados
 * cobria:
 *
 *   1. TODA célula (turno, folga explícita e "sem escala") tem a MESMA altura —
 *      é o que mantém a grade alinhada como planilha;
 *   2. "Folga" (registro com status de folga) e "sem escala cadastrada" (nada
 *      lançado) continuam sendo estados DIFERENTES — a grade nunca inventa folga;
 *   3. o card do turno mostra bolinha na cor do turno + nome + faixa completa
 *      (`08:00 – 17:00`), e o dia com duas escalas ganha o selo "+1";
 *   4. o card do turno é pintado pela cor CADASTRADA em três camadas (fundo +
 *      gradiente + borda) e organiza o miolo em duas linhas, com o horário na
 *      coluna do nome; a célula sem escala segue neutra e centrada.
 *
 * Nada aqui mede pixel: a geometria real é validada no navegador
 * (`tmp-turnos/refino-visual.mjs`). O teste trava os CONTRATOS.
 * ============================================================================
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { CalendarioSemanal } from '../CalendarioSemanal';
import { intervaloDoPeriodo } from '../turnosCalendario';
import {
  FILTROS_ESCALAS_INICIAIS,
  montarLinhasCalendario,
  type EscalaRegistro,
  type MembroEquipe,
  type TurnoRegistro,
} from '../turnosMetricas';

/** Semana de 02/11/2026 (segunda) a 08/11/2026 (domingo). */
const PERIODO = intervaloDoPeriodo('semana', new Date(2026, 10, 5));

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

const EQUIPE: MembroEquipe[] = [
  { id: 'c1', nome_completo: 'Ana Souza', departamento: 'Logística' },
  { id: 'c2', nome_completo: 'Bruno Lima', departamento: 'RH' },
  { id: 'c3', nome_completo: 'Carla Dias', departamento: 'Logística' },
];

const ESCALAS: EscalaRegistro[] = [
  // Ana: turno de verdade na segunda.
  { id: 'e1', data: '2026-11-02', status: 'agendado', colaborador_id: 'c1', turno_id: 't-adm' },
  // Bruno: FOLGA explícita na segunda (não é "sem escala").
  { id: 'e2', data: '2026-11-02', status: 'folga', colaborador_id: 'c2', turno_id: 't-adm' },
  // Carla: DUAS escalas na terça (selo "+1").
  { id: 'e3', data: '2026-11-03', status: 'agendado', colaborador_id: 'c3', turno_id: 't-adm' },
  { id: 'e4', data: '2026-11-03', status: 'agendado', colaborador_id: 'c3', turno_id: 't-noite' },
];

function renderizar() {
  const linhas = montarLinhasCalendario({ equipe: EQUIPE, escalas: ESCALAS, filtros: FILTROS_ESCALAS_INICIAIS });
  return render(
    <CalendarioSemanal
      periodo={PERIODO}
      linhas={linhas}
      turnos={TURNOS}
      onAbrirEscala={vi.fn()}
      onCriarEscala={vi.fn()}
      podeGerenciar
    />
  );
}

describe('CalendarioSemanal — grade compacta', () => {
  it('mostra o card do turno com a faixa completa de horário', () => {
    renderizar();

    const card = screen.getByLabelText('Ana Souza · Segunda-feira 02/11: Administrativo, 08:00 – 17:00');
    expect(card).toBeInTheDocument();
    expect(card).toHaveTextContent('Administrativo');
    expect(card).toHaveTextContent('08:00 – 17:00');
  });

  it('pinta a bolinha do card com a cor cadastrada do turno', () => {
    renderizar();

    const card = screen.getByLabelText('Ana Souza · Segunda-feira 02/11: Administrativo, 08:00 – 17:00');
    // A bolinha é o único `span` do card com estilo inline (cor do turno).
    const bolinha = card.querySelector('span[style]');
    expect(bolinha?.getAttribute('style') ?? '').toContain('rgb(34, 197, 94)');
  });

  it('distingue folga explícita de célula sem escala e mantém a MESMA altura', () => {
    renderizar();

    const folga = screen.getByLabelText('Bruno Lima · Segunda-feira 02/11: folga');
    expect(folga).toHaveTextContent('Folga');

    const semEscala = screen.getByLabelText('Bruno Lima · Terça-feira 03/11: sem escala cadastrada');
    expect(semEscala).not.toHaveTextContent('Folga');

    const card = screen.getByLabelText('Ana Souza · Segunda-feira 02/11: Administrativo, 08:00 – 17:00');
    // Altura ÚNICA (`h-full min-h-[2.4rem]`) = a grade não ondula entre colunas.
    for (const celula of [card, folga, semEscala]) {
      expect(celula.className).toContain('h-full');
      expect(celula.className).toContain('min-h-[2.4rem]');
    }
  });

  it('marca o dia com mais de uma escala com o selo de excedente', () => {
    renderizar();

    const card = screen.getByLabelText('Carla Dias · Terça-feira 03/11: Administrativo, 08:00 – 17:00');
    expect(card).toHaveTextContent('+1');
  });

  it('pinta o card em três camadas com os alfas da cor cadastrada do turno', () => {
    renderizar();

    const card = screen.getByLabelText('Ana Souza · Segunda-feira 02/11: Administrativo, 08:00 – 17:00');

    // Camada 1 (cor de fundo) + camada 2 (gradiente vertical) + camada 3 (borda).
    expect(card.className).toContain('bg-[var(--celula-fundo)]');
    expect(card.className).toContain('bg-[linear-gradient(160deg,var(--celula-topo),var(--celula-base))]');
    expect(card.className).toContain('border-[color:var(--celula-borda)]');

    // Os alfas saem da cor cadastrada (#22c55e): nem tinta invisível (o defeito
    // do card "da cor do painel") nem cor cheia.
    expect(card.style.getPropertyValue('--celula-topo')).toBe('rgba(34, 197, 94, 0.34)');
    expect(card.style.getPropertyValue('--celula-base')).toBe('rgba(34, 197, 94, 0.15)');
    expect(card.style.getPropertyValue('--celula-borda')).toBe('rgba(34, 197, 94, 0.55)');
  });

  it('acende fundo e borda no hover por alfa, com transição curta (sem mover a grade)', () => {
    renderizar();

    const card = screen.getByLabelText('Ana Souza · Segunda-feira 02/11: Administrativo, 08:00 – 17:00');

    expect(card.style.getPropertyValue('--celula-fundo-hover')).toBe('rgba(34, 197, 94, 0.18)');
    expect(card.style.getPropertyValue('--celula-borda-hover')).toBe('rgba(34, 197, 94, 0.8)');
    expect(card.className).toContain('hover:bg-[var(--celula-fundo-hover)]');
    expect(card.className).toContain('hover:border-[color:var(--celula-borda-hover)]');
    // Só COR: nada de transform/scale (deslocaria a célula na grade).
    expect(card.className).toContain('transition-[background-color,border-color]');
    expect(card.className).not.toMatch(/hover:(scale|translate)/);
    // Movimento reduzido desliga a transição.
    expect(card.className).toContain('motion-reduce:transition-none');
  });

  it('distribui o miolo em duas linhas: nome em destaque e horário na coluna do nome', () => {
    renderizar();

    const card = screen.getByLabelText('Ana Souza · Segunda-feira 02/11: Administrativo, 08:00 – 17:00');
    const nome = card.querySelector('span.truncate.font-semibold');
    const horario = card.querySelector('span.truncate.tabular-nums');

    expect(nome).not.toBeNull();
    expect(horario).not.toBeNull();
    // O horário alinha com o NOME (coluna 2 do grid), não com a bolinha.
    expect(horario?.className).toContain('col-start-2');
    // Pior caso do catálogo ("Administrativo") não trunca no degrau pequeno.
    expect(nome?.className).toContain('min-w-0');
    expect(nome?.className).toContain('truncate');
    // Degrau de leitura pela largura da CÉLULA (container query), nunca por viewport.
    expect(nome?.className).toContain('@min-[121px]:text-[10px]');
    expect(horario?.className).toContain('@min-[121px]:text-[9px]');
    expect(card.className).not.toMatch(/min-\[(1024|1280|1440)px\]/);
  });

  it('mantém a célula sem escala neutra, centrada e sem tinta de turno', () => {
    renderizar();

    const semEscala = screen.getByLabelText('Bruno Lima · Terça-feira 03/11: sem escala cadastrada');

    // Nenhuma CSS var de turno: a célula vazia não é pintada de cor nenhuma.
    expect(semEscala.getAttribute('style')).toBeNull();
    expect(semEscala.className).toContain('items-center');
    expect(semEscala.className).toContain('justify-center');
    expect(semEscala.className).toContain('bg-muted/10');
    expect(semEscala.className).toContain('text-muted-foreground');
  });
});
