import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import type { CandidaturaComRelacoes, VagaRow } from '@/types/recrutamento';
import { criarCandidatura, criarVaga } from './candidatosFixture';

/**
 * A janela só consome props e Framer Motion: o mock abaixo remove as props de
 * animação do DOM (variants/initial/animate não existem em `<div>`), o que é o
 * suficiente para exercitar conteúdo, filtros e o painel de detalhe. `create` e
 * `forwardRef` são obrigatórios porque `MotionCard` é `motion.create(Card)` e o
 * painel passa `ref` para ele.
 */
vi.mock('framer-motion', async () => {
  const React = await import('react');
  /**
   * Props que a Motion consome e que não existem no DOM. Todo o RESTO passa
   * (role, aria-*, data-*, onClick…), porque o Radix entrega `role="dialog"`
   * ao filho via `asChild` — sem repassar props, a janela nem seria encontrada
   * por `getByRole('dialog')`.
   */
  const PROPS_MOTION = new Set([
    'variants',
    'initial',
    'animate',
    'exit',
    'transition',
    'whileHover',
    'whileTap',
    'whileInView',
    'layout',
    'layoutId',
    'custom',
    'onAnimationComplete',
    'transformOrigin',
  ]);
  const criar = (Componente: any) =>
    React.forwardRef(({ children, ...rest }: any, _ref: any) => {
      const props: Record<string, unknown> = {};
      for (const chave of Object.keys(rest)) {
        if (!PROPS_MOTION.has(chave)) props[chave] = rest[chave];
      }
      return React.createElement(Componente, props, children);
    });
  return {
    motion: {
      create: criar,
      div: criar('div'),
      span: criar('span'),
      // O painel de detalhe é uma `<ol>` de etapas com `<li>` animados: a
      // dobra das etapas usa `motion.li`/`motion.ol` (semântica preservada).
      li: criar('li'),
      ol: criar('ol'),
    },
    AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children),
    useReducedMotion: () => false,
  };
});

import { construirDetalheVagas, resumirDesempenhoVagas, situacaoDaVaga } from '../analyticsComum';
import { FILTROS_DESEMPENHO_PADRAO, filtrarDetalheVagas, temFiltroDesempenho } from '../analyticsVagasFiltros';
import { DesempenhoVagasDialog } from '../DesempenhoVagasDialog';
import { AnalyticsVagas } from '../AnalyticsVagas';

const iso = (ymd: string) => `${ymd}T12:00:00Z`;
const REFERENCIA = new Date(iso('2026-08-15'));

function vagas(): VagaRow[] {
  return [
    criarVaga({ id: 'vaga-1', titulo: 'Dev Full Stack', departamento: 'Tecnologia', status: 'aberta' }),
    criarVaga({ id: 'vaga-2', titulo: 'Analista de RH', departamento: 'Recursos Humanos', status: 'fechada' }),
    criarVaga({ id: 'vaga-3', titulo: 'Analista de Dados', departamento: 'Tecnologia', status: 'pausada' }),
  ];
}

function candidatura(overrides: Partial<CandidaturaComRelacoes>): CandidaturaComRelacoes {
  return criarCandidatura(overrides);
}

function candidaturas(): CandidaturaComRelacoes[] {
  return [
    // vaga-1: 1 em triagem (10 dias), 1 em entrevista (1 dia) e 1 contratado (10 dias).
    candidatura({
      id: 'c1',
      vaga_id: 'vaga-1',
      etapa: 'triagem',
      created_at: iso('2026-08-01'),
      updated_at: iso('2026-08-11'),
    }),
    candidatura({
      id: 'c2',
      vaga_id: 'vaga-1',
      etapa: 'entrevista',
      created_at: iso('2026-08-03'),
      updated_at: iso('2026-08-04'),
    }),
    candidatura({
      id: 'c3',
      vaga_id: 'vaga-1',
      etapa: 'contratado',
      status: 'contratado',
      created_at: iso('2026-08-02'),
      updated_at: iso('2026-08-12'),
    }),
    // vaga-2: processo reprovado — conta como candidatura, não como "em processo".
    candidatura({
      id: 'c4',
      vaga_id: 'vaga-2',
      etapa: 'triagem',
      status: 'reprovado',
      created_at: iso('2026-07-20'),
      updated_at: iso('2026-07-22'),
    }),
    // vaga-3 não tem candidatura nenhuma (tempo médio indisponível).
  ];
}

const detalhes = () => construirDetalheVagas(vagas(), candidaturas(), REFERENCIA);

describe('filtros da tabela de desempenho', () => {
  it('busca por vaga, departamento e situação, sem acento e sem caixa', () => {
    const lista = detalhes();
    expect(filtrarDetalheVagas(lista, { ...FILTROS_DESEMPENHO_PADRAO, busca: 'rh' }).map((v) => v.id)).toEqual([
      'vaga-2',
    ]);
    expect(filtrarDetalheVagas(lista, { ...FILTROS_DESEMPENHO_PADRAO, busca: 'TECNOLOGIA' }).map((v) => v.id)).toEqual([
      'vaga-1',
      'vaga-3',
    ]);
    expect(filtrarDetalheVagas(lista, { ...FILTROS_DESEMPENHO_PADRAO, busca: 'aberta' }).map((v) => v.id)).toEqual([
      'vaga-1',
    ]);
  });

  it('recorta por situação e ordena pelas quatro opções', () => {
    const lista = detalhes();
    expect(
      filtrarDetalheVagas(lista, { ...FILTROS_DESEMPENHO_PADRAO, situacao: 'encerrada' }).map((v) => v.id)
    ).toEqual(['vaga-2']);
    expect(filtrarDetalheVagas(lista, { ...FILTROS_DESEMPENHO_PADRAO, situacao: 'pausada' }).map((v) => v.id)).toEqual([
      'vaga-3',
    ]);
    expect(
      filtrarDetalheVagas(lista, { ...FILTROS_DESEMPENHO_PADRAO, ordenacao: 'titulo' }).map((v) => v.titulo)
    ).toEqual(['Analista de Dados', 'Analista de RH', 'Dev Full Stack']);
    expect(
      filtrarDetalheVagas(lista, { ...FILTROS_DESEMPENHO_PADRAO, ordenacao: 'maior-conversao' }).map((v) => v.id)
    ).toEqual(['vaga-1', 'vaga-2', 'vaga-3']);
    expect(
      filtrarDetalheVagas(lista, { ...FILTROS_DESEMPENHO_PADRAO, ordenacao: 'menor-conversao' }).map((v) => v.id)
    ).toEqual(['vaga-2', 'vaga-3', 'vaga-1']);
  });

  it('só considera filtro ativo o que sai do padrão', () => {
    expect(temFiltroDesempenho(FILTROS_DESEMPENHO_PADRAO)).toBe(false);
    expect(temFiltroDesempenho({ ...FILTROS_DESEMPENHO_PADRAO, busca: '   ' })).toBe(false);
    expect(temFiltroDesempenho({ ...FILTROS_DESEMPENHO_PADRAO, busca: 'dev' })).toBe(true);
    expect(temFiltroDesempenho({ ...FILTROS_DESEMPENHO_PADRAO, situacao: 'aberta' })).toBe(true);
    expect(temFiltroDesempenho({ ...FILTROS_DESEMPENHO_PADRAO, ordenacao: 'titulo' })).toBe(true);
  });
});

describe('DesempenhoVagasDialog', () => {
  it('abre com cabeçalho, quatro KPIs e a tabela completa do recorte', () => {
    render(<DesempenhoVagasDialog open detalhes={detalhes()} onClose={() => {}} />);
    const modal = within(screen.getByRole('dialog'));

    expect(modal.getByText('Desempenho por vaga')).toBeInTheDocument();
    expect(modal.getByText(/Analise o volume de candidaturas/)).toBeInTheDocument();
    expect(modal.getByText('Total de vagas')).toBeInTheDocument();
    expect(modal.getByText('Total de candidatos')).toBeInTheDocument();
    expect(modal.getByText('Total de contratações')).toBeInTheDocument();
    expect(modal.getByText('Taxa de conversão geral')).toBeInTheDocument();
    // Cabeçalho da tabela + uma linha por vaga.
    expect(modal.getAllByRole('row')).toHaveLength(4);
    expect(modal.getByText('3 vagas no recorte')).toBeInTheDocument();
  });

  it('filtra pela busca e só então o "Limpar filtros" fica verde-lime', () => {
    render(<DesempenhoVagasDialog open detalhes={detalhes()} onClose={() => {}} />);
    const modal = within(screen.getByRole('dialog'));
    const limpar = modal.getByRole('button', { name: /Limpar filtros/i });

    expect(limpar).toBeDisabled();
    expect(limpar).toHaveAttribute('data-filtro-ativo', 'false');
    expect(limpar.className).not.toContain('bg-primary');

    fireEvent.change(modal.getByLabelText('Buscar vaga'), { target: { value: 'rh' } });

    expect(modal.getAllByRole('row')).toHaveLength(2);
    expect(limpar).not.toBeDisabled();
    expect(limpar).toHaveAttribute('data-filtro-ativo', 'true');
    expect(limpar.className).toContain('bg-primary');

    fireEvent.click(limpar);

    expect(modal.getAllByRole('row')).toHaveLength(4);
    expect(limpar).toBeDisabled();
  });

  it('detalha a vaga dentro da própria linha, sem abrir outra janela', () => {
    render(<DesempenhoVagasDialog open detalhes={detalhes()} onClose={() => {}} />);
    const modal = within(screen.getByRole('dialog'));
    const olho = modal.getByRole('button', { name: /Ver detalhes de Dev Full Stack/i });

    expect(olho).toHaveAttribute('aria-expanded', 'false');

    // A linha de detalhe existe SEMPRE — é o que permite a animação de saída
    // terminar antes de o painel sair do DOM. Fechada, ela é vazia (altura 0):
    // nenhum conteúdo, nenhuma dobra montada, nada visível na tabela.
    const linha = document.getElementById('detalhe-vaga-vaga-1')!;
    expect(linha).not.toBeNull();
    expect(linha.querySelector('[data-dobra]')).toBeNull();
    expect(linha.textContent).toBe('');

    fireEvent.click(olho);

    expect(olho).toHaveAttribute('aria-expanded', 'true');
    const painel = document.getElementById('detalhe-vaga-vaga-1')!;
    expect(within(painel).getByText('Candidaturas')).toBeInTheDocument();
    expect(within(painel).getByText('7 dias')).toBeInTheDocument();
    expect(within(painel).getAllByText('Triagem').length).toBeGreaterThan(0);
    // Continua sendo UMA janela: a expansão não abre outro dialog.
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
  });

  it('mantém o detalhe aberto quando a tabela é filtrada de novo', () => {
    render(<DesempenhoVagasDialog open detalhes={detalhes()} onClose={() => {}} />);
    const modal = within(screen.getByRole('dialog'));
    const olho = modal.getByRole('button', { name: /Ver detalhes de Dev Full Stack/i });
    fireEvent.click(olho);

    // A vaga continua no recorte: a linha dela é reaproveitada (mesma `key`),
    // então a dobra NÃO recomeça nem desmonta o painel.
    fireEvent.change(modal.getByLabelText('Buscar vaga'), { target: { value: 'dev' } });

    expect(olho).toHaveAttribute('aria-expanded', 'true');
    const painel = document.getElementById('detalhe-vaga-vaga-1')!;
    expect(painel.querySelector('[data-dobra="detalhe-vaga"]')).not.toBeNull();
    expect(within(painel).getByText('Candidaturas')).toBeInTheDocument();
  });

  it('anima a dobra num recorte com altura própria, sem tocar na tabela', () => {
    render(<DesempenhoVagasDialog open detalhes={detalhes()} onClose={() => {}} />);
    const modal = within(screen.getByRole('dialog'));
    fireEvent.click(modal.getByRole('button', { name: /Ver detalhes de Dev Full Stack/i }));

    const linha = document.getElementById('detalhe-vaga-vaga-1')!;
    const dobra = linha.querySelector('[data-dobra="detalhe-vaga"]') as HTMLElement;
    expect(dobra).not.toBeNull();
    // O recorte é o que impede o conteúdo de aparecer antes da expansão.
    expect(dobra.className).toContain('overflow-hidden');
    // O respiro entre o painel e a linha seguinte fica DENTRO da dobra: ele
    // encolhe junto (nenhum salto de 12px no primeiro/último quadro).
    expect(dobra.firstElementChild).toHaveClass('pb-3');
    // O painel (superfície + etapas) vive inteiro dentro do recorte.
    expect(within(dobra).getByText('Candidaturas')).toBeInTheDocument();
    expect(within(dobra).getByRole('list', { name: /Candidatos por etapa/ })).toBeInTheDocument();
    // A linha continua sendo UMA célula com `colSpan` de todas as colunas:
    // nenhuma coluna da tabela muda de largura por causa da dobra.
    expect(linha.querySelectorAll('td')).toHaveLength(1);
    expect(linha.querySelector('td')).toHaveAttribute('colspan', '7');
  });

  it('mostra "Não disponível" quando a vaga não tem amostra de tempo', () => {
    render(<DesempenhoVagasDialog open detalhes={detalhes()} onClose={() => {}} />);
    const modal = within(screen.getByRole('dialog'));
    fireEvent.click(modal.getByRole('button', { name: /Ver detalhes de Analista de Dados/i }));
    const painel = document.getElementById('detalhe-vaga-vaga-3')!;
    expect(within(painel).getByText('Não disponível')).toBeInTheDocument();
  });

  it('fecha pelo botão do rodapé, devolvendo o pedido ao card', () => {
    const onClose = vi.fn();
    render(<DesempenhoVagasDialog open detalhes={detalhes()} onClose={onClose} />);
    const modal = within(screen.getByRole('dialog'));
    // Dois botões atendem por "Fechar": o X da moldura e o do rodapé (o último).
    const botoes = modal.getAllByRole('button', { name: 'Fechar' });
    fireEvent.click(botoes[botoes.length - 1]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('não renderiza nada com a janela fechada', () => {
    render(<DesempenhoVagasDialog open={false} detalhes={detalhes()} onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('construirDetalheVagas', () => {
  it('mantém os números do card e acrescenta o que a janela precisa', () => {
    const lista = detalhes();
    // Ordem do card: volume de candidaturas (desc) — vaga-2 tem 1, vaga-3 tem 0.
    expect(lista.map((vaga) => vaga.id)).toEqual(['vaga-1', 'vaga-2', 'vaga-3']);

    const primeira = lista[0];
    expect(primeira.candidatos).toBe(3);
    expect(primeira.contratados).toBe(1);
    expect(primeira.conversao).toBe(33.3);
    expect(primeira.emProcesso).toBe(2);
    expect(primeira.departamento).toBe('Tecnologia');
    expect(primeira.situacao).toBe('aberta');
    expect(primeira.statusRotulo).toBe('Aberta');
    // (10 + 1 + 10) / 3 = 7 dias
    expect(primeira.tempoMedioDias).toBe(7);
  });

  it('distribui as candidaturas nas etapas configuradas do pipeline', () => {
    const primeira = detalhes()[0];
    expect(primeira.porEtapa.map((etapa) => etapa.label)).toEqual([
      'Triagem',
      'Entrevista',
      'Teste Técnico',
      'Proposta',
      'Contratado',
    ]);
    expect(primeira.porEtapa.map((etapa) => etapa.total)).toEqual([1, 1, 0, 0, 1]);
  });

  it('não inventa tempo médio para vaga sem candidatura', () => {
    const semCandidatura = detalhes().find((vaga) => vaga.id === 'vaga-3')!;
    expect(semCandidatura.candidatos).toBe(0);
    expect(semCandidatura.conversao).toBe(0);
    expect(semCandidatura.tempoMedioDias).toBeNull();
  });

  it('classifica o status real da vaga (aberta, pausada, encerrada)', () => {
    expect(situacaoDaVaga('aberta')).toBe('aberta');
    expect(situacaoDaVaga('Pausada')).toBe('pausada');
    expect(situacaoDaVaga('encerrada')).toBe('encerrada');
    expect(situacaoDaVaga(null)).toBe('indefinida');
    expect(detalhes().map((vaga) => vaga.situacao)).toEqual(['aberta', 'encerrada', 'pausada']);
  });

  it('resume os quatro KPIs sobre a base inteira do recorte', () => {
    expect(resumirDesempenhoVagas(detalhes())).toEqual({
      vagas: 3,
      candidatos: 4,
      contratacoes: 1,
      emProcesso: 2,
      conversao: 25,
    });
  });
});

describe('AnalyticsVagas — resumo do card', () => {
  function detalhesCinco() {
    const listaVagas = Array.from({ length: 5 }, (_, indice) =>
      criarVaga({ id: `vaga-${indice + 1}`, titulo: `Vaga ${indice + 1}`, status: 'aberta' })
    );
    const listaCandidaturas = listaVagas.map((vaga, indice) =>
      candidatura({ id: `c-${indice + 1}`, vaga_id: vaga.id, etapa: 'triagem' })
    );
    return construirDetalheVagas(listaVagas, listaCandidaturas, REFERENCIA);
  }

  it('mantém quatro vagas no resumo e abre a janela completa pelo "Ver todas"', () => {
    const lista = detalhesCinco();
    render(<AnalyticsVagas vagas={lista} detalhes={lista} index={9} />);

    // Resumo intacto: só as quatro primeiras.
    expect(screen.getByText('Vaga 1')).toBeInTheDocument();
    expect(screen.getByText('Vaga 4')).toBeInTheDocument();
    expect(screen.queryByText('Vaga 5')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();

    const botao = screen.getByRole('button', { name: 'Ver todas (5)' });
    // Tinta lime do tema + hover de baixa opacidade em 200ms, sem borda nova.
    expect(botao.className).toContain('text-primary');
    expect(botao.className).toContain('hover:bg-primary/10');
    expect(botao.className).toContain('duration-200');
    expect(botao).toHaveAttribute('aria-haspopup', 'dialog');

    fireEvent.click(botao);

    const modal = within(screen.getByRole('dialog'));
    expect(modal.getByText('Vaga 5')).toBeInTheDocument();
    expect(modal.getByText('5 vagas no recorte')).toBeInTheDocument();
  });
});
