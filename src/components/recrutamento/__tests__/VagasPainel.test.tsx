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

function renderizar(vagas: VagaRow[] = VAGAS) {
  return render(
    <VagasPainel
      vagas={vagas}
      candidaturas={[] as CandidaturaComRelacoes[]}
      onGerenciar={vi.fn()}
      onVerAnalises={vi.fn()}
      onExcluir={vi.fn()}
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
});
