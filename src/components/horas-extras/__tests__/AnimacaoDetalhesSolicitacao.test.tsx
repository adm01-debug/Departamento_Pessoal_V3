import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

/**
 * ============================================================================
 * A JANELA "DETALHES DA SOLICITAÇÃO" ABRE E FECHA COMO O POPUP DE PENDÊNCIAS.
 *
 * A referência (`PendenciasDialog`) entra por `AnimatedCascadeDialog`, cuja
 * moldura é `CascadeDialogFrame` (`ui/cascade-dialog.tsx`) — a MESMA que a
 * modal "Nova solicitação" usa. Antes deste ajuste, "Ver detalhes" era um
 * `DialogContent` estático (aparecia de uma vez). Este teste roda o Framer
 * Motion REAL (sem mock) e mede o que o usuário percebe:
 *
 *   • abertura — a caixa NASCE pequena e cresce (`scaleY` de 0 → 1, 0,9 s,
 *     `easeInOut`) enquanto o véu escurece em fade;
 *   • fechamento — a página zera o registro no ato do clique; a moldura mantém
 *     o conteúdo MONTADO até o fim da transição (o "latch" do último registro
 *     evita a caixa encolhendo vazia) e só então desmonta;
 *   • o X da moldura continua avisando o dono do estado.
 *
 * Se alguém voltar a usar um `DialogContent` estático (ou remover o latch), os
 * dois primeiros casos caem.
 * ============================================================================
 */

import { SolicitacaoDetalhesDialog } from '../SolicitacaoDetalhesDialog';
import type { SolicitacaoHoraExtra } from '../horasExtrasComum';

function registro(over: Partial<SolicitacaoHoraExtra> = {}): SolicitacaoHoraExtra {
  return {
    id: 'sol-1',
    data: '2026-10-20',
    horas_solicitadas: 2.5,
    motivo: 'Fechamento de mês',
    status: 'pendente',
    created_at: '2026-10-18T12:00:00.000Z',
    colaborador: { nome_completo: 'Ana Souza', departamento: 'Financeiro' },
    ...over,
  };
}

const DETALHE = registro();

/** Espera `ms` deixando o React/Framer rodarem (medição dentro de `act`). */
async function esperar(ms: number) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

/** A CASCA da janela — a única do documento com `transform-origin`. */
const casca = () => document.querySelector<HTMLElement>('div[style*="transform-origin"]');

/** Lê o `scaleY(x)` escrito pelo Framer (1 quando o transform é identidade). */
function escalaY(el: HTMLElement): number {
  const transform = el.style.transform;
  if (!transform || transform === 'none') return 1;
  const casamento = /scaleY\(([\d.]+)\)/.exec(transform);
  return casamento ? Number(casamento[1]) : 1;
}

/** A janela como a PÁGINA a monta: `open` e o registro andam juntos. */
const janela = (aberta: boolean, onOpenChange = vi.fn()) => (
  <SolicitacaoDetalhesDialog
    solicitacao={aberta ? DETALHE : null}
    open={aberta}
    onOpenChange={onOpenChange}
    onAprovar={() => {}}
    onRejeitar={() => {}}
  />
);

describe('Detalhes da solicitação — moldura do popup de Pendências', () => {
  it('abre crescendo de dentro para fora, com o véu escurecendo em fade', async () => {
    const { unmount } = render(janela(true));

    const caixa = casca();
    expect(caixa).not.toBeNull();
    // A mesma âncora da moldura compartilhada: `top center`. O jsdom grava a
    // forma curta na ordem canônica (`center top`), então o literal do atributo
    // depende do parser — o que o teste cobra é a âncora, não a ordem.
    expect(['top center', 'center top']).toContain(caixa!.style.transformOrigin);

    const veu = document.querySelector<HTMLElement>('.backdrop-blur-sm');
    expect(veu).not.toBeNull();

    // Amostra a abertura: a caixa parte pequena (não é um modal estático).
    const escalas: number[] = [];
    const opacidades: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      await esperar(70);
      escalas.push(escalaY(casca()!));
      opacidades.push(Number(veu!.style.opacity || '1'));
    }

    expect(Math.min(...escalas)).toBeLessThan(0.9); // começou pequena
    expect(escalas.at(-1)).toBeGreaterThan(Math.min(...escalas)); // e cresceu
    expect(opacidades[0]).toBeLessThan(1); // o véu entrou em fade

    // E a abertura TERMINA: caixa em escala 1 e véu opaco.
    await esperar(900);
    expect(escalaY(casca()!)).toBe(1);
    expect(Number(veu!.style.opacity)).toBe(1);

    unmount();
  }, 15_000);

  it('fecha encolhendo e mantém o registro à vista até o fim da transição', async () => {
    const { rerender, unmount } = render(janela(true));
    await esperar(1200); // deixa abrir por completo
    expect(escalaY(casca()!)).toBe(1);

    // A página zera o registro no mesmo clique que fecha (`setDetalhe(null)`).
    rerender(janela(false));

    const escalas: number[] = [];
    // 5 blocos × 0,12 s + 0,28 s = 0,76 s de cascata ANTES de a caixa encolher
    // (`cascadeExitContentDuration`), e o encolhimento leva 0,55 s. A janela de
    // amostragem precisa cobrir o início do encolhimento, senão ela termina com
    // a caixa ainda em escala 1 e o caso reprova sem haver regressão.
    for (let i = 0; i < 12; i += 1) {
      await esperar(100);
      const atual = casca();
      if (!atual) break;
      escalas.push(escalaY(atual));
      // O conteúdo continua legível durante a saída — nada de caixa vazia.
      expect(screen.getByText('Detalhes da solicitação')).toBeInTheDocument();
      expect(screen.getByText('Ana Souza')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Aprovar/i })).toBeInTheDocument();
    }

    expect(escalas.length).toBeGreaterThan(0); // seguiu montada durante a saída
    expect(Math.min(...escalas)).toBeLessThan(1); // e encolheu de verdade

    // Só DEPOIS da transição (5 blocos + casca) o conteúdo é desmontado.
    await esperar(1800);
    expect(casca()).toBeNull();
    expect(screen.queryByText('Detalhes da solicitação')).not.toBeInTheDocument();

    unmount();
  }, 20_000);

  it('o X da moldura avisa o dono do estado (o fechamento animado continua)', async () => {
    const onOpenChange = vi.fn();
    const { unmount } = render(janela(true, onOpenChange));

    // Dois botões respondem por "Fechar": o X da moldura (tem `svg`) e o do
    // rodapé (texto). O X é o que carrega o ícone.
    const fechar = screen.getAllByRole('button', { name: 'Fechar' }).find((b) => b.querySelector('svg'));
    expect(fechar).toBeDefined();

    fireEvent.click(fechar!);
    expect(onOpenChange).toHaveBeenCalledWith(false);

    unmount();
  }, 15_000);
});
