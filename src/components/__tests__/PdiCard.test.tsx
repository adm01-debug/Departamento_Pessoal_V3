import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PdiCard } from '@/components/avaliacao/PdiCard';
import { getMockPdiProgress } from '@/components/avaliacao/pdiProgressoMock';
import {
  PROGRESSO_PDI_DISPONIVEL,
  derivarPdi,
  type ColaboradorPdi,
  type PdiDerivado,
} from '@/components/avaliacao/pdiComum';

/**
 * ============================================================================
 * Prova do CARD de PDI (as seis regiões) — COM O MOCK VISUAL TEMPORÁRIO LIGADO.
 *
 * O ponto não-negociável continua sendo: a região B NÃO PODE inventar progresso
 * a partir de dado real. A tabela `pdi_plano_desenvolvimento` não tem percentual
 * nem lista de ações, então o número que aparece na barra vem EXCLUSIVAMENTE de
 * `pdiProgressoMock.ts` (tabela por título) — nunca do `status` nem da coluna
 * legada `progresso`. Título fora da tabela do mock → o card volta a
 * "Progresso não acompanhado".
 *
 * QUANDO O MOCK FOR REMOVIDO: os casos do `describe` de progresso abaixo deixam
 * de valer (a barra volta a ficar vazia, com "—"); os demais continuam.
 * ============================================================================
 */

const AGORA = new Date('2026-06-15T12:00:00').getTime();
const emDias = (n: number) => new Date(AGORA + n * 86_400_000).toISOString().slice(0, 10);

const COLABORADORES: ColaboradorPdi[] = [
  {
    id: 'c1',
    nome_completo: 'Carlos Eduardo Lima',
    cargo: 'Desenvolvedor Frontend',
    departamento: 'Tecnologia',
    foto_url: 'https://exemplo/carlos.jpg',
  },
];

/** Item derivado pelo MESMO caminho que a aba usa. */
function item(extra: Record<string, unknown> = {}, colaboradores: ColaboradorPdi[] = COLABORADORES): PdiDerivado {
  return derivarPdi(
    {
      id: 'p1',
      colaborador_id: 'c1',
      titulo: 'Trilha de Arquitetura Frontend',
      competencia_foco: 'Arquitetura de software',
      acao_desenvolvimento: 'Curso avançado de padrões de projeto + mentoria com o tech lead.',
      prazo: emDias(45),
      status: 'em_andamento',
      comentarios: 'Progresso semanal reportado ao gestor.',
      created_at: '2026-05-01T10:00:00',
      updated_at: '2026-06-01T10:00:00',
      colaborador: { nome_completo: 'Carlos Eduardo Lima' },
      ...extra,
    },
    colaboradores,
    AGORA
  );
}

describe('PdiCard — identificação (região A)', () => {
  it('mostra título, colaborador, cargo · departamento e competência', () => {
    render(<PdiCard item={item()} />);
    expect(screen.getByRole('heading', { name: 'Trilha de Arquitetura Frontend' })).toBeInTheDocument();
    expect(screen.getByText('Carlos Eduardo Lima')).toBeInTheDocument();
    expect(screen.getByText('Desenvolvedor Frontend · Tecnologia')).toBeInTheDocument();
    expect(screen.getByText('Arquitetura de software')).toBeInTheDocument();
  });

  it('usa a FOTO real do colaborador quando existe', () => {
    const { container } = render(<PdiCard item={item()} />);
    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://exemplo/carlos.jpg');
  });

  it('sem foto, cai nas iniciais (nada de imagem quebrada)', () => {
    const semFoto = COLABORADORES.map(({ foto_url: _f, ...resto }) => resto);
    render(<PdiCard item={item({}, semFoto)} />);
    expect(screen.getByText('CL')).toBeInTheDocument();
  });

  it('omite cargo/departamento quando o dado não existe', () => {
    render(<PdiCard item={item({ colaborador_id: 'outro' }, [])} />);
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
  });
});

describe('PdiCard — progresso (região B) com o MOCK VISUAL temporário', () => {
  it('mostra na barra o percentual simulado do título (75% na Trilha de Arquitetura)', () => {
    render(<PdiCard item={item()} />);
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('75% concluído')).toBeInTheDocument();
    expect(screen.getByText('andamento simulado')).toBeInTheDocument();
  });

  it('o número NÃO vem do status nem da coluna legada `progresso`', () => {
    const { rerender } = render(<PdiCard item={item({ status: 'concluido' })} />);
    expect(screen.getByText('75%')).toBeInTheDocument(); // não virou 100%

    rerender(<PdiCard item={item({ progresso: 33 })} />);
    expect(screen.getByText('75%')).toBeInTheDocument(); // ignorou a coluna legada
    expect(screen.queryByText('33%')).not.toBeInTheDocument();
  });

  it('título fora da tabela do mock volta ao estado honesto (barra vazia + "—")', () => {
    render(<PdiCard item={item({ titulo: 'Plano sem mock' })} />);
    expect(screen.getByText('Progresso não acompanhado')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText(/concluído$/)).not.toBeInTheDocument();
  });
});

describe('pdiProgressoMock — tabela por título e faixas de cor', () => {
  const mockDe = (titulo: string) => getMockPdiProgress(derivarPdi({ id: 'i', titulo }, [], AGORA));

  it('cobre exatamente os cinco PDIs escolhidos para a avaliação visual', () => {
    expect(mockDe('Certificação Técnica')?.percent).toBe(100);
    expect(mockDe('Reciclagem em Rotinas Administrativas')?.percent).toBe(40);
    expect(mockDe('Comunicação Executiva de Dados')?.percent).toBe(65);
    expect(mockDe('Trilha de Arquitetura Frontend')?.percent).toBe(75);
    expect(mockDe('Liderança de Projetos')?.percent).toBe(25);
  });

  it('ignora caixa, acentos e espaços do título', () => {
    expect(mockDe('  trilha de ARQUITETURA frontend ')?.percent).toBe(75);
    expect(mockDe('CERTIFICACAO TECNICA')?.percent).toBe(100);
  });

  it('usa as três faixas do módulo com os cortes 40/80 pedidos', () => {
    expect(mockDe('Liderança de Projetos')?.tone).toContain('from-warning/60'); // âmbar
    expect(mockDe('Reciclagem em Rotinas Administrativas')?.tone).toContain('from-primary/70'); // lima
    expect(mockDe('Certificação Técnica')?.tone).toContain('from-success'); // verde
  });

  it('o texto secundário acompanha a faixa (não diz "andamento" em 100%)', () => {
    expect(mockDe('Liderança de Projetos')?.hint).toBe('andamento simulado');
    expect(mockDe('Certificação Técnica')?.hint).toBe('conclusão simulada');
  });

  it('não inventa valor para título desconhecido nem para PDI ausente', () => {
    expect(mockDe('Plano fora do mock')).toBeNull();
    expect(getMockPdiProgress(null)).toBeNull();
  });

  it('a aba continua declarando que NÃO existe progresso real', () => {
    expect(PROGRESSO_PDI_DISPONIVEL).toBe(false);
  });
});

describe('PdiCard — ação, prazo e status (regiões C, D e E)', () => {
  it('rotula a ação como "Ação de desenvolvimento" (nunca "próxima ação")', () => {
    render(<PdiCard item={item()} />);
    expect(screen.getByText('Ação de desenvolvimento')).toBeInTheDocument();
    expect(screen.getByText(/Curso avançado de padrões de projeto/)).toBeInTheDocument();
    expect(screen.queryByText(/próxima ação/i)).not.toBeInTheDocument();
  });

  it('mostra o prazo com a data real e os dias restantes', () => {
    render(<PdiCard item={item({ prazo: emDias(45) })} />);
    expect(screen.getByText('45 dias restantes')).toBeInTheDocument();
    expect(screen.getByText('Dentro do prazo')).toBeInTheDocument();
  });

  it('marca prazo vencido como atraso, sem trocar o status do plano', () => {
    render(<PdiCard item={item({ prazo: emDias(-8), status: 'em_andamento' })} />);
    expect(screen.getByText('8 dias em atraso')).toBeInTheDocument();
    expect(screen.getByText('Prazo vencido')).toBeInTheDocument();
    // O status do PLANO continua sendo o do registro.
    expect(screen.getByText('Em Andamento')).toBeInTheDocument();
  });

  it('plano pendente: status real e situação do prazo convivem como conceitos distintos', () => {
    render(<PdiCard item={item({ status: 'pendente', prazo: emDias(20) })} />);
    expect(screen.getByText('Pendente')).toBeInTheDocument();
    expect(screen.getByText('Dentro do prazo')).toBeInTheDocument();
  });
});

describe('PdiCard — ações (região F)', () => {
  it('"Ver PDI" entrega o item para quem abriu o card', async () => {
    const onVerPdi = vi.fn();
    render(<PdiCard item={item()} onVerPdi={onVerPdi} />);
    await userEvent.click(screen.getByRole('button', { name: /Ver PDI/ }));
    expect(onVerPdi).toHaveBeenCalledTimes(1);
    expect(onVerPdi.mock.calls[0][0].titulo).toBe('Trilha de Arquitetura Frontend');
  });

  it('sem handler não inventa ação: nenhum botão "Ver PDI"', () => {
    render(<PdiCard item={item()} />);
    expect(screen.queryByRole('button', { name: /Ver PDI/ })).not.toBeInTheDocument();
  });

  it('o menu de três pontos só existe quando há navegação real', () => {
    const { rerender } = render(<PdiCard item={item()} />);
    expect(screen.queryByRole('button', { name: 'Mais ações do PDI' })).not.toBeInTheDocument();

    rerender(<PdiCard item={item()} onFiltrarColaborador={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Mais ações do PDI' })).toBeInTheDocument();
  });
});
