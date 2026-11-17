import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CandidaturaComRelacoes, VagaRow } from '@/types/recrutamento';
import { VagasPainel } from '../VagasPainel';

const BASE: VagaRow = {
  id: 'vaga-1',
  empresa_id: 'empresa-1',
  titulo: 'Desenvolvedor(a) Full Stack Sênior',
  cargo: 'Desenvolvedor Full Stack',
  departamento: 'Tecnologia',
  modalidade: 'Remoto',
  tipo_contrato: 'CLT',
  descricao: null,
  requisitos: 'React, TypeScript',
  status: 'aberta',
  quantidade: 1,
  faixa_salarial_min: null,
  faixa_salarial_max: null,
  data_abertura: '2026-09-01',
  data_encerramento: null,
  beneficios_oferecidos: null,
  responsavel_id: null,
  created_at: '2026-09-01T12:00:00Z',
  updated_at: '2026-09-01T12:00:00Z',
};

const VAGAS: VagaRow[] = [
  { ...BASE, id: 'v1', titulo: 'Vaga 1', status: 'aberta' },
  { ...BASE, id: 'v2', titulo: 'Vaga 2', status: 'aberta', departamento: 'Comercial' },
  { ...BASE, id: 'v3', titulo: 'Vaga 3', status: 'fechada', data_encerramento: '2026-09-05' },
];

function renderizar(vagas: VagaRow[] = VAGAS, extras: { erro?: boolean; retry?: () => void } = {}) {
  return render(
    <VagasPainel
      vagas={vagas}
      candidaturas={[] as CandidaturaComRelacoes[]}
      onGerenciar={vi.fn()}
      onEditar={vi.fn()}
      onVerAnalises={vi.fn()}
      onExcluir={vi.fn()}
      erro={extras.erro}
      onTentarNovamente={extras.retry}
    />
  );
}

describe('VagasPainel — indicadores e filtros rápidos', () => {
  it('calcula os três indicadores e mostra um card por vaga', () => {
    const { container } = renderizar();
    expect(screen.getByRole('button', { name: /Todas: 3 vagas/i })).toHaveTextContent('3');
    expect(screen.getByRole('button', { name: /Abertas: 2 vagas/i })).toHaveTextContent('2');
    expect(screen.getByRole('button', { name: /Fechadas: 1 vaga/i })).toHaveTextContent('1');
    expect(container.querySelectorAll('[data-vaga-card]')).toHaveLength(3);
    expect(screen.queryByText('Criar Nova Vaga')).not.toBeInTheDocument();
  });

  it('usa os indicadores como filtros e compartilha o estado com o select de status', async () => {
    const { container } = renderizar();

    await userEvent.click(screen.getByRole('button', { name: /Abertas: 2 vagas/i }));
    expect(container.querySelectorAll('[data-vaga-card]')).toHaveLength(2);
    expect(screen.getByRole('button', { name: /Abertas: 2 vagas/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveTextContent('Abertas');

    await userEvent.click(screen.getByRole('button', { name: /Fechadas: 1 vaga/i }));
    expect(container.querySelectorAll('[data-vaga-card]')).toHaveLength(1);
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveTextContent('Fechadas');

    await userEvent.click(screen.getByRole('button', { name: /Todas: 3 vagas/i }));
    expect(container.querySelectorAll('[data-vaga-card]')).toHaveLength(3);
  });

  it('explica o estado vazio sem criar funcionalidade fictícia', () => {
    const { container } = renderizar([]);
    expect(container.querySelectorAll('[data-vaga-card]')).toHaveLength(0);
    expect(screen.getByText('Nenhuma vaga cadastrada.')).toBeInTheDocument();
    expect(screen.queryByText('Criar Nova Vaga')).not.toBeInTheDocument();
  });

  it('distingue erro de vazio: não afirma "nenhuma vaga" nem mostra contador quando a consulta falha', async () => {
    const retry = vi.fn();
    const { container } = renderizar([], { erro: true, retry });

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar as vagas');
    expect(screen.queryByText('Nenhuma vaga cadastrada.')).not.toBeInTheDocument();
    expect(screen.queryByText('Nenhuma vaga encontrada.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Todas: 0 vagas/i })).not.toBeInTheDocument();
    expect(container.querySelector('[data-vagas-empty]')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
