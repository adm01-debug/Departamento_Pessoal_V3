/**
 * ============================================================================
 * EDIÇÃO NOS FILTROS NORMAIS — uma ação por card, formulário reutilizado.
 *
 * O que se prova:
 *   • a LISTA oferece SOMENTE "Editar feedback" (nenhum controle de aprovação);
 *   • o clique entrega o registro ao formulário existente;
 *   • o formulário abre preenchido (todos os campos originais);
 *   • salvar envia os dados alterados com `status: 'pendente'` (reabertura
 *     explícita — concluída não é alterada em silêncio);
 *   • a permissão da ação é RH/admin (gestor sozinho não edita).
 * ============================================================================
 */
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const historicoMock = vi.hoisted(() => ({ eventos: [] as unknown[] }));
// O card consulta o histórico compartilhado; este dublê permite provar tanto o
// estado vazio quanto a justificativa real no card.
vi.mock('@/components/avaliacao/useHistoricoFeedback', () => ({
  useHistoricoFeedback: () => ({ data: historicoMock.eventos, isLoading: false, error: null }),
}));

import { FeedbackCard } from '@/components/avaliacao/FeedbackCard';
import { NovoFeedbackDialog } from '@/components/avaliacao/NovoFeedbackDialog';
import { derivarFeedbacks } from '@/components/avaliacao/feedbacksComum';
import { normalizarFeedback, type FeedbackCanonico } from '@/components/avaliacao/feedbackCanonico';

function canonico(extra: Record<string, unknown> = {}, papeis: string[] = ['admin']): FeedbackCanonico {
  const f = {
    id: 'f-edit',
    empresa_id: 'emp-1',
    ciclo_id: 'ciclo-1',
    avaliado_id: 'colab-1',
    avaliador_id: 'colab-2',
    tipo: 'gestor',
    nota_geral: 4,
    potencial: 5,
    status: 'concluido',
    pontos_fortes: 'Entrega consistente',
    pontos_melhoria: 'Delegar mais',
    comentarios: 'Bom ciclo',
    avaliado: { nome_completo: 'Ana Souza' },
    avaliador: { nome_completo: 'Bruno Lima' },
    created_at: '2026-10-01T12:00:00.000Z',
    ...extra,
  };
  const derivado = derivarFeedbacks([f], {
    colaboradores: [{ id: 'colab-1', nome_completo: 'Ana Souza', cargo: 'Analista', departamento: 'RH' }],
    ciclos: [{ id: 'ciclo-1', nome: 'Ciclo S1 2026', data_fim: '2026-06-30' }],
  })[0];
  return normalizarFeedback(derivado, {
    cicloNome: 'Ciclo S1 2026',
    papeis,
    acoesHabilitadas: true,
    podeVerColaborador: true,
  });
}

describe('filtros normais — somente Editar feedback', () => {
  beforeEach(() => {
    historicoMock.eventos = [];
  });

  it('o card tem a ação de edição e NENHUM controle de aprovação', () => {
    const onEditar = vi.fn();
    render(<FeedbackCard item={canonico()} onEditar={onEditar} />);

    const editar = screen.getByRole('button', { name: 'Editar feedback' });
    expect(editar).toBeEnabled();
    ['Ver avaliação', 'Devolver para correção', 'Aprovar avaliação', 'Enviar ao gestor'].forEach((nome) =>
      expect(screen.queryByRole('button', { name: nome })).toBeNull()
    );

    fireEvent.click(editar);
    expect(onEditar).toHaveBeenCalledTimes(1);
    expect(onEditar.mock.calls[0][0]).toMatchObject({ avaliado: 'Ana Souza' });
  });

  it('cancelado NÃO pode ser editado: ação desabilitada e clique não abre o formulário', () => {
    const onEditar = vi.fn();
    render(<FeedbackCard item={canonico({ status: 'cancelado' })} onEditar={onEditar} />);

    const editar = screen.getByRole('button', { name: 'Editar feedback' });
    expect(editar).toBeDisabled();
    expect(editar).toHaveAttribute('title', expect.stringMatching(/cancelado/i));
    fireEvent.click(editar);
    expect(onEditar).not.toHaveBeenCalled();

    // Sem evento local na simulação: o card é honesto e não inventa motivo.
    expect(screen.getByText('Motivo do cancelamento')).toBeInTheDocument();
    expect(screen.getByText('Motivo não registrado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver histórico' })).toBeInTheDocument();
  });

  it('cancelado exibe no card o motivo e o responsável vindos do histórico', () => {
    historicoMock.eventos = [
      {
        id: 'ev-cancel',
        tipo: 'cancelado',
        ocorridoEm: '2026-10-02T12:00:00Z',
        responsavelId: null,
        responsavelEmail: 'rh@exemplo.invalid',
        responsavelNome: 'RH Teste',
        justificativa: 'Cancelado a pedido do gestor responsável.',
        statusAnterior: 'pendente',
        statusPosterior: 'cancelado',
        detalhes: null,
      },
    ];
    render(<FeedbackCard item={canonico({ status: 'cancelado' })} onEditar={() => {}} />);

    expect(screen.getByText('Cancelado a pedido do gestor responsável.')).toBeInTheDocument();
    expect(screen.getByText(/Por RH Teste/)).toBeInTheDocument();
    expect(screen.getByText(/02\/10\/2026/)).toBeInTheDocument();
  });

  it('gestor sem papel de gestão vê a ação, porém desabilitada com motivo', () => {
    render(<FeedbackCard item={canonico({}, ['gestor'])} onEditar={() => {}} />);
    const editar = screen.getByRole('button', { name: 'Editar feedback' });
    expect(editar).toBeDisabled();
    expect(editar).toHaveAttribute('title', expect.stringContaining('RH'));
  });
});

describe('formulário de edição — mesmo modal, preenchido', () => {
  function abrir(onSubmit: (d: Record<string, unknown>) => void) {
    return render(
      <NovoFeedbackDialog
        aberto
        onOpenChange={() => {}}
        colaboradores={[
          { id: 'colab-1', nome_completo: 'Ana Souza' },
          { id: 'colab-2', nome_completo: 'Bruno Lima' },
        ]}
        ciclos={[{ id: 'ciclo-1', nome: 'Ciclo S1 2026' }]}
        registro={canonico()}
        onSubmit={onSubmit}
      />
    );
  }

  it('abre como "Editar feedback" com TODOS os dados originais', () => {
    abrir(() => {});

    expect(screen.getByText('Editar feedback')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Entrega consistente')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Delegar mais')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Bom ciclo')).toBeInTheDocument();
    // Nota e Potencial originais (spinbuttons).
    const numeros = screen.getAllByRole('spinbutton') as HTMLInputElement[];
    expect(numeros.map((n) => n.value)).toEqual(['4', '5']);
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeEnabled();
  });

  it('salva as alterações com reabertura explícita (status pendente)', () => {
    const onSubmit = vi.fn();
    abrir(onSubmit);

    fireEvent.change(screen.getByDisplayValue('Bom ciclo'), { target: { value: 'Comentário revisado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      avaliado_id: 'colab-1',
      avaliador_id: 'colab-2',
      tipo: 'gestor',
      nota_geral: 4,
      potencial: 5,
      ciclo_id: 'ciclo-1',
      pontos_fortes: 'Entrega consistente',
      pontos_melhoria: 'Delegar mais',
      comentarios: 'Comentário revisado',
      status: 'pendente',
    });
  });

  it('cancelado NÃO pode ser salvo pelo formulário, mesmo aberto por chamada direta', () => {
    const onSubmit = vi.fn();
    render(
      <NovoFeedbackDialog
        aberto
        onOpenChange={() => {}}
        colaboradores={[
          { id: 'colab-1', nome_completo: 'Ana Souza' },
          { id: 'colab-2', nome_completo: 'Bruno Lima' },
        ]}
        ciclos={[{ id: 'ciclo-1', nome: 'Ciclo S1 2026' }]}
        registro={canonico({ status: 'cancelado' })}
        onSubmit={onSubmit}
      />
    );

    const salvar = screen.getByRole('button', { name: 'Salvar alterações' });
    expect(salvar).toBeDisabled();
    expect(salvar).toHaveAttribute('title', expect.stringMatching(/cancelado/i));
    fireEvent.click(salvar);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
