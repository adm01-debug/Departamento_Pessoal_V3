import { describe, it, expect, vi } from 'vitest';
import { type ComponentProps } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('framer-motion', () => ({
  // Mock completo: o dashboard reaproveita `MetricCard`, `MiniSparkline` e
  // `DonutChart` (src/components/dashboard), que usam `motion.create`, `useInView`
  // e elementos SVG (`polygon`/`polyline`/`circle`) além do `motion.div`.
  // Os elementos só rendem `children` (sem repassar props de animação ao DOM).
  motion: {
    create:
      (Component: any) =>
      ({ children, ...rest }: any) => <Component {...rest}>{children}</Component>,
    div: ({ children }: any) => <div>{children}</div>,
    span: ({ children }: any) => <span>{children}</span>,
    li: ({ children }: any) => <li>{children}</li>,
    circle: () => <circle />,
    polygon: () => <polygon />,
    polyline: () => <polyline />,
    // O gráfico de tempo médio ganhou o clip-path de revelação (`motion.rect`)
    // — o mesmo do card "Visão Geral da Empresa" (`HeadcountOverviewCard.tsx`).
    rect: () => <rect />,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useInView: () => true,
  useReducedMotion: () => false,
}));

vi.mock('recharts', () => ({
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  Cell: () => null,
  // O gráfico de tempo médio virou área (linha + degradê), então o container
  // testado é `AreaChart`/`Area` em vez de `LineChart`/`Line`.
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => null,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
  CardDescription: ({ children }: any) => <p>{children}</p>,
}));

// O `MiniSparkline` é mockado (com testid) só para provar que os KPI Cards de
// Admissões NÃO o renderizam: o prop `sparkline` continua existindo no
// `MetricCard` compartilhado, mas esta tela não o passa — então não há micro
// gráfico decorativo no canto direito do card.
vi.mock('@/components/dashboard/MiniSparkline', () => ({
  MiniSparkline: () => <svg data-testid="mini-sparkline" />,
}));

// Os modais dos quatro widgets reaproveitam o `AnimatedCascadeDialog` do popup
// de Pendências (Radix + framer-motion). Aqui o alvo é o CONTEÚDO de cada modal
// (só os dados detalhados do card), não a coreografia — que é do componente
// compartilhado. Por isso o mock respeita `open` (fechado não renderiza nada,
// como o original) e expõe o conteúdo com `role="dialog"`, o mesmo padrão já
// usado em `ContasBancariasTab.test.tsx` para esse mesmo componente.
vi.mock('@/components/ui/animated-cascade-dialog', () => ({
  AnimatedCascadeDialog: ({ open, title, items }: any) =>
    open ? (
      <div role="dialog" aria-label={title}>
        <h2>{title}</h2>
        {items}
      </div>
    ) : null,
}));

import { OnboardingDashboard } from '../admissoes/OnboardingDashboard';

/**
 * O dashboard navega a partir dos modais ("Resolver agora" → `/exames`,
 * `/esocial`), então `useNavigate` exige um Router no teste — mesmo caminho de
 * `ColaboradoresPage.test.tsx`.
 */
const renderDashboard = (admissoes: any[], props: Partial<ComponentProps<typeof OnboardingDashboard>> = {}) =>
  render(
    <MemoryRouter>
      <OnboardingDashboard admissoes={admissoes} {...props} />
    </MemoryRouter>
  );

const MOCK_ADMISSOES = [
  { id: '1', etapa: 'documentos' },
  { id: '2', etapa: 'documentos' },
  { id: '3', etapa: 'concluida' },
  { id: '4', etapa: 'cancelada' },
];

/**
 * Fixture com data prevista: sem `data_prevista` válida a lista de "Próximas
 * Admissões" cai no estado vazio (`PanelEmpty`) e não chega a montar o
 * container com scroll interno.
 */
const MOCK_ADMISSOES_COM_DATA = [
  { id: '1', nome: 'Ana Souza', etapa: 'documentos', data_prevista: '2026-12-01' },
  { id: '2', nome: 'Bruno Lima', etapa: 'exame', data_prevista: '2026-12-02' },
];

/**
 * Datas RELATIVAS: a classificação de prazo do card ("Atrasadas" / "Em risco" /
 * "Dentro do SLA") depende de "hoje", então as fixtures abaixo não podem usar
 * data fixa. A string sai das partes LOCAIS da data — é o mesmo formato usado na
 * coluna real (`YYYY-MM-DD`), sem passar por UTC.
 */
const emDias = (dias: number) => {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
};

/** Checklist completo da admissão (as sete colunas reais de `public.admissoes`). */
const CHECKLIST_COMPLETO = {
  checklist_documentos_pessoais: true,
  checklist_comprovante_endereco: true,
  checklist_foto: true,
  checklist_ctps: true,
  checklist_exame_admissional: true,
  checklist_contrato_assinado: true,
  checklist_esocial_enviado: true,
};

/** Cinco admissões em andamento: o card exibe 4, o modal precisa exibir as 5. */
const MOCK_ADMISSOES_CINCO = ['Ana Souza', 'Bruno Lima', 'Carla Dias', 'Diego Nunes', 'Elias Prado'].map(
  (nome, indice) => ({
    id: String(indice + 1),
    nome,
    cargo: 'Analista',
    departamento: 'Financeiro',
    etapa: 'documentos',
    data_prevista: emDias(5 + indice),
    observacoes: 'Link seguro enviado ao candidato com a lista de documentos.',
    metadata: { responsavel: 'Camila Ribeiro' },
    ...CHECKLIST_COMPLETO,
    // Metade com o checklist completo (7/7), metade com o CTPS em falta (6/7) —
    // é o insumo do "progresso" que o modal mostra por admissão.
    checklist_ctps: indice % 2 === 0,
  })
);

/** Sete áreas, uma admissão cada: no card as duas últimas entram em "Outros". */
const AREAS_SETE = ['Área Um', 'Área Dois', 'Área Três', 'Área Quatro', 'Área Cinco', 'Área Seis', 'Área Sete'];

const MOCK_ADMISSOES_SETE_AREAS = AREAS_SETE.map((departamento, indice) => ({
  id: `area-${indice + 1}`,
  nome: `Candidato ${indice + 1}`,
  cargo: 'Assistente',
  departamento,
  etapa: 'concluida',
  data_prevista: emDias(-10 - indice),
}));

/** Um processo em cada faixa de prazo (mesma régua das contagens do card). */
const MOCK_ADMISSOES_SLA = [
  {
    id: 'a',
    nome: 'Ana Atrasada',
    cargo: 'Analista',
    departamento: 'Financeiro',
    etapa: 'documentos',
    data_prevista: emDias(-3),
    metadata: { responsavel: 'Camila Ribeiro' },
    ...CHECKLIST_COMPLETO,
    checklist_esocial_enviado: false,
  },
  {
    id: 'b',
    nome: 'Bruno Risco',
    cargo: 'Analista',
    departamento: 'Comercial',
    etapa: 'contrato',
    data_prevista: emDias(2),
    metadata: { responsavel: 'Diego Martins' },
    ...CHECKLIST_COMPLETO,
  },
  {
    id: 'c',
    nome: 'Carla Dentro',
    cargo: 'Assistente',
    departamento: 'Comercial',
    etapa: 'validacao',
    data_prevista: emDias(30),
    ...CHECKLIST_COMPLETO,
  },
];

describe('OnboardingDashboard', () => {
  it('renders Total Iniciadas KPI', () => {
    renderDashboard(MOCK_ADMISSOES);
    expect(screen.getByText('Total Iniciadas')).toBeInTheDocument();
  });

  it('renders Em Andamento KPI', () => {
    renderDashboard(MOCK_ADMISSOES);
    expect(screen.getByText('Em Andamento')).toBeInTheDocument();
  });

  it('renders Finalizadas KPI', () => {
    renderDashboard(MOCK_ADMISSOES);
    expect(screen.getByText('Finalizadas')).toBeInTheDocument();
  });

  it('renders Canceladas KPI', () => {
    renderDashboard(MOCK_ADMISSOES);
    expect(screen.getByText('Canceladas')).toBeInTheDocument();
  });

  it('shows correct total count', () => {
    renderDashboard(MOCK_ADMISSOES);
    const totalCard = screen.getByText('Total Iniciadas').closest('div');
    expect(totalCard?.textContent).toContain('4');
  });

  it('shows Tempo Médio de Admissão chart title', () => {
    renderDashboard(MOCK_ADMISSOES);
    expect(screen.getByText(/Tempo Médio de Admissão/i)).toBeInTheDocument();
  });

  it('renders charts', () => {
    renderDashboard(MOCK_ADMISSOES);
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
  });

  it('handles empty admissoes array', () => {
    renderDashboard([]);
    expect(screen.getByText('Total Iniciadas')).toBeInTheDocument();
  });

  it('não renderiza micro gráfico nos KPI cards', () => {
    renderDashboard(MOCK_ADMISSOES);
    expect(screen.queryAllByTestId('mini-sparkline')).toHaveLength(0);
  });

  // A linha de apoio (indicador + frase) é renderizada sem `truncate`: o texto
  // sai por inteiro no DOM, sem depender de largura disponível.
  it('mostra a frase de apoio completa de cada KPI', () => {
    renderDashboard(MOCK_ADMISSOES);
    expect(screen.getByText('processos no período')).toBeInTheDocument();
    expect(screen.getByText('em pipeline agora')).toBeInTheDocument();
    expect(screen.getByText('concluídas no período')).toBeInTheDocument();
    expect(screen.getByText('processos encerrados no período')).toBeInTheDocument();
  });

  // ─── Scroll interno (cabeçalho fixo, lista rolando dentro do card) ───────
  // As 3 listas são os ÚNICOS containers com `overflow-y-auto` +
  // `scroll-interno` + ALTURA EXPLÍCITA (`ALTURA_LISTA_WIDGET` = `h-[136px]`).
  // O cabeçalho (título/subtítulo) fica FORA dele e — no "SLA & Alertas" — o
  // bloco "Taxa de conclusão" fica DENTRO, como último filho: é ele que faz o
  // conteúdo passar da viewport e a barra existir de verdade.
  it('dá overflow próprio a exatamente 3 listas, e não ao resto do dashboard', () => {
    // Fixture com data prevista: é ela que faz a 3ª lista ("Próximas
    // Admissões") sair do estado vazio e montar o container com scroll.
    renderDashboard(MOCK_ADMISSOES_COM_DATA);
    const regioes = document.querySelectorAll('.scroll-interno');
    expect(regioes).toHaveLength(3);
    regioes.forEach((regiao) => {
      expect(regiao).toHaveClass('overflow-y-auto');
      // Altura explícita: com `flex-1` o container esticava até o miolo do card
      // (164px) e, como o conteúdo real cabe ali (150/155px), a viewport ficava
      // maior que a lista — `scrollHeight === clientHeight`, barra nenhuma.
      expect(regiao).toHaveClass('h-[136px]');
      expect(regiao).not.toHaveClass('flex-1');
    });
    // O card "Distribuição por Área" (o donut) não entra no scroll interno.
    expect(screen.getByText('Distribuição por Área').closest('.scroll-interno')).toBeNull();
  });

  it('rola a lista de ações prioritárias sem o título do card dentro do scroll', () => {
    renderDashboard(MOCK_ADMISSOES);
    const regiao = screen.getByText('documentos pendentes').closest('.scroll-interno');
    expect(regiao).not.toBeNull();
    expect(regiao!.textContent).not.toContain('Ações Prioritárias');
    expect(regiao!.textContent).not.toContain('Itens que precisam da sua atenção');
  });

  it('rola a lista de próximas admissões com o selo de etapa dentro da linha', () => {
    renderDashboard(MOCK_ADMISSOES_COM_DATA);
    const regiao = screen.getByText('Ana Souza').closest('.scroll-interno');
    expect(regiao).not.toBeNull();
    // O selo faz parte da linha que rola: nunca sobra para ele sair do card.
    expect(regiao!.textContent).toContain('Docs Pendentes');
    expect(regiao!.textContent).toContain('Bruno Lima');
  });

  it('rola o SLA & Alertas com o rodapé "Taxa de conclusão" dentro do scroll', () => {
    renderDashboard(MOCK_ADMISSOES);
    const regiao = screen.getByText('Dentro do SLA').closest('.scroll-interno');
    expect(regiao).not.toBeNull();
    // Os três indicadores rolam junto com o bloco final…
    expect(regiao!.textContent).toContain('Em risco');
    expect(regiao!.textContent).toContain('Atrasadas');
    // …e o bloco final faz parte da MESMA área rolável: 3 linhas + rodapé dão
    // ~155px de conteúdo para uma viewport de 136px — é esse excedente que
    // garante a barra de rolagem no card.
    expect(regiao!.textContent).toContain('Taxa de conclusão');
    expect(screen.getByText('Taxa de conclusão').closest('.scroll-interno')).toBe(regiao);
  });

  // ─── Modais de detalhe dos quatro widgets ────────────────────────────────
  // Cada atalho do cabeçalho abre um modal com o MESMO padrão do popup de
  // Pendências (aqui mockado com `role="dialog"`): só os dados do card SEM o
  // corte de exibição — o bloco de explicação que abria cada modal foi removido
  // por completo, então nenhum texto introdutório precede a lista. O conteúdo é
  // gerado pelo dashboard (o número do card e a lista do modal saem da mesma
  // derivação), então é isso que estes testes cobrem.

  it('abre o modal de Ações Prioritárias direto na fila das quatro famílias', () => {
    renderDashboard(MOCK_ADMISSOES);
    // Fechado, o modal não renderiza nada (igual ao original, via Radix).
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getAllByRole('button', { name: /Ver todas/i })[0]);
    const modal = within(screen.getByRole('dialog'));

    // O bloco de explicação que abria o modal foi removido por completo: nenhuma
    // das seções explicativas aparece (nem o antigo título "Entenda estas
    // informações"), então o miolo começa na fila das quatro famílias.
    expect(modal.queryByText('Entenda estas informações')).toBeNull();
    [
      'O que é',
      'De onde vêm os dados',
      'Como é calculado',
      'Como a prioridade é definida',
      'Quando agir',
      'Quem é responsável',
      'Consequências de não tratar',
      'Limitações e observações',
    ].forEach((secao) => expect(modal.queryByText(secao)).toBeNull());
    // Nenhuma sobra da caixa do bloco (`bg-muted/20` era exclusivo dele): o
    // espaço que ela ocupava não virou faixa vazia.
    expect(screen.getByRole('dialog').querySelector('[class*="bg-muted/20"]')).toBeNull();

    // As quatro famílias com o MESMO número do card (2 documentos + 1 cancelada).
    expect(modal.getByText('Documentos pendentes')).toBeInTheDocument();
    expect(modal.getByText('Exames em atraso')).toBeInTheDocument();
    expect(modal.getByText('Contratos aguardando assinatura')).toBeInTheDocument();
    expect(modal.getByText('Falha no eSocial')).toBeInTheDocument();
    expect(modal.getAllByText('admissões nesta condição')).toHaveLength(3);
    expect(modal.getAllByText('admissão nesta condição')).toHaveLength(1);
    // E a fila inteira de candidatos: 2 na família de documentos + 1 na de eSocial.
    expect(modal.getAllByText('Candidato sem nome')).toHaveLength(3);
  });

  it('nenhum dos quatro modais exibe o bloco de explicação — a lista vem primeiro', () => {
    // Critério: abrir qualquer um dos quatro modais não pode mostrar texto
    // introdutório. O bloco de explicação (seções "O que é", "De onde vêm os
    // dados", …) foi removido por COMPLETO dos quatro modais, junto com a caixa
    // que o envolvia: o miolo começa no primeiro bloco de dado, e no lugar do
    // bloco não sobra caixa nem faixa vazia.
    const titulosRemovidos = [
      'O que é',
      'O que é SLA no processo de admissão',
      'O que define uma próxima admissão',
      'O que precisa estar concluído antes da data',
      'O que significa cada etapa',
      'O que significa o total central',
      'De onde vêm os dados',
      'De onde vêm os prazos',
      'Como é calculado',
      'Como interpretar a concentração',
      'Como usar para planejamento',
      'Como a prioridade é definida',
      'Quando agir',
      'Quando um processo muda de categoria',
      'Quem deve agir',
      'Quem acompanha',
      'Quais admissões entram no cálculo',
      'Qual período é considerado',
      'Diferença entre as quatro famílias',
      'Diferença entre Dentro do SLA, Em risco e Atrasadas',
      'Consequências de não tratar',
      'Consequências de atrasos',
      'Riscos de chegar à data com pendências',
      'Por que é útil para o RH',
      'Por que o SLA é importante',
      'Onde atualizar os dados',
      'Onde corrigir cada situação',
      'Limitações e observações',
    ];
    // O primeiro bloco de DADO de cada modal (o que o usuário passa a ver logo
    // abaixo do título, sem nada de explicação antes).
    const casos = [
      { atalho: /Ver todas/, indice: 0, admissoes: MOCK_ADMISSOES, primeiroDado: 'Documentos pendentes' },
      {
        atalho: /Ver todas/,
        indice: 1,
        admissoes: MOCK_ADMISSOES_SLA,
        primeiroDado: /admiss(õ|o)es? em andamento/,
      },
      {
        atalho: /Ver detalhes/,
        indice: 0,
        admissoes: MOCK_ADMISSOES_SLA,
        primeiroDado: 'Total de admissões consideradas:',
      },
      { atalho: /Ver detalhes/, indice: 1, admissoes: MOCK_ADMISSOES_SLA, primeiroDado: 'Resumo agora' },
    ];

    casos.forEach((caso) => {
      // Um render por caso: o mock do modal não tem botão de fechar (a coreografia
      // é do componente compartilhado), então desmonta para não acumular diálogos.
      const { unmount } = renderDashboard(caso.admissoes);
      fireEvent.click(screen.getAllByRole('button', { name: caso.atalho })[caso.indice]);

      const dialogEl = screen.getByRole('dialog');
      const modal = within(dialogEl);
      // Nem o antigo título do cabeçalho, nem qualquer seção do bloco removido.
      expect(modal.queryByText('Entenda estas informações')).toBeNull();
      titulosRemovidos.forEach((titulo) => expect(modal.queryByText(titulo)).toBeNull());
      // Nem sobras da caixa do bloco (`bg-muted/20` era exclusivo dela).
      expect(dialogEl.querySelector('[class*="bg-muted/20"]')).toBeNull();
      // E o modal abre no primeiro bloco de dado do card.
      expect(modal.getByText(caso.primeiroDado)).toBeInTheDocument();

      unmount();
    });
  });

  it('campos longos usam fluxo de texto — o rótulo nunca vira coluna fixa', () => {
    // Critério: rótulo e valor no MESMO parágrafo, em fluxo normal, para que a
    // quebra do valor use a largura INTEIRA do card. Coluna fixa para o rótulo
    // (`flex` + `shrink-0`, `grid-cols-[…]`, `w-*`/`basis-*` no rótulo) ou
    // indentação à esquerda no valor (`pl-*`/`ml-*`) é o que deixava o vão vazio
    // a partir da 2ª linha — e é o que nenhum campo dos quatro modais pode ter.
    const casos: {
      atalho: RegExp;
      indice: number;
      admissoes: any[];
      /** Rótulos conferidos em todos os campos (curtos e longos). */
      rotulos: string[];
      /** Subconjunto que QUEBRA linha na largura do modal — o caso crítico. */
      longos: string[];
      /** Valor de linha de lista que também não pode ter indentação à esquerda. */
      legenda?: RegExp;
    }[] = [
      {
        atalho: /Ver todas/,
        indice: 0,
        admissoes: MOCK_ADMISSOES,
        rotulos: ['Por que é prioritário:', 'Ação recomendada:', 'Onde resolver:', 'Pendências:'],
        longos: ['Por que é prioritário:', 'Ação recomendada:', 'Onde resolver:'],
      },
      {
        atalho: /Ver todas/,
        indice: 1,
        admissoes: MOCK_ADMISSOES_CINCO,
        rotulos: ['Observação registrada:', 'Próxima ação:', 'Pendências:'],
        longos: ['Observação registrada:', 'Próxima ação:'],
      },
      {
        atalho: /Ver detalhes/,
        indice: 0,
        admissoes: MOCK_ADMISSOES_SETE_AREAS,
        rotulos: ['Total de admissões consideradas:'],
        longos: [],
        legenda: /Área com mais admissões/,
      },
      {
        atalho: /Ver detalhes/,
        indice: 1,
        admissoes: MOCK_ADMISSOES_SLA,
        rotulos: ['Como ler:', 'Próxima ação:'],
        longos: ['Como ler:', 'Próxima ação:'],
      },
    ];

    casos.forEach((caso) => {
      const { unmount } = renderDashboard(caso.admissoes);
      fireEvent.click(screen.getAllByRole('button', { name: caso.atalho })[caso.indice]);
      const modal = within(screen.getByRole('dialog'));

      caso.rotulos.forEach((rotulo) => {
        const label = modal.getAllByText(rotulo)[0];
        const linha = label.parentElement as HTMLElement;
        // Rótulo e valor no mesmo `<p>` em fluxo de texto: sem container com
        // coluna fixa e sem margem/padding à esquerda no valor.
        expect(linha.tagName).toBe('P');
        expect(linha.className).not.toMatch(/flex|grid|basis-|(^|\s)(pl|ml)-/);
        expect(label.className).not.toMatch(/shrink-0|basis-|(^|\s)w-/);

        // O valor é o irmão seguinte do rótulo (mesma linha, mesmo parágrafo) e
        // também não carrega largura fixa.
        const valor = label.nextElementSibling as HTMLElement;
        expect(valor.tagName).toBe('SPAN');
        expect(valor.className).not.toMatch(/shrink-0|basis-|(^|\s)w-/);

        // Nos campos críticos o valor é longo o bastante para ocupar 2+ linhas na
        // largura do modal (`max-w-[460px]`) — é neles que o vão aparecia.
        if (caso.longos.includes(rotulo)) {
          expect((valor.textContent ?? '').length).toBeGreaterThan(50);
        }
      });

      // A legenda de cada área (linha da lista de Distribuição) também é valor de
      // texto e não pode ter indentação à esquerda: era o `pl-7` alinhado ao selo
      // de posição, que deixava o vão quando o texto quebrava.
      if (caso.legenda) {
        expect(modal.getByText(caso.legenda).className).not.toMatch(/(^|\s)(pl|ml)-/);
      }

      unmount();
    });
  });

  it('só mostra "Resolver agora" nas famílias com destino real no sistema', () => {
    renderDashboard(MOCK_ADMISSOES);
    fireEvent.click(screen.getAllByRole('button', { name: /Ver todas/i })[0]);
    const modal = within(screen.getByRole('dialog'));
    // Sem `onAbrirAba`, documentos/contratos não têm destino: sobram os dois que
    // têm tela própria (`/exames` e `/esocial`) — nenhum atalho decorativo.
    expect(modal.getAllByRole('button', { name: 'Resolver agora' })).toHaveLength(2);
  });

  it('fecha o modal e navega quando existe destino (mesma coreografia de Pendências)', () => {
    const abrirAba = vi.fn();
    renderDashboard(MOCK_ADMISSOES, { onAbrirAba: abrirAba });

    fireEvent.click(screen.getAllByRole('button', { name: /Ver todas/i })[0]);
    const modal = within(screen.getByRole('dialog'));
    const botoes = modal.getAllByRole('button', { name: 'Resolver agora' });
    expect(botoes).toHaveLength(4);

    // O primeiro é a família "documentos" → aba "Gestão de Candidatos".
    fireEvent.click(botoes[0]);
    expect(abrirAba).toHaveBeenCalledWith('gestao');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('o modal de Próximas Admissões lista TODAS as admissões, com progresso e pendências', () => {
    renderDashboard(MOCK_ADMISSOES_CINCO);
    // O card mostra 4 (a altura corta a lista): a quinta não está na tela.
    expect(screen.queryByText('Elias Prado')).toBeNull();

    fireEvent.click(screen.getAllByRole('button', { name: /Ver todas/i })[1]);
    const modal = within(screen.getByRole('dialog'));

    expect(modal.getByText('5 admissões em andamento')).toBeInTheDocument();
    expect(modal.getByText('Elias Prado')).toBeInTheDocument();
    expect(modal.getByText('Ana Souza')).toBeInTheDocument();
    // Campos exigidos por admissão: progresso (com a origem do número),
    // responsável e pendências.
    expect(modal.getAllByText(/checklist [67]\/7/)).toHaveLength(5);
    expect(modal.getAllByText('Camila Ribeiro')).toHaveLength(5);
    expect(modal.getAllByText('Pendências:')).toHaveLength(5);
    // Sem bloco de explicação: a lista abre direto no contexto do dado.
    expect(modal.queryByText('O que define uma próxima admissão')).toBeNull();
    expect(modal.queryByText('Onde atualizar os dados')).toBeNull();
  });

  it('o modal de Distribuição por Área lista todas as áreas, sem agrupar em "Outros"', () => {
    renderDashboard(MOCK_ADMISSOES_SETE_AREAS);
    // No card, a partir da 6ª área o restante é somado em "Outros"…
    expect(screen.getByText('Outros')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /Ver detalhes/i })[0]);
    const modal = within(screen.getByRole('dialog'));

    // …e no modal cada área aparece separada, com o nome completo.
    expect(modal.queryByText('Outros')).toBeNull();
    AREAS_SETE.forEach((area) => expect(modal.getByText(area)).toBeInTheDocument());
    expect(modal.getByText('Total de admissões consideradas:')).toBeInTheDocument();
    expect(modal.getAllByText('14%')).toHaveLength(7);
    expect(modal.getByText(/Área com mais admissões/)).toBeInTheDocument();
    // Sem bloco de explicação: o total e a lista de áreas vêm primeiro.
    expect(modal.queryByText('O que significa o total central')).toBeNull();
    expect(modal.queryByText('Como usar para planejamento')).toBeNull();
  });

  it('o modal de SLA & Alertas agrupa os processos pela mesma régua do card', () => {
    renderDashboard(MOCK_ADMISSOES_SLA);
    fireEvent.click(screen.getAllByRole('button', { name: /Ver detalhes/i })[1]);
    const modal = within(screen.getByRole('dialog'));

    // Sem bloco de explicação: o modal abre no resumo e nos três grupos.
    expect(modal.queryByText('O que é SLA no processo de admissão')).toBeNull();
    expect(modal.queryByText('Como é calculado')).toBeNull();
    expect(modal.queryByText('Onde corrigir cada situação')).toBeNull();

    // Três grupos (o título do grupo e o selo de cada processo usam o rótulo).
    expect(modal.getAllByText('Dentro do SLA').length).toBeGreaterThanOrEqual(1);
    expect(modal.getAllByText('Em risco').length).toBeGreaterThanOrEqual(1);
    expect(modal.getAllByText('Atrasadas').length).toBeGreaterThanOrEqual(1);

    // Um processo em cada faixa, com prazo, tempo restante/atraso e próxima ação.
    expect(modal.getByText('Ana Atrasada')).toBeInTheDocument();
    expect(modal.getByText('Bruno Risco')).toBeInTheDocument();
    expect(modal.getByText('Carla Dentro')).toBeInTheDocument();
    expect(modal.getByText('3 dias de atraso')).toBeInTheDocument();
    expect(modal.getByText('faltam 2 dias')).toBeInTheDocument();
    expect(modal.getAllByText('Próxima ação:')).toHaveLength(3);
    expect(modal.getByText('Processos em andamento:')).toBeInTheDocument();
  });
});
