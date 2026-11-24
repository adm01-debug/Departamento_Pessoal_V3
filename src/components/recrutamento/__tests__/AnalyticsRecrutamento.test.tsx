import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { criarCandidatura, criarVaga } from './candidatosFixture';

/**
 * Composição da aba: garante que as QUATRO faixas e os SETE painéis existem,
 * inclusive nos estados vazios, e que a barra de recorte (período · vaga ·
 * exportar) está ligada — o Exportar precisa baixar o CSV do recorte atual.
 * O Recharts é substituído por contêineres simples — a matemática é testada em
 * `analyticsComum.test.ts`, o recorte em `analyticsFiltros.test.ts`, o CSV em
 * `analyticsRelatorio.test.ts` e o gráfico real é validado no navegador.
 */
const { mockToastSuccess } = vi.hoisted(() => ({ mockToastSuccess: vi.fn() }));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div data-testid="grafico">{children}</div>,
  ComposedChart: ({ children }: { children: ReactNode }) => <svg>{children}</svg>,
  Area: () => null,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));
vi.mock('sonner', () => ({ toast: { success: mockToastSuccess, error: vi.fn() } }));

import { AnalyticsRecrutamento } from '../AnalyticsRecrutamento';

function cenario() {
  const vaga = criarVaga({
    id: 'vaga-1',
    titulo: 'Desenvolvedor(a) Full Stack Sênior',
    status: 'aberta',
    data_abertura: '2026-08-01',
    created_at: '2026-08-01T12:00:00Z',
  });
  const triagem = criarCandidatura({
    id: 'candt-1',
    etapa: 'triagem',
    vaga_id: 'vaga-1',
    created_at: '2026-08-03T12:00:00Z',
    updated_at: '2026-08-03T12:00:00Z',
  });
  const contratado = criarCandidatura({
    id: 'candt-2',
    etapa: 'contratado',
    status: 'contratado',
    vaga_id: 'vaga-1',
    candidato_id: 'pessoa-2',
    created_at: '2026-08-05T12:00:00Z',
    updated_at: '2026-08-05T12:00:00Z',
  });
  contratado.candidato = {
    ...contratado.candidato!,
    id: 'pessoa-2',
    nome: 'Bruno Carvalho',
    email: 'bruno@email.com',
    origem: 'Gupy',
  };
  return {
    candidaturas: [triagem, contratado],
    vagas: [vaga],
    candidatos: [triagem.candidato!, contratado.candidato!],
  };
}

describe('AnalyticsRecrutamento', () => {
  it('renderiza KPIs, funil, evolução, origens, operação e indicadores', () => {
    const dados = cenario();
    render(<AnalyticsRecrutamento {...dados} />);

    expect(screen.getByText('Visão analítica do recrutamento')).toBeInTheDocument();
    ['Vagas abertas', 'Total de candidatos', 'Processos ativos', 'Taxa de conversão'].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
    [
      'Funil de recrutamento',
      'Evolução de candidaturas',
      'Principais origens',
      'Tempo médio por etapa',
      'Pontos de atenção',
      'Desempenho por vaga',
      'Principais indicadores',
    ].forEach((titulo) => {
      expect(screen.getByText(titulo)).toBeInTheDocument();
    });
    expect(screen.getByTestId('grafico')).toBeInTheDocument();
    expect(screen.getAllByText('Desenvolvedor(a) Full Stack Sênior').length).toBeGreaterThan(0);
  });

  it('mostra estados vazios coerentes quando a base está vazia', () => {
    render(<AnalyticsRecrutamento candidaturas={[]} vagas={[]} candidatos={[]} />);
    expect(screen.getByText('Nenhuma candidatura no funil')).toBeInTheDocument();
    expect(screen.getByText('Sem movimentações no período')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma origem registrada')).toBeInTheDocument();
    expect(screen.getByText('Sem tempo registrado')).toBeInTheDocument();
    expect(screen.getByText('Nenhum gargalo crítico')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma vaga cadastrada')).toBeInTheDocument();
  });

  it('expõe a barra de recorte e as âncoras de layout dos painéis', () => {
    const { container } = render(<AnalyticsRecrutamento {...cenario()} />);

    expect(container.querySelector('[data-analytics-filtros]')).not.toBeNull();
    expect(container.querySelectorAll('[data-analytics-kpi]')).toHaveLength(4);
    // SETE painéis: funil, evolução, origens, tempo, atenção e vagas + o painel
    // de indicadores, que deixou de ser uma faixa solta de quatro cards e passou
    // a morar dentro de um painel com título próprio, igual aos outros seis.
    expect(container.querySelectorAll('[data-analytics-painel]')).toHaveLength(7);
    expect(container.querySelectorAll('[data-analytics-indicador]')).toHaveLength(4);
    expect(screen.getByLabelText('Período do recorte')).toBeInTheDocument();
    expect(screen.getByLabelText('Vaga do recorte')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /exportar/i })).toBeInTheDocument();
    // Sem recorte escolhido não aparece o selo "recorte ativo".
    expect(screen.queryByText('recorte ativo')).toBeNull();
  });

  it('desliga a entrada por CSS em TODOS os cards da aba (opt-out data-entrada)', () => {
    const { container } = render(<AnalyticsRecrutamento {...cenario()} />);

    // Cada card desta aba JÁ anima por Framer Motion (`entradaCard`), e o `Card`
    // do design system carrega `.animate-squash`. Sem o opt-out, as DUAS
    // entradas rodam no mesmo nó: a CSS chega ao fim primeiro e, com
    // `animation-fill-mode: backwards`, devolve `transform`/`opacity` para a
    // Motion — que aqui ainda está no começo do seu slot (0,48 s a 0,96 s).
    // O card sobe, DESCE os 14px de volta e sobe outra vez. Medido no navegador
    // antes da correção: o painel da Evolução ia de 333,25px para 347,25px no
    // meio da entrada. O opt-out (`index.css`,
    // `.animate-squash[data-entrada='cascata']`) deixa um movimento só — a
    // mesma solução dos cards do Dashboard Executivo.
    const cards = Array.from(
      container.querySelectorAll('[data-analytics-painel], [data-analytics-kpi], [data-analytics-indicador]')
    );
    // 7 painéis + 4 KPIs + 4 indicadores (as mesmas contagens do teste acima).
    expect(cards).toHaveLength(15);
    const semOptOut = cards
      .filter((card) => card.getAttribute('data-entrada') !== 'cascata')
      .map(
        (card) =>
          card.getAttribute('data-analytics-painel') ??
          card.getAttribute('data-analytics-kpi') ??
          card.getAttribute('data-analytics-indicador')
      );
    expect(semOptOut).toEqual([]);
  });

  it('mantém os cards da aba ESTÁTICOS no hover (sem elevação, contorno colorido ou fundo)', () => {
    const { container } = render(<AnalyticsRecrutamento {...cenario()} />);

    // Revisão de UI/UX: os cards da Analytics são superfícies de LEITURA. A aba
    // usa o perfil estático de `ui/interacao-cards.ts`
    // (`CARD_INTERACAO_ESTATICO` / `CARD_INTERACAO_ICONE_ESTATICO`), então
    // nenhum dos 15 cards pode carregar:
    //   - `.card-interacao` — a elevação de 2px (`translate`) do Dashboard;
    //   - `hover:border-*` — era o contorno `primary/40`, o verde-lime do tema;
    //   - `hover:` de fundo/sombra/escala/deslocamento e `group-hover:` (o chip
    //     do ícone escalava 1.05).
    const cards = Array.from(
      container.querySelectorAll('[data-analytics-painel], [data-analytics-kpi], [data-analytics-indicador]')
    );
    // 7 painéis + 4 KPIs + 4 indicadores (as mesmas contagens dos testes acima).
    expect(cards).toHaveLength(15);
    const HOVER_DECORATIVO =
      /(^|\s)card-interacao(\s|$)|(^|\s)(hover|group-hover):(border|bg|shadow|scale|translate|-translate|filter|opacity)/;
    const decorados = cards
      .filter((card) => HOVER_DECORATIVO.test(card.className))
      .map(
        (card) =>
          card.getAttribute('data-analytics-painel') ??
          card.getAttribute('data-analytics-kpi') ??
          card.getAttribute('data-analytics-indicador')
      );
    expect(decorados).toEqual([]);

    // A borda NEUTRA de repouso continua em todos (o que saiu foi só o hover).
    const semBorda = cards.filter((card) => !/(^|\s)border(\s|$)/.test(card.className));
    expect(semBorda).toEqual([]);

    // Nenhum chip de ícone (KPIs, indicadores, cabeçalho dos painéis) escala no
    // hover do card: a classe `group` saiu junto com o `group-hover:scale-105`.
    expect(Array.from(container.querySelectorAll('[class*="group-hover"]'))).toEqual([]);

    // O que CONTINUA respondendo ao mouse: os controles. A barra de recorte
    // (período · vaga · Exportar) mantém hover e anel de foco — remover o hover
    // decorativo dos cards não pode matar a afordância dos botões.
    const exportar = screen.getByRole('button', { name: /exportar/i });
    expect(exportar.className).toContain('hover:');
    expect(screen.getByLabelText('Período do recorte').className).toContain('hover:');
    expect(screen.getByLabelText('Vaga do recorte').className).toContain('hover:');
  });

  it('exporta o recorte atual em CSV', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<AnalyticsRecrutamento {...cenario()} />);

    await userEvent.click(screen.getByRole('button', { name: /exportar/i }));

    expect(click).toHaveBeenCalledTimes(1);
    // Data de referência da base do cenário (05/08/2026).
    expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringContaining('analytics-recrutamento-2026-08-05.csv'));
  });

  it('mantém quatro vagas no resumo e abre a base completa no "Ver todas"', async () => {
    const vagas = Array.from({ length: 6 }, (_, indice) =>
      criarVaga({ id: `vaga-${indice}`, titulo: `Vaga ${indice}`, status: 'aberta' })
    );
    render(<AnalyticsRecrutamento candidaturas={[]} vagas={vagas} candidatos={[]} />);

    // O resumo continua com quatro linhas e o total no próprio botão.
    expect(screen.getAllByText(/^Vaga \d$/)).toHaveLength(4);
    const abrir = screen.getByRole('button', { name: /ver todas \(6\)/i });
    expect(abrir).toHaveAttribute('aria-haspopup', 'dialog');
    expect(screen.queryByRole('dialog')).toBeNull();

    await userEvent.click(abrir);

    // A janela traz as seis vagas (cabeçalho da tabela + 6 linhas), sem que o
    // resumo do card cresça junto — é essa separação que o "Ver todas" faz.
    const modal = within(screen.getByRole('dialog'));
    expect(modal.getByText('Vaga 5')).toBeInTheDocument();
    expect(modal.getAllByRole('row')).toHaveLength(7);
    expect(screen.getAllByText(/^Vaga \d$/)).toHaveLength(10);
  });

  it('não mostra o toggle quando a lista cabe inteira', () => {
    render(<AnalyticsRecrutamento {...cenario()} />);
    expect(screen.queryByRole('button', { name: /ver todas/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /ver todos/i })).toBeNull();
  });

  it('mostra alertas curtos e guarda o detalhe técnico fora do card resumido', () => {
    // Base com referência em 30/06/2026: a candidatura de Triagem parou em
    // 02/01 (179 dias) e a vaga aberta não anda desde então.
    const vagaParada = criarVaga({
      id: 'vaga-parada',
      titulo: 'Assistente Administrativo',
      status: 'aberta',
      data_abertura: '2026-01-02',
      created_at: '2026-01-02T12:00:00Z',
    });
    const vagaAtiva = criarVaga({
      id: 'vaga-ativa',
      titulo: 'Analista de Dados',
      status: 'aberta',
      data_abertura: '2026-06-30',
      created_at: '2026-06-30T12:00:00Z',
    });
    const parada = criarCandidatura({
      id: 'candt-parada',
      etapa: 'triagem',
      vaga_id: 'vaga-parada',
      created_at: '2026-01-02T12:00:00Z',
      updated_at: '2026-01-02T12:00:00Z',
    });
    // Em Entrevista (e não em Triagem) para a Triagem ficar com UM parado só.
    const recente = criarCandidatura({
      id: 'candt-recente',
      etapa: 'entrevista',
      vaga_id: 'vaga-ativa',
      candidato_id: 'pessoa-9',
      created_at: '2026-06-30T12:00:00Z',
      updated_at: '2026-06-30T12:00:00Z',
    });
    const { container } = render(
      <AnalyticsRecrutamento
        candidaturas={[parada, recente]}
        vagas={[vagaParada, vagaAtiva]}
        candidatos={[parada.candidato!, recente.candidato!]}
      />
    );

    // Título curto, sem reticências e sem o nome da vaga; descrição de apoio.
    expect(screen.getByText('Triagem: 1 candidato parado')).toBeInTheDocument();
    expect(screen.getByText('Priorize a análise desta etapa.')).toBeInTheDocument();
    // O título da vaga parada fica com o FATO (dias) e não com o nome.
    expect(screen.getByText(/^Vaga parada há \d+ dias$/)).toBeInTheDocument();

    // O texto técnico (permanência média, nome completo da vaga) NÃO aparece no
    // card resumido — viaja no `title` da linha, que é a leitura detalhada.
    expect(screen.queryByText(/Permanência média de/)).toBeNull();
    const linhaTecnica = container.querySelector('li[title*="Permanência média de"]');
    expect(linhaTecnica).not.toBeNull();
    expect(linhaTecnica).toHaveAttribute('title', expect.stringContaining('alerta a partir de 21 dias'));
    const linhaDaVaga = container.querySelector('li[title*="última movimentação"]');
    expect(linhaDaVaga).toHaveAttribute('title', expect.stringContaining('Assistente Administrativo'));

    // O rodapé técnico antigo ("Regras: permanência > 21 dias…") saiu da UI.
    expect(screen.queryByText(/Regras:/)).toBeNull();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mockToastSuccess.mockClear();
  });
});
