import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { criarCandidatura } from './candidatosFixture';

/**
 * A moldura animada é substituída por um contêiner simples: o que este teste
 * cobre é o CONTEÚDO da janela (identificação, contato, etapa atual, rodapé) e
 * não a coreografia do `AnimatePresence` — essa já é compartilhada e testada no
 * Design System (`ui/cascade-motion.ts`).
 */
vi.mock('@/components/ui/cascade-dialog', () => ({
  CascadeDialogFrame: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <div role="dialog">{children}</div> : null,
}));

vi.mock('@radix-ui/react-dialog', () => ({
  Title: ({ children, className }: { children: ReactNode; className?: string }) => (
    <h2 className={className}>{children}</h2>
  ),
  Description: ({ children, className }: { children: ReactNode; className?: string }) => (
    <p className={className}>{children}</p>
  ),
}));

vi.mock('@/components/recrutamento/CandidatoTimeline', () => ({
  CandidatoTimeline: ({ candidaturaId }: { candidaturaId: string }) => (
    <div data-testid="historico">{`Histórico de ${candidaturaId}`}</div>
  ),
}));

import { CandidatoDetalhesDialog } from '../CandidatoDetalhesDialog';

function montar(candidatura = criarCandidatura(), onClose = vi.fn(), onAvancar = vi.fn()) {
  return render(
    <CandidatoDetalhesDialog
      open
      candidatura={candidatura}
      onClose={onClose}
      onAvancar={onAvancar}
    />
  );
}

describe('CandidatoDetalhesDialog', () => {
  it('mostra identificação, cargo, departamento e etapa atual', () => {
    montar();
    expect(screen.getByText('Ana Souza')).toBeInTheDocument();
    expect(screen.getByText('Desenvolvedor(a) Full Stack Sênior')).toBeInTheDocument();
    expect(screen.getByText('Tecnologia')).toBeInTheDocument();
    // Etapa aparece no selo do cabeçalho e no resumo do indicador.
    expect(screen.getAllByText('Triagem').length).toBeGreaterThan(0);
    expect(screen.getByTestId('historico')).toHaveTextContent('Histórico de cand-1');
  });

  it('destaca SOMENTE a etapa efetiva do candidato no indicador', () => {
    const { container } = montar(criarCandidatura({ etapa: 'teste' }));
    const atuais = container.querySelectorAll('[aria-current="step"]');
    expect(atuais).toHaveLength(1);
    expect(atuais[0]).toHaveTextContent(/Teste/);
    // Cinco segmentos, um por etapa do Pipeline.
    const etapas = container.querySelectorAll('ol[aria-label="Etapas do processo seletivo"] li');
    expect(etapas).toHaveLength(5);
  });

  it('não inventa contato ausente (nem "N/A")', () => {
    const semTelefone = criarCandidatura();
    semTelefone.candidato = { ...semTelefone.candidato!, telefone: null };
    montar(semTelefone);
    expect(screen.getByText('ana@email.com')).toBeInTheDocument();
    expect(screen.queryByText(/N\/A/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\d{4,}-\d{4}/)).not.toBeInTheDocument();
  });

  it('mantém o telefone quando o e-mail não existe', () => {
    const semEmail = criarCandidatura();
    semEmail.candidato = { ...semEmail.candidato!, email: null };
    montar(semEmail);
    expect(screen.getByText('(11) 99999-0000')).toBeInTheDocument();
    expect(screen.queryByText('ana@email.com')).not.toBeInTheDocument();
  });

  it('omite o score quando a candidatura não tem nota', () => {
    montar(criarCandidatura({ nota_geral: null }));
    expect(screen.queryByText(/Score/)).not.toBeInTheDocument();
  });

  it('rotula o avanço com a próxima etapa real', () => {
    montar(criarCandidatura({ etapa: 'entrevista' }));
    expect(screen.getByText('Avançar para Teste Técnico')).toBeInTheDocument();
  });

  it('não oferece avanço na última etapa', () => {
    montar(criarCandidatura({ etapa: 'contratado' }));
    expect(screen.queryByText(/Avançar para/)).not.toBeInTheDocument();
  });

  it('aciona fechar e avançar pelos mesmos callbacks da página', () => {
    const onClose = vi.fn();
    const onAvancar = vi.fn();
    montar(criarCandidatura({ etapa: 'triagem' }), onClose, onAvancar);

    fireEvent.click(screen.getByText('Fechar'));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Avançar para Entrevista'));
    expect(onAvancar).toHaveBeenCalledTimes(1);
  });

  it('não renderiza conteúdo com a janela fechada', () => {
    render(
      <CandidatoDetalhesDialog open={false} candidatura={criarCandidatura()} onClose={vi.fn()} onAvancar={vi.fn()} />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
