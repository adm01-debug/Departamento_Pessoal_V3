import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { PontoNineBox } from '@/components/avaliacao/nineBoxComum';

// Radix em duble: o conteúdo desta janela vive dentro de Portal/Overlay/Content
// com `forceMount` — a MESMA montagem do popup "Pendências". O duble evita
// focus-trap/portais no jsdom, o mesmo caminho de `NovaAdmissaoDialog.test.tsx`
// e de `NineBoxQuadranteDialog.test.tsx`.
type RadixChildren = { children?: ReactNode };

vi.mock('@radix-ui/react-dialog', () => ({
  Root: ({ children }: RadixChildren) => <div>{children}</div>,
  Trigger: ({ children }: RadixChildren) => <div>{children}</div>,
  Portal: ({ children }: RadixChildren) => <div>{children}</div>,
  Overlay: ({ children }: RadixChildren) => <div>{children}</div>,
  Content: ({ children }: RadixChildren) => <div>{children}</div>,
  Close: ({ children }: RadixChildren) => <button>{children}</button>,
  Title: ({ children, ...props }: RadixChildren) => <h2 {...props}>{children}</h2>,
  Description: ({ children, ...props }: RadixChildren) => <p {...props}>{children}</p>,
}));

import { NineBoxLateral } from '../avaliacao/NineBoxLateral';
import { NineBoxTalentosDialog } from '../avaliacao/NineBoxTalentosDialog';

/**
 * Prova da janela "Ver todos" de TALENTOS EM DESTAQUE: (1) ela é a MESMA janela
 * do popup "Pendências" — `AnimatedCascadeDialog` → `CascadeDialogFrame` →
 * `cascade-motion`, com véu, casca ancorada no topo e caixa compacta de 460px;
 * (2) mostra o ranking COMPLETO do recorte (o card continua com 3 linhas); e
 * (3) o botão do card só pede a abertura — não expande mais a lista no lugar.
 *
 * A única diferença em relação a "Pendências" é o RITMO DA SAÍDA (lista de um
 * bloco por talento fechava em 1,67 s): isso é provado à parte, em
 * `NineBoxTalentosDialogSaidaRapida.test.tsx` + `CascadeSaidaPerfis.test.ts`.
 */

function ponto(nome: string, extra: Partial<PontoNineBox> = {}): PontoNineBox {
  return {
    id: nome,
    colaboradorId: nome,
    nome,
    cargo: 'Analista',
    departamento: 'RH',
    foto: null,
    nota: 4,
    potencial: 4,
    desempenho: 3,
    potencialFaixa: 3,
    quadrante: '3-3',
    nomeQuadrante: 'Estrela',
    criadoEm: 0,
    pontuacao: 8,
    temPdi: true,
    pendencias: null,
    quantidadeAvaliacoes: 1,
    quantidadeAvaliacoesValidas: 1,
    sinalizados: 0,
    registrosSinalizados: [],
    selecionadoId: nome,
    notasForaDaEscala: 0,
    feedbackIdsUtilizados: [nome],
    statusConsolidacao: 'consolidado',
    tiposAvaliadores: ['gestor'],
    ...extra,
  };
}

const RANKING = [
  ponto('Carlos Eduardo Pereira', { nota: 5, potencial: 5, pontuacao: 10 }),
  ponto('Helena Prado', { nota: 5, potencial: 5, pontuacao: 10 }),
  ponto('Ana Beatriz Souza', { nota: 5, potencial: 4, pontuacao: 9 }),
  ponto('Bruno Lima', {
    nota: 4,
    potencial: 4,
    pontuacao: 8,
    temPdi: false,
    quadrante: '2-2',
    nomeQuadrante: 'Core Player',
  }),
  ponto('Diego Alves', { nota: 3, potencial: 5, pontuacao: 8, quadrante: '1-3', nomeQuadrante: 'Enigma' }),
];

describe('NineBoxTalentosDialog — a MESMA janela de "Pendências"', () => {
  it('monta véu, casca e conteúdo com a receita do `AnimatedCascadeDialog`', async () => {
    render(<NineBoxTalentosDialog aberto onOpenChange={() => {}} ranking={RANKING} />);
    // A montagem passa pelo AnimatePresence: em máquina lenta o conteúdo entra
    // um tick depois do render, então cada consulta ao DOM espera aparecer.
    const achar = (sel: string) =>
      waitFor(
        () => {
          const el = document.querySelector(sel);
          if (!el) throw new Error(`não montou ainda: ${sel}`);
          return el;
        },
        { timeout: 5000 }
      );
    // Véu: mesmas classes da referência (escurecimento + blur juntos).
    await achar('.bg-black\\/60');
    await achar('.backdrop-blur-sm');
    // Casca: a caixa que nasce quadrada e estica, ancorada no TOPO.
    const shell = (await achar('div[class*="max-w-[460px]"]')) as HTMLElement;
    // A origem do crescimento vem do `style` inline do Framer; o texto exato
    // varia entre ambientes (`top center` x `center top`), então a checagem aceita
    // as duas ordens.
    expect(shell.getAttribute('style') ?? '').toMatch(/transform-origin:\s*(top center|center top)/);
    // Largura compacta padrão da referência (`max-w-[460px]`) — a mesma do
    // popup "Pendências", não uma largura própria.
    expect(shell.className).toContain('max-w-[460px]');
    // X de fechar com o rótulo acessível da referência.
    expect(await screen.findByText('Fechar', {}, { timeout: 5000 })).toBeInTheDocument();
  });

  it('tem o título do card e o ícone de destaque', () => {
    const { container } = render(<NineBoxTalentosDialog aberto onOpenChange={() => {}} ranking={RANKING} />);
    expect(screen.getByText('Talentos em destaque')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('não renderiza nada com a janela fechada', () => {
    render(<NineBoxTalentosDialog aberto={false} onOpenChange={() => {}} ranking={RANKING} />);
    expect(screen.queryByText('Talentos em destaque')).toBeNull();
    expect(screen.queryByText('Fechar')).toBeNull();
  });
});

describe('NineBoxTalentosDialog — todos os talentos, não só os 3 do card', () => {
  it('lista o ranking COMPLETO, na ordem do ranking', () => {
    const { container } = render(<NineBoxTalentosDialog aberto onOpenChange={() => {}} ranking={RANKING} />);
    const texto = container.textContent ?? '';
    RANKING.forEach((p) => expect(screen.getByText(p.nome)).toBeInTheDocument());
    // Ordem preservada: cada nome aparece depois do anterior no DOM.
    for (let i = 1; i < RANKING.length; i++) {
      expect(texto.indexOf(RANKING[i].nome)).toBeGreaterThan(texto.indexOf(RANKING[i - 1].nome));
    }
  });

  it('cada linha traz cargo · departamento, quadrante e as duas notas', () => {
    render(<NineBoxTalentosDialog aberto onOpenChange={() => {}} ranking={RANKING} />);
    expect(screen.getAllByText('Analista · RH')).toHaveLength(RANKING.length);
    // 3 pessoas em "Estrela" (3-3), 1 Core Player e 1 Enigma.
    expect(screen.getAllByText('Estrela')).toHaveLength(3);
    expect(screen.getByText('Core Player')).toBeInTheDocument();
    expect(screen.getByText('Enigma')).toBeInTheDocument();
    expect(screen.getAllByText('Desempenho')).toHaveLength(RANKING.length);
    expect(screen.getAllByText('Potencial')).toHaveLength(RANKING.length);
  });

  it('mostra a mensagem de recorte vazio', () => {
    render(<NineBoxTalentosDialog aberto onOpenChange={() => {}} ranking={[]} />);
    expect(screen.getByText('Nenhum colaborador classificado neste recorte.')).toBeInTheDocument();
  });
});

describe('NineBoxLateral — "Ver todos" abre a janela (não expande o card)', () => {
  it('o card continua com 3 linhas e o botão apenas pede a abertura', () => {
    const onVerTodos = vi.fn();
    const { container } = render(<NineBoxLateral ranking={RANKING} insights={[]} onVerTodos={onVerTodos} />);

    // Vitrine intacta: a lista do card (o 1º `ul` da coluna lateral) continua
    // com 3 linhas. O nome do 1º colocado também aparece no rodapé do card de
    // Insights ("Destaque do recorte"), por isso a checagem é escopada à lista.
    const vitrine = container.querySelector('ul') as HTMLElement;
    expect(vitrine).toBeTruthy();
    expect(within(vitrine).getAllByRole('listitem')).toHaveLength(3);
    expect(within(vitrine).getByText('Carlos Eduardo Pereira')).toBeInTheDocument();
    expect(within(vitrine).getByText('Helena Prado')).toBeInTheDocument();
    expect(within(vitrine).getByText('Ana Beatriz Souza')).toBeInTheDocument();
    expect(screen.queryByText('Bruno Lima')).toBeNull();
    expect(screen.queryByText('Diego Alves')).toBeNull();

    fireEvent.click(screen.getByText('Ver todos'));
    expect(onVerTodos).toHaveBeenCalledTimes(1);
  });

  it('sem ranking suficiente (≤ 3), o botão fica desabilitado', () => {
    const onVerTodos = vi.fn();
    render(<NineBoxLateral ranking={RANKING.slice(0, 3)} insights={[]} onVerTodos={onVerTodos} />);
    const botao = screen.getByText('Ver todos').closest('button') as HTMLButtonElement;
    expect(botao.disabled).toBe(true);
  });
});
