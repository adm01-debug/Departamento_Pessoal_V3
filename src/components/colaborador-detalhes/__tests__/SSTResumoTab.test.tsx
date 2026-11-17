import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { CatSSTColaborador, IncidenteSSTColaborador, RiscoSSTColaborador } from '@/hooks/useSSTColaborador';

vi.mock('@/hooks/useSSTColaborador', () => ({
  useIncidentesColaborador: vi.fn(),
  useCatColaborador: vi.fn(),
  useRiscosColaborador: vi.fn(),
}));

import { useCatColaborador, useIncidentesColaborador, useRiscosColaborador } from '@/hooks/useSSTColaborador';
import { SSTResumoTab } from '../SSTResumoTab';

const INCIDENTE: IncidenteSSTColaborador = {
  id: 'inc-1',
  data_hora: '2026-05-20T13:30:00Z',
  tipo: 'Quase acidente',
  gravidade: 3,
  status: 'encerrado',
};

const CAT: CatSSTColaborador = {
  id: 'cat-1',
  data_acidente: '2026-05-20',
  tipo_acidente: 'Típico',
  tipo_cat: 'Inicial',
  status_esocial: 'transmitido',
};

const RISCO: RiscoSSTColaborador = {
  id: 'risco-1',
  agente_nocivo_codigo: '01.01.001',
  epi_eficaz: true,
  status_esocial: 'transmitido',
  data_inicio_exposicao: '2024-02-01',
  data_fim_exposicao: null,
};

type Estado<T> = { data?: T[]; isLoading?: boolean; isError?: boolean };

function renderizar(estado: {
  incidentes?: Estado<IncidenteSSTColaborador>;
  cats?: Estado<CatSSTColaborador>;
  riscos?: Estado<RiscoSSTColaborador>;
}) {
  const normalizar = <T,>(e: Estado<T> | undefined) => ({
    data: e && 'data' in e ? e.data : [],
    isLoading: e?.isLoading ?? false,
    isError: e?.isError ?? false,
  });
  vi.mocked(useIncidentesColaborador).mockReturnValue(normalizar(estado.incidentes) as never);
  vi.mocked(useCatColaborador).mockReturnValue(normalizar(estado.cats) as never);
  vi.mocked(useRiscosColaborador).mockReturnValue(normalizar(estado.riscos) as never);
  return render(<SSTResumoTab colaboradorId="col-1" />);
}

describe('SSTResumoTab', () => {
  it('mostra skeleton enquanto qualquer consulta carrega, sem estado vazio', () => {
    renderizar({ incidentes: { isLoading: true } });
    expect(screen.getByTestId('sst-skeleton')).toBeInTheDocument();
    expect(screen.queryByText(/Nenhum registro de SST/i)).not.toBeInTheDocument();
  });

  it('sem nenhum registro mostra o vazio honesto, não conformidade', () => {
    renderizar({});
    expect(screen.getByText('Nenhum registro de SST para este colaborador.')).toBeInTheDocument();
    expect(screen.queryByText(/conformidade/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/nenhum risco/i)).not.toBeInTheDocument();
  });

  it('consulta ainda não resolvida (hook desabilitado) não vira "nenhum registro de SST"', () => {
    // React Query v5: query com `enabled: false` devolve isLoading=false,
    // isError=false e data=undefined. É o estado real desta tela enquanto
    // `empresaAtual` não resolve (useSSTColaborador.ts:92/103).
    renderizar({
      incidentes: { data: undefined },
      cats: { data: undefined },
      riscos: { data: undefined },
    });
    expect(screen.queryByText('Nenhum registro de SST para este colaborador.')).not.toBeInTheDocument();
    expect(screen.getByTestId('sst-skeleton')).toBeInTheDocument();
  });

  it('falha de consulta não vira "nenhum registro de SST"', () => {
    renderizar({ incidentes: { isError: true, data: undefined } });
    expect(screen.getByText(/Não foi possível carregar os incidentes/i)).toBeInTheDocument();
    expect(screen.queryByText('Nenhum registro de SST para este colaborador.')).not.toBeInTheDocument();
  });

  it('falha em uma consulta preserva o que as outras trouxeram', () => {
    renderizar({ cats: { isError: true, data: undefined }, incidentes: { data: [INCIDENTE] } });
    expect(screen.getByText(/Não foi possível carregar as CAT/i)).toBeInTheDocument();
    expect(screen.getByText(/Quase acidente/)).toBeInTheDocument();
  });

  it('trata gravidade como inteiro da escala 1-5, com rótulo da escala', () => {
    renderizar({ incidentes: { data: [INCIDENTE] } });
    expect(screen.getByText('Gravidade 3 — Moderado')).toBeInTheDocument();
    expect(screen.getByText('encerrado')).toBeInTheDocument();
  });

  it('gravidade fora da escala mostra o valor cru, sem rótulo inventado', () => {
    renderizar({ incidentes: { data: [{ ...INCIDENTE, id: 'inc-9', gravidade: 9 }] } });
    expect(screen.getByText('Gravidade 9')).toBeInTheDocument();
  });

  it('gravidade nula não vira nível nenhum', () => {
    renderizar({ incidentes: { data: [{ ...INCIDENTE, id: 'inc-2', gravidade: null }] } });
    expect(screen.getByText('Gravidade não informada')).toBeInTheDocument();
    expect(screen.queryByText(/Trivial/)).not.toBeInTheDocument();
  });

  it('lista CAT com data e situação no eSocial', () => {
    renderizar({ cats: { data: [CAT] } });
    expect(screen.getByText(/Típico — 20\/05\/2026/)).toBeInTheDocument();
    expect(screen.getByText('CAT Inicial')).toBeInTheDocument();
    expect(screen.getByText('transmitido')).toBeInTheDocument();
  });

  it('status_esocial nulo na CAT não vira "pendente"', () => {
    renderizar({ cats: { data: [{ ...CAT, id: 'cat-2', status_esocial: null }] } });
    expect(screen.getByText('Situação no eSocial não informada')).toBeInTheDocument();
    expect(screen.queryByText(/pendente/i)).not.toBeInTheDocument();
  });

  it('lista risco com agente, início e eficácia do EPI', () => {
    renderizar({ riscos: { data: [RISCO] } });
    expect(screen.getByText(/01\.01\.001/)).toBeInTheDocument();
    expect(screen.getByText(/desde 01\/02\/2024/)).toBeInTheDocument();
    expect(screen.getByText(/sem término registrado/)).toBeInTheDocument();
    expect(screen.getByText('EPI eficaz')).toBeInTheDocument();
  });

  it('epi_eficaz nulo não afirma que o EPI protege', () => {
    renderizar({ riscos: { data: [{ ...RISCO, id: 'risco-2', epi_eficaz: null }] } });
    expect(screen.getByText('Eficácia do EPI não avaliada')).toBeInTheDocument();
    expect(screen.queryByText('EPI eficaz')).not.toBeInTheDocument();
  });

  it('seção vazia ao lado de seção com dado mostra vazio só da sua seção', () => {
    renderizar({ incidentes: { data: [INCIDENTE] } });
    expect(screen.getByText('Nenhuma CAT emitida para este colaborador.')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma exposição a risco registrada para este colaborador.')).toBeInTheDocument();
  });
});
