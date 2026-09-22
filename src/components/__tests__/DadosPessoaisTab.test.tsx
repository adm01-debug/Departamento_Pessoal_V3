import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }),
}));

vi.mock('@/hooks/useColaboradorDetalhes', () => ({
  useDependentes: vi.fn(() => ({ data: [{ id: 'd1', nome: 'Ana Silva', parentesco: 'Filho(a)', cpf: '123.456.789-00', ir: true, salario_familia: false, incapacidade_fisica_mental: false }], isLoading: false })),
  useCriarDependente: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useExcluirDependente: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useContatosEmergencia: vi.fn(() => ({ data: [{ id: 'e1', nome: 'Maria Silva', parentesco: 'Cônjuge', telefone: '(31) 3333-4444', celular: '', email: '' }], isLoading: false })),
  useCriarContatoEmergencia: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useAtualizarContatoEmergencia: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useExcluirContatoEmergencia: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeficiencia: vi.fn(() => ({ data: null, isLoading: false })),
  useSalvarDeficiencia: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDadosEstrangeiro: vi.fn(() => ({ data: null, isLoading: false })),
  useSalvarDadosEstrangeiro: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useCamposCustomizados: vi.fn(() => ({ data: [{ id: 'c1', nome: 'Tamanho de Camiseta', tipo: 'texto' }], isLoading: false })),
  useValoresCamposCustomizados: vi.fn(() => ({ data: [{ campo_customizado_id: 'c1', valor: 'M' }], isLoading: false })),
  useSalvarValorCampoCustomizado: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div role="dialog">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: any) => children,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <button>{children}</button>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder || ''}</span>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
}));

import { DadosPessoaisTab } from '../colaborador-detalhes/DadosPessoaisTab';

const COLABORADOR = {
  nome_completo: 'Ana Beatriz Souza',
  nome_social: null,
  cpf: '11122233344',
  rg: '44.556.778-9',
  data_nascimento: '1995-08-12',
  estado_civil: 'solteiro',
  email_pessoal: 'ana.beatriz@email.com',
  telefone: '(11) 3333-4444',
  celular: '(11) 99999-8888',
  cep: '01310-100',
  logradouro: 'Av. Paulista',
  numero: '1000',
  complemento: 'Apto 84',
};

function renderTab() {
  return render(
    <MemoryRouter>
      <DadosPessoaisTab colaboradorId="col-1" colaborador={COLABORADOR} />
    </MemoryRouter>
  );
}

describe('DadosPessoaisTab', () => {
  it('renders the summary cards row', () => {
    renderTab();
    expect(screen.getAllByText('Dependentes').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Contatos de emergência')).toBeInTheDocument();
    expect(screen.getAllByText('PCD').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Estrangeiro').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Campos customizados')).toBeInTheDocument();
    expect(screen.getAllByText('1 cadastrado').length).toBe(2);
    expect(screen.getAllByText('Não se aplica').length).toBe(2);
  });

  it('renders the Identificação Pessoal card with colaborador fields', () => {
    renderTab();
    expect(screen.getByText('Identificação Pessoal')).toBeInTheDocument();
    expect(screen.getByText('Ana Beatriz Souza')).toBeInTheDocument();
    expect(screen.getByText('44.556.778-9')).toBeInTheDocument();
    expect(screen.getByText('Solteiro(a)')).toBeInTheDocument();
  });

  it('shows the full formatted CPF in Identificação Pessoal', () => {
    renderTab();
    expect(screen.queryByText('11122233344')).not.toBeInTheDocument();
    expect(screen.getByText('111.222.333-44')).toBeInTheDocument();
  });

  it('renders the Contato e Endereço card with colaborador fields', () => {
    renderTab();
    expect(screen.getByText('Contato e Endereço')).toBeInTheDocument();
    expect(screen.getByText('ana.beatriz@email.com')).toBeInTheDocument();
    expect(screen.getByText('Av. Paulista')).toBeInTheDocument();
    expect(screen.getByText('Apto 84')).toBeInTheDocument();
  });

  it('renders the Dependentes and Contatos de Emergência blocks', () => {
    renderTab();
    expect(screen.getByText('Ana Silva')).toBeInTheDocument();
    expect(screen.getByText('Maria Silva')).toBeInTheDocument();
  });

  it('renders the combined PCD e Estrangeiro block with both sections', () => {
    renderTab();
    expect(screen.getByText('PCD e Estrangeiro')).toBeInTheDocument();
    expect(screen.getByText('É PCD?')).toBeInTheDocument();
    expect(screen.getByText('É estrangeiro?')).toBeInTheDocument();
  });

  it('renders the Campos Customizados block', () => {
    renderTab();
    expect(screen.getByText('Campos Customizados')).toBeInTheDocument();
    expect(screen.getByText('Tamanho de Camiseta')).toBeInTheDocument();
  });
});
