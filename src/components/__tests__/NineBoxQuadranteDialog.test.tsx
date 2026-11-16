import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { PontoNineBox } from '@/components/avaliacao/nineBoxComum';

// Radix em duble: o conteúdo desta janela vive dentro de Portal/Overlay/Content
// com `forceMount` — a MESMA montagem do popup "Pendências". O duble evita
// focus-trap/portais no jsdom, o mesmo caminho de `NovaAdmissaoDialog.test.tsx`.
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

import { NineBoxQuadranteDialog } from '../avaliacao/NineBoxQuadranteDialog';

/**
 * Prova da JANELA do quadrante: (1) ela entra com a MESMA coreografia do popup
 * "Pendências" (`cascade-motion`) e (2) o conteúdo continua exatamente o de
 * antes — cabeçalho, leitura, contagem, notas e o estado de PDI de cada linha.
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
    quadrante: '1-3',
    nomeQuadrante: 'Enigma',
    criadoEm: 0,
    pontuacao: 8,
    temPdi: false,
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

describe('NineBoxQuadranteDialog — coreografia "Pendências"', () => {
  it('monta véu, casca e contêiner da cascata com a MESMA receita da referência', () => {
    const { container } = render(
      <NineBoxQuadranteDialog chave="1-3" aberto onOpenChange={() => {}} pessoas={[ponto('Ana Souza')]} />
    );
    // Véu: mesmas classes do `AnimatedCascadeDialog`.
    expect(container.querySelector('.bg-black\\/60')).toBeTruthy();
    expect(container.querySelector('.backdrop-blur-sm')).toBeTruthy();
    // Casca: a caixa que nasce quadrada e estica, ancorada no TOPO.
    // Procura pela PROPRIEDADE, nao pela string: o jsdom 31 normalizou a
    // serializacao de `transform-origin` para a ordem canonica x-y, entao o
    // mesmo style que o jsdom 30 escrevia como "top center" agora sai como
    // "center top". O navegador aceita as duas ordens e o componente nao
    // mudou (NineBoxQuadranteDialog.tsx:109 segue `transformOrigin: 'top
    // center'`); era a leitura por substring aqui que estava fragil.
    const shell = container.querySelector('div[style*="transform-origin"]') as HTMLElement;
    expect(shell).toBeTruthy();
    expect(shell.style.transformOrigin.split(' ').sort().join(' ')).toBe('center top');
    // Largura que esta janela já usava (`DialogContent className="max-w-lg"`).
    expect(shell.className).toContain('max-w-lg');
    // Contêiner da cascata com `display: contents` — não cria caixa, então o
    // layout do modal não muda em nada.
    expect(shell.querySelector('.contents')).toBeTruthy();
    // X igual ao da referência.
    expect(screen.getByText('Fechar')).toBeInTheDocument();
  });

  it('não renderiza nada com a janela fechada', () => {
    render(<NineBoxQuadranteDialog chave="1-3" aberto={false} onOpenChange={() => {}} pessoas={[ponto('Ana')]} />);
    expect(screen.queryByText('Enigma')).toBeNull();
    expect(screen.queryByText('Fechar')).toBeNull();
  });

  it('sem quadrante escolhido, não há janela', () => {
    render(<NineBoxQuadranteDialog chave={null} aberto onOpenChange={() => {}} pessoas={[]} />);
    expect(screen.queryByText('Fechar')).toBeNull();
  });
});

describe('NineBoxQuadranteDialog — conteúdo preservado', () => {
  it('mostra nome do quadrante, leitura, contagem e o PDI de cada pessoa', () => {
    render(
      <NineBoxQuadranteDialog
        chave="1-3"
        aberto
        onOpenChange={() => {}}
        pessoas={[ponto('Ana Souza'), ponto('Bruno Lima', { nota: 3, potencial: 5, temPdi: true })]}
      />
    );
    expect(screen.getByText('Enigma')).toBeInTheDocument();
    expect(screen.getByText(/Alto potencial, baixo desempenho · 2 colaboradores/)).toBeInTheDocument();
    expect(screen.getByText('Ana Souza')).toBeInTheDocument();
    expect(screen.getByText('Bruno Lima')).toBeInTheDocument();
    expect(screen.getAllByText('Analista · RH')).toHaveLength(2);
    expect(screen.getByText('Sem PDI')).toBeInTheDocument();
    expect(screen.getByText('Com PDI')).toBeInTheDocument();
  });

  it('usa o singular com um só colaborador', () => {
    render(<NineBoxQuadranteDialog chave="1-3" aberto onOpenChange={() => {}} pessoas={[ponto('Ana')]} />);
    expect(screen.getByText(/· 1 colaborador$/)).toBeInTheDocument();
  });

  it('mostra a mensagem de quadrante vazio', () => {
    render(<NineBoxQuadranteDialog chave="2-1" aberto onOpenChange={() => {}} pessoas={[]} />);
    expect(screen.getByText('Nenhum colaborador neste quadrante no recorte atual.')).toBeInTheDocument();
    expect(screen.getByText(/· 0 colaboradores/)).toBeInTheDocument();
  });
});
