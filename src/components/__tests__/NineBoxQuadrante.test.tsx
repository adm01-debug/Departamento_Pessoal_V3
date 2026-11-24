import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NineBoxQuadrante } from '@/components/avaliacao/NineBoxQuadrante';
import type { PontoNineBox } from '@/components/avaliacao/nineBoxComum';

/**
 * Prova do CARD de quadrante: nome, contagem, leitura da posição, avatares
 * (com "+N" quando passa de quatro) e o estado vazio — além de o clique
 * entregar a CHAVE do quadrante, que é o que abre a lista real.
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
    temPdi: false,
    pendencias: null,
    ...extra,
  };
}

describe('NineBoxQuadrante — conteúdo', () => {
  it('mostra nome, contagem e leitura da posição', () => {
    render(<NineBoxQuadrante chave="1-3" pessoas={[ponto('Ana Souza')]} />);
    expect(screen.getByText('Enigma')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Alto potencial, baixo desempenho')).toBeInTheDocument();
  });

  it('mostra "Nenhum colaborador" quando o quadrante está vazio', () => {
    render(<NineBoxQuadrante chave="2-1" pessoas={[]} />);
    expect(screen.getByText('Nenhum colaborador')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('mostra até quatro iniciais e resume o resto em "+N"', () => {
    const pessoas = ['Ana Souza', 'Bruno Lima', 'Carla Dias', 'Davi Rocha', 'Elis Prado', 'Fabi Melo'].map((n) =>
      ponto(n, { foto: null })
    );
    render(<NineBoxQuadrante chave="3-3" pessoas={pessoas} />);
    expect(screen.getByText('AS')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('usa a foto quando existe e cai nas iniciais quando não', () => {
    const { container } = render(
      <NineBoxQuadrante
        chave="3-3"
        pessoas={[ponto('Ana Souza', { foto: 'https://exemplo/ana.jpg' }), ponto('Bruno Lima')]}
      />
    );
    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://exemplo/ana.jpg');
    expect(screen.getByText('BL')).toBeInTheDocument();
  });
});

describe('NineBoxQuadrante — interação', () => {
  it('entrega a chave do quadrante ao clicar', async () => {
    const onAbrir = vi.fn();
    render(<NineBoxQuadrante chave="2-2" pessoas={[ponto('Ana')]} onAbrir={onAbrir} />);
    await userEvent.click(screen.getByRole('button', { name: /Core Player/ }));
    expect(onAbrir).toHaveBeenCalledWith('2-2');
  });

  it('descreve a contagem no rótulo acessível', () => {
    render(<NineBoxQuadrante chave="2-2" pessoas={[ponto('Ana'), ponto('Bruno')]} />);
    expect(screen.getByRole('button', { name: 'Core Player — 2 colaboradores' })).toBeInTheDocument();
  });
});
