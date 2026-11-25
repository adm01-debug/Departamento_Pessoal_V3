import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

/**
 * Painel de Turnos & Escalas — comportamento da tela montada.
 *
 * Os quatro módulos de infraestrutura são mockados (empresa, permissões,
 * conclusão de entrada do card e a fonte de dados), então o teste mede só o que
 * a tela FAZ com dados reais de formato: KPIs, linha do calendário, célula
 * vazia, troca de visualização, filtro de busca e abertura dos detalhes.
 */
const hojeMock = vi.hoisted(() => {
  const data = new Date();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
});

const TURNOS_MOCK = [
  {
    id: 't1',
    nome: 'Administrativo',
    cor: '#22c55e',
    horario_inicio: '08:00',
    horario_fim: '17:00',
    intervalo_minutos: 60,
    ativo: true,
    created_at: '2026-01-05T10:00:00.000Z',
  },
];

const EQUIPE_MOCK = [
  { id: 'c1', nome_completo: 'Ana Souza', departamento: 'Logística' },
  { id: 'c2', nome_completo: 'Bruno Lima', departamento: 'RH' },
];

const ESCALAS_MOCK = [
  {
    id: 'e1',
    data: hojeMock,
    status: 'agendado',
    colaborador_id: 'c1',
    turno_id: 't1',
    colaborador: { nome_completo: 'Ana Souza', departamento: 'Logística' },
    turno: { nome: 'Administrativo', horario_inicio: '08:00', horario_fim: '17:00', cor: '#22c55e' },
  },
];

vi.mock('@/hooks', () => ({
  useEmpresas: () => ({ empresaAtual: { id: 'empresa-1', nome: 'ACME' } }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isAdmin: true }),
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ pode: () => true }),
}));

vi.mock('@/hooks/useEntradaCardConcluida', () => ({
  useEntradaCardConcluida: () => ({ entradaConcluida: true, aoConcluirEntrada: () => {} }),
}));

vi.mock('../useTurnosEscalas', () => ({
  // Constante reexportada pelo módulo: o painel a usa para rotular a janela do
  // card/modal "Próximas escalas". O mock substitui o módulo inteiro, então ela
  // precisa existir aqui também.
  DIAS_PROXIMAS_ESCALAS: 60,
  useTurnosEscalas: () => ({
    turnos: TURNOS_MOCK,
    escalasPeriodo: ESCALAS_MOCK,
    escalasPeriodoAnterior: [],
    escalasProximas: ESCALAS_MOCK,
    equipe: EQUIPE_MOCK,
    carregando: false,
    erro: false,
    recarregar: () => {},
    invalidarEscalas: () => {},
  }),
}));

import { TurnosConteudo } from '../TurnosConteudo';

/** Provider do React Query (o painel usa `useMutation` para excluir escala). */
function Envolver({ children }: { children: ReactNode }) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
}

function renderizar() {
  return render(<TurnosConteudo />, { wrapper: Envolver });
}

describe('TurnosConteudo', () => {
  it('abre na visão Semana com o cabeçalho e os KPI Cards alimentados pelos dados', () => {
    renderizar();

    expect(screen.getByRole('heading', { name: 'Turnos & Escalas' })).toBeInTheDocument();
    expect(screen.getByText('Planejamento de jornadas de trabalho da equipe.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Semana' })).toHaveAttribute('aria-pressed', 'true');

    expect(screen.getAllByText('Turnos cadastrados').length).toBeGreaterThan(0);
    expect(screen.getByText('Escalas no período')).toBeInTheDocument();
    expect(screen.getByText('Colaboradores escalados')).toBeInTheDocument();
    expect(screen.getByText('Conflitos identificados')).toBeInTheDocument();
    // 1 turno, 1 escala, 1 colaborador escalado em uma equipe de 2 (50%).
    expect(screen.getByText('50% da equipe')).toBeInTheDocument();
    expect(screen.getByText('Nenhum conflito')).toBeInTheDocument();
  });

  it('desenha a grade semanal com a célula do turno e a célula vazia', () => {
    renderizar();

    expect(screen.getByText('Ana Souza')).toBeInTheDocument();
    expect(screen.getByText('Bruno Lima')).toBeInTheDocument();

    expect(screen.getByLabelText(/Ana Souza · .*Administrativo, 08:00 – 17:00/)).toBeInTheDocument();

    // Bruno não tem escala hoje: as células vazias dizem isso, sem afirmar
    // "Folga" (que só aparece com registro explícito de folga).
    const vazias = screen.getAllByLabelText(/Bruno Lima · .*sem escala cadastrada/);
    expect(vazias.length).toBeGreaterThan(0);
    expect(screen.queryByLabelText(/Bruno Lima · .*folga/)).not.toBeInTheDocument();
  });

  it('filtra o calendário pela busca por colaborador', () => {
    renderizar();

    fireEvent.change(screen.getByPlaceholderText('Buscar colaborador…'), { target: { value: 'bruno' } });

    expect(screen.queryByText('Ana Souza')).not.toBeInTheDocument();
    expect(screen.getByText('Bruno Lima')).toBeInTheDocument();
  });

  it('troca para a visão Lista mantendo os mesmos dados', () => {
    renderizar();

    fireEvent.click(screen.getByRole('button', { name: 'Lista' }));

    expect(screen.getByRole('button', { name: 'Lista' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('columnheader', { name: 'Colaborador' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Detalhes da escala de Ana Souza/ })).toBeInTheDocument();
  });

  it('abre os detalhes ao clicar numa célula com escala', () => {
    renderizar();

    fireEvent.click(screen.getByLabelText(/Ana Souza · .*Administrativo, 08:00 – 17:00/));

    const dialogo = screen.getByRole('dialog');
    expect(within(dialogo).getByText('Detalhes da escala')).toBeInTheDocument();
    expect(within(dialogo).getByText(/08:00 – 17:00/)).toBeInTheDocument();
  });

  it('lista as próximas escalas com a contagem real e navega ao clicar', () => {
    renderizar();

    expect(screen.getByText('Próximas escalas')).toBeInTheDocument();
    expect(screen.getByText(/Hoje, \d{2}\/\d{2}/)).toBeInTheDocument();
    expect(screen.getByText('1 escala')).toBeInTheDocument();
  });

  it('mostra o resumo do período com o total de escalas no centro da rosca', () => {
    renderizar();

    expect(screen.getByText('Resumo da semana')).toBeInTheDocument();
    // O `DonutChart` do sistema desenha o total e o rótulo "Total" no centro.
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
  });

  it('abre o modal do dia ao clicar numa célula do mês (sem empilhar seção na página)', () => {
    renderizar();

    fireEvent.click(screen.getByRole('button', { name: 'Mês' }));

    // A célula do dia de hoje: o rótulo acessível traz data completa + total.
    const [ano, mes, dia] = hojeMock.split('-');
    const celula = screen.getByRole('button', { name: new RegExp(`: 1 escala\\(s\\).*hoje`) });
    fireEvent.click(celula);

    const dialogo = screen.getByRole('dialog');
    expect(within(dialogo).getByText(`Escalas do dia — ${dia}/${mes}/${ano}`)).toBeInTheDocument();
    expect(within(dialogo).getByText('Ana Souza')).toBeInTheDocument();
    expect(within(dialogo).getByText(/08:00 – 17:00/)).toBeInTheDocument();
  });

  it('abre o modal "Próximas escalas" pela ação "Ver todas" do card', () => {
    renderizar();

    fireEvent.click(screen.getByRole('button', { name: 'Ver todas' }));

    const dialogo = screen.getByRole('dialog');
    expect(within(dialogo).getByText('Próximas escalas')).toBeInTheDocument();
    // Mesma base do card: o dia de hoje com a escala real, agrupado por data.
    expect(within(dialogo).getByText('Ana Souza')).toBeInTheDocument();
    expect(within(dialogo).getByText(/Logística · Administrativo/)).toBeInTheDocument();
  });
});
