import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * ============================================================================
 * FIDELIDADE AOS COMPONENTES DE REFERÊNCIA — não a valores inventados aqui.
 *
 *  1. "Aprovar" e "Rejeitar" na janela "Ver detalhes" precisam ser o MESMO
 *     botão: `Button variant="outline"`, mesma altura/raio/padding/fonte/ícone
 *     e o mesmo hover. A única diferença são as cores semânticas (`success`
 *     contra `danger`). O lime (`primary`) não entra — ele é cor de AÇÃO, e o
 *     veredito é verde/vermelho. O teste normaliza os tokens de cor das duas
 *     listas de classes e exige que o resto seja IDÊNTICO.
 *
 *  2. O título da página precisa usar a tipografia do cabeçalho PADRÃO do
 *     sistema (`PageLayout`, o de "Controle de Ponto"). Em vez de repetir os
 *     números aqui, o teste RENDERIZA o `PageLayout` de referência e compara a
 *     classe do `<h1>` dele com a do `<h1>` de "Solicitações de Hora Extra".
 * ============================================================================
 */

import { SolicitacaoDetalhesDialog } from '../SolicitacaoDetalhesDialog';
import { CabecalhoSolicitacoes } from '../CabecalhoSolicitacoes';
import { PageLayout } from '@/components/layout/PageLayout';
import type { SolicitacaoHoraExtra } from '../horasExtrasComum';

function pendente(): SolicitacaoHoraExtra {
  return {
    id: 'sol-1',
    data: '2026-10-20',
    horas_solicitadas: 2.5,
    motivo: 'Fechamento de mês',
    status: 'pendente',
    created_at: '2026-10-18T12:00:00.000Z',
    colaborador: { nome_completo: 'Ana Souza', departamento: 'Financeiro' },
  };
}

/** Lista de classes de um nó, sem vazios. */
const classes = (el: Element): string[] => (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);

/** Só os tokens que NÃO são da cor do veredito (success/danger). */
const semCorDeVeredito = (lista: string[]): string[] => lista.filter((c) => !/(success|danger)/.test(c));

describe('Aprovar e Rejeitar — o mesmo botão, só a cor semântica muda', () => {
  it('compartilham geometria, foco, hover e ícone; diferem apenas em success/danger', () => {
    const { unmount } = render(
      <SolicitacaoDetalhesDialog
        solicitacao={pendente()}
        open
        onOpenChange={vi.fn()}
        onAprovar={vi.fn()}
        onRejeitar={vi.fn()}
      />
    );

    const aprovar = screen.getByRole('button', { name: /Aprovar/i });
    const rejeitar = screen.getByRole('button', { name: /Rejeitar/i });

    // 1) A CASCA é a mesma: nada de altura, raio, padding, fonte ou alinhamento
    //    diferente entre os dois (é o que dá a simetria da dupla).
    expect(semCorDeVeredito(classes(aprovar))).toEqual(semCorDeVeredito(classes(rejeitar)));

    // 2) O ícone é o mesmo em tamanho e respiro (lucide `Check` × `X`: só o
    //    nome do glifo muda, medida e margem são idênticas).
    const medidasIcone = (el: Element): string =>
      (el.querySelector('svg')?.getAttribute('class') ?? '')
        .split(/\s+/)
        .filter((c) => c && !c.startsWith('lucide'))
        .join(' ');
    expect(medidasIcone(aprovar)).toBe('mr-1 h-3.5 w-3.5');
    expect(medidasIcone(rejeitar)).toBe(medidasIcone(aprovar));

    // 3) A ÚNICA diferença é a cor: verde success no lugar do vermelho danger,
    //    com o MESMO par de alfas (borda /45, fundo /10, hover /20).
    expect(classes(aprovar)).toContain('border-success/45');
    expect(classes(aprovar)).toContain('bg-success/10');
    expect(classes(aprovar)).toContain('text-success');
    expect(classes(aprovar)).toContain('hover:bg-success/20');

    expect(classes(rejeitar)).toContain('border-danger/45');
    expect(classes(rejeitar)).toContain('bg-danger/10');
    expect(classes(rejeitar)).toContain('text-danger');
    expect(classes(rejeitar)).toContain('hover:bg-danger/20');

    // 4) E NADA de lime preenchido (o estilo antigo do Aprovar).
    expect(classes(aprovar)).not.toContain('bg-primary');
    expect(classes(aprovar)).not.toContain('text-primary-foreground');
    expect(classes(aprovar)).not.toContain('bg-primary/90');

    unmount();
  });
});

describe('Cabeçalho — mesma tipografia de "Controle de Ponto"', () => {
  it('o <h1> repete exatamente a classe do cabeçalho padrão (PageLayout)', () => {
    const referencia = render(
      <MemoryRouter initialEntries={['/ponto']}>
        <PageLayout title="Controle de Ponto" description="Acompanhe a jornada…">
          {null}
        </PageLayout>
      </MemoryRouter>
    );
    const tituloReferencia = referencia.container.querySelector('h1')!;
    const classeReferencia = tituloReferencia.getAttribute('class');
    expect(classeReferencia).toBeTruthy();
    referencia.unmount();

    const { container, unmount } = render(<CabecalhoSolicitacoes onNova={vi.fn()} />);
    const titulo = screen.getByRole('heading', { level: 1, name: 'Solicitações de Hora Extra' });

    expect(titulo.getAttribute('class')).toBe(classeReferencia);

    // O que NÃO podia mudar: ícone (mesma caixa, mesmo lime) e subtítulo.
    const caixaIcone = container.querySelector('header span');
    expect(caixaIcone?.className).toContain('h-[34px]');
    expect(caixaIcone?.className).toContain('w-[34px]');
    expect(caixaIcone?.className).toContain('from-primary');
    expect(caixaIcone?.querySelector('svg')).not.toBeNull();

    const subtitulo = screen.getByText(
      'Gerencie as solicitações de horas extras, aprove ou rejeite e acompanhe o histórico.'
    );
    expect(subtitulo.className).toContain('text-muted-foreground');

    unmount();
  });
});
