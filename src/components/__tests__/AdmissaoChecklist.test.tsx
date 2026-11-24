import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdmissaoChecklist, Documento } from '../admissao/AdmissaoChecklist';

const DOCS: Documento[] = [
  { id: '1', nome: 'RG', obrigatorio: true, status: 'validado' },
  { id: '2', nome: 'CPF', obrigatorio: true, status: 'pendente' },
  { id: '3', nome: 'Carteira de Trabalho', obrigatorio: false, status: 'enviado' },
];

describe('AdmissaoChecklist', () => {
  it('renders the checklist title', () => {
    render(<AdmissaoChecklist documentos={DOCS} />);
    expect(screen.getByText('Checklist de Admissão')).toBeInTheDocument();
  });

  it('shows correct progress count', () => {
    render(<AdmissaoChecklist documentos={DOCS} />);
    expect(screen.getByText('1/3 Concluídos')).toBeInTheDocument();
  });

  it('renders all document names', () => {
    render(<AdmissaoChecklist documentos={DOCS} />);
    expect(screen.getByText('RG')).toBeInTheDocument();
    expect(screen.getByText('CPF')).toBeInTheDocument();
    expect(screen.getByText('Carteira de Trabalho')).toBeInTheDocument();
  });

  it('shows "Obrigatório" badge for required documents', () => {
    render(<AdmissaoChecklist documentos={DOCS} />);
    const badges = screen.getAllByText('Obrigatório');
    expect(badges).toHaveLength(2); // RG and CPF are required
  });

  it('renders with empty documents list', () => {
    render(<AdmissaoChecklist documentos={[]} />);
    expect(screen.getByText('0/0 Concluídos')).toBeInTheDocument();
  });

  it('shows 0 progress when all pending', () => {
    const allPending: Documento[] = [
      { id: '1', nome: 'Doc 1', obrigatorio: true, status: 'pendente' },
      { id: '2', nome: 'Doc 2', obrigatorio: true, status: 'pendente' },
    ];
    render(<AdmissaoChecklist documentos={allPending} />);
    expect(screen.getByText('0/2 Concluídos')).toBeInTheDocument();
  });

  it('shows 100% when all validated', () => {
    const allValid: Documento[] = [
      { id: '1', nome: 'Doc 1', obrigatorio: true, status: 'validado' },
      { id: '2', nome: 'Doc 2', obrigatorio: true, status: 'validado' },
    ];
    render(<AdmissaoChecklist documentos={allValid} />);
    expect(screen.getByText('2/2 Concluídos')).toBeInTheDocument();
  });
});
