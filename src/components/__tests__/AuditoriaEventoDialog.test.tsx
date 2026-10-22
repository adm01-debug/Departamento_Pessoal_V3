import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

/**
 * ============================================================================
 * AUDITORIA — MODAL "VER DETALHES": PARIDADE COM O MODAL "PENDÊNCIAS".
 *
 * O popup de Pendências (`PendenciasDialog` → `AnimatedCascadeDialog`) anima
 * pela moldura compartilhada `CascadeDialogFrame`, cujos variants vêm de
 * `ui/cascade-motion.ts`. Este teste prova que o modal da Auditoria usa a MESMA
 * moldura e os MESMOS variants — não uma animação "parecida":
 *   • véu      → `cascadeOverlayVariants(blocks)`
 *   • caixa    → `cascadeShellVariants(blocks)` + transformOrigin 'top center'
 *   • corpo    → `cascadeContainerVariants` (orquestra a cascata)
 *   • blocos   → `cascadeItemVariants` (5 blocos, como o conteúdo atual)
 *
 * O mock da Motion expõe `initial`/`animate`/`exit`/`variants`/`style` em
 * data-attributes, permitindo comparar os objetos REAIS importados da fonte
 * única — e também confere que o layout/conteúdo do modal não mudou.
 * ============================================================================
 */
vi.mock('framer-motion', () => {
  const cache = new Map<unknown, unknown>();

  const capturar = (Tag: unknown) => {
    if (cache.has(Tag)) return cache.get(Tag);
    const Componente = ({ children, custom, variants, initial, animate, exit, style, ...rest }: any) => {
      const Props = Tag as any;
      return (
        <Props
          {...rest}
          style={style}
          data-custom={custom === undefined ? undefined : String(custom)}
          data-initial={initial === undefined ? undefined : String(initial)}
          data-animate={animate === undefined ? undefined : String(animate)}
          data-exit={exit === undefined ? undefined : String(exit)}
          data-variants={variants ? JSON.stringify(variants) : undefined}
          data-origin={style?.transformOrigin}
        >
          {children}
        </Props>
      );
    };
    cache.set(Tag, Componente);
    return Componente;
  };

  const motion = new Proxy(
    {},
    {
      get: (_alvo, tag) => (tag === 'create' ? (Componente: unknown) => capturar(Componente) : capturar(tag)),
    }
  );

  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    useReducedMotion: () => false,
    useInView: () => true,
  };
});

import { AuditoriaEventoDialog } from '../premiacoes/AuditoriaEventoDialog';
import {
  cascadeContainerVariants,
  cascadeItemVariants,
  cascadeOverlayVariants,
  cascadeShellVariants,
} from '@/components/ui/cascade-motion';
import type { EventoAuditoria } from '../premiacoes/auditoriaComum';

const BLOCOS = 5;

const EVENTO = {
  id: 'mock-aud-p2',
  categoria: 'conciliacao',
  categoriaRotulo: 'Conciliação',
  entidadeTipo: 'pagamento',
  acao: 'alteracao',
  dataIso: '2026-10-22T01:50:00.000Z',
  titulo: 'Divergência identificada na conciliação',
  descricao: 'Divergência de R$ 70,00 identificada na conciliação (IRRF).',
  entidade: { rotulo: 'Pagamento', nome: 'Pedro Henrique Barbosa' },
  responsavel: { nome: 'RH / Admin' },
  status: 'aprovado_financeiro',
  valor: 70,
  valorAnterior: 70,
  valorPosterior: null,
  valorLegenda: 'Diferença identificada',
  justificativa: 'Divergência de R$ 70,00 identificada na conciliação (IRRF).',
  dadosAnteriores: null,
  dadosNovos: null,
} as unknown as EventoAuditoria;

const renderDialog = (over: Partial<Parameters<typeof AuditoriaEventoDialog>[0]> = {}) =>
  render(<AuditoriaEventoDialog evento={EVENTO} aberto onOpenChange={vi.fn()} {...over} />);

const porOrigin = () => document.querySelector<HTMLElement>('[data-origin="top center"]');
const porVariants = (variants: unknown) =>
  [...document.querySelectorAll<HTMLElement>('[data-variants]')].filter(
    (el) => el.getAttribute('data-variants') === JSON.stringify(variants)
  );

beforeEach(() => vi.clearAllMocks());

describe('AuditoriaEventoDialog — mesma moldura do modal de Pendências', () => {
  it('usa a casca, o véu e a orquestração exatos de `cascade-motion`', () => {
    renderDialog();

    const caixa = porOrigin();
    expect(caixa).not.toBeNull();
    expect(caixa!.getAttribute('data-variants')).toBe(JSON.stringify(cascadeShellVariants(BLOCOS)));
    expect(caixa!.getAttribute('data-initial')).toBe('closed');
    expect(caixa!.getAttribute('data-animate')).toBe('open');
    expect(caixa!.getAttribute('data-exit')).toBe('closed');

    const veu = document.querySelector<HTMLElement>('.backdrop-blur-sm');
    expect(veu).not.toBeNull();
    expect(veu!.getAttribute('data-variants')).toBe(JSON.stringify(cascadeOverlayVariants(BLOCOS)));
    expect(veu!.getAttribute('data-initial')).toBe('closed');
    expect(veu!.getAttribute('data-animate')).toBe('open');
    expect(veu!.getAttribute('data-exit')).toBe('closed');

    const corpo = document.querySelector<HTMLElement>('.grid.gap-3.p-5');
    expect(corpo).not.toBeNull();
    expect(corpo!.getAttribute('data-variants')).toBe(JSON.stringify(cascadeContainerVariants));
    expect(corpo!.getAttribute('data-initial')).toBe('closed');
    expect(corpo!.getAttribute('data-animate')).toBe('open');
    expect(corpo!.getAttribute('data-exit')).toBe('closed');

    // Título + 2 linhas de cards + auditoria + rodapé entram em cascata.
    expect(porVariants(cascadeItemVariants)).toHaveLength(BLOCOS);
  });

  it('preserva caixa, conteúdo e classes do layout aprovado', () => {
    renderDialog();

    const caixa = porOrigin()!;
    for (const classe of [
      'max-h-[88vh]',
      'max-w-2xl',
      'overflow-y-auto',
      'border-border/60',
      'bg-card',
      'sm:rounded-xl',
    ]) {
      expect(caixa.className).toContain(classe);
    }

    expect(screen.getByText('Conciliação')).toBeInTheDocument();
    expect(screen.getByText('Divergência identificada na conciliação')).toBeInTheDocument();
    expect(screen.getByText('Informações financeiras')).toBeInTheDocument();
    expect(screen.getByText('Auditoria')).toBeInTheDocument();
    expect(screen.getByText('Dados anteriores')).toBeInTheDocument();
    expect(screen.getByText('Dados posteriores')).toBeInTheDocument();
    expect(screen.getByText('ID do evento: mock-aud-p2')).toBeInTheDocument();
    // X da moldura + botão do rodapé (os dois continuam existindo/funcionando).
    expect(screen.getAllByRole('button', { name: 'Fechar' })).toHaveLength(2);
  });

  it('fecha pelo botão Fechar, pelo X e por Escape, sempre avisando o pai', () => {
    const onOpenChange = vi.fn();
    renderDialog({ onOpenChange });

    const fechar = screen.getAllByRole('button', { name: 'Fechar' });
    // Primeiro o X da moldura (sr-only "Fechar"); depois o botão do rodapé.
    fireEvent.click(fechar[fechar.length - 1]);
    expect(onOpenChange).toHaveBeenCalledWith(false);

    fireEvent.click(fechar[0]);
    expect(onOpenChange).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledTimes(3);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('sem evento não renderiza nada (mesma guarda de montagem)', () => {
    const { container } = render(<AuditoriaEventoDialog evento={null} aberto onOpenChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
    expect(document.querySelector('[data-origin="top center"]')).toBeNull();
  });

  it('devolve o foco ao botão de origem quando a janela fecha', async () => {
    const origem = document.createElement('button');
    origem.textContent = 'Ver detalhes';
    document.body.appendChild(origem);
    origem.focus();

    const { rerender } = renderDialog({ retornarFocoPara: origem });
    rerender(<AuditoriaEventoDialog evento={EVENTO} aberto={false} onOpenChange={vi.fn()} retornarFocoPara={origem} />);

    await waitFor(() => expect(origem).toHaveFocus());
    origem.remove();
  });
});
