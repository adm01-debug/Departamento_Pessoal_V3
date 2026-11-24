import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ComponentProps } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuditoriaTab } from '../premiacoes/AuditoriaTab';
import type { AuditoriaHub, CampanhaHub, PagamentoHub } from '../premiacoes/premiacoesComum';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

const AGORA = new Date().toISOString();
const CAMPANHA: CampanhaHub = {
  id: 'camp-1',
  nome: 'Campanha de Vendas Q3 2026',
  data_inicio: '2026-07-01',
  data_fim: '2026-09-30',
  status: 'ativo',
  orcamento_estimado: 85000,
};
const PAGAMENTO: PagamentoHub = {
  id: 'pag-1',
  campanha_id: 'camp-1',
  valor_aprovado: 1250,
  status: 'aprovado_financeiro',
  status_conciliacao: 'divergente',
  colaborador: { nome_completo: 'Pedro Henrique Barbosa' },
  campanha: { nome: 'Campanha de Vendas Q3 2026' },
  historico_mudancas: [{ user: 'RH / Admin' }],
};
const AUDITORIA: AuditoriaHub[] = [
  {
    id: 'a-1',
    entidade_tipo: 'pagamento',
    entidade_id: 'pag-1',
    acao: 'alteracao',
    motivo: 'Divergência de R$ 70,00 identificada na conciliação (IRRF).',
    created_at: AGORA,
  },
  {
    id: 'a-2',
    entidade_tipo: 'campanha',
    entidade_id: 'camp-1',
    acao: 'criacao',
    motivo: 'Campanha criada com orçamento de R$ 85.000,00.',
    created_at: AGORA,
  },
];

function renderTab(over: Partial<ComponentProps<typeof AuditoriaTab>> = {}) {
  return render(
    <AuditoriaTab
      auditoria={AUDITORIA}
      pagamentos={[PAGAMENTO]}
      campanhas={[CAMPANHA]}
      onExportar={vi.fn()}
      {...over}
    />
  );
}

beforeEach(() => vi.clearAllMocks());

describe('AuditoriaTab — timeline funcional', () => {
  it('renderiza agrupamento por data e não usa tabela HTML', () => {
    const { container } = renderTab();
    expect(screen.getByText(/Hoje ·/)).toBeInTheDocument();
    expect(screen.getAllByText('Divergência identificada na conciliação').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Campanha criada').length).toBeGreaterThan(0);
    expect(container.querySelector('table')).toBeNull();
    expect(screen.getAllByRole('button', { name: /Ver detalhes/ }).length).toBeGreaterThan(0);
  });

  it('abre o detalhe existente com os dados do evento', async () => {
    const usuario = userEvent.setup();
    renderTab();
    await usuario.click(screen.getAllByRole('button', { name: /Ver detalhes/ })[0]);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeVisible());
    expect(screen.getByText('Informações financeiras')).toBeInTheDocument();
    expect(screen.getByText('Dados anteriores')).toBeInTheDocument();
    expect(screen.getByText('Dados posteriores')).toBeInTheDocument();
  });

  it('filtra por busca e mostra o estado vazio quando não há resultado', async () => {
    const usuario = userEvent.setup();
    renderTab();
    const busca = screen.getByLabelText(/Buscar evento, campanha, colaborador ou valor/i);
    await usuario.type(busca, 'IRRF');
    expect(screen.getAllByText('Divergência identificada na conciliação').length).toBeGreaterThan(0);
    expect(screen.queryByText('Campanha criada')).toBeNull();

    fireEvent.change(busca, { target: { value: 'sem-resultado' } });
    expect(await screen.findByText('Nenhum evento encontrado')).toBeInTheDocument();
    expect(screen.getByText('Ajuste os filtros ou selecione outro período.')).toBeInTheDocument();
  });

  it('filtra pela categoria e exporta pelos botões existentes', async () => {
    const usuario = userEvent.setup();
    const onExportar = vi.fn();
    renderTab({ onExportar });
    const campanhas = screen.getByRole('button', { name: /Campanhas\s*1/ });
    expect(campanhas).toHaveAttribute('aria-pressed', 'false');
    expect(campanhas).toHaveAttribute('data-active', 'false');

    await usuario.click(campanhas);
    expect(campanhas).toHaveAttribute('aria-pressed', 'true');
    expect(campanhas).toHaveAttribute('data-active', 'true');
    expect(screen.getAllByText('Campanha criada').length).toBeGreaterThan(0);
    expect(screen.queryByText('Divergência identificada na conciliação')).toBeNull();

    const csv = screen.getByRole('button', { name: 'CSV' });
    const pdf = screen.getByRole('button', { name: 'PDF' });
    expect(csv).toHaveClass('text-success', 'h-10', 'px-4', 'text-[13px]', 'font-semibold');
    expect(pdf).toHaveClass('text-destructive', 'h-10', 'px-4', 'text-[13px]', 'font-semibold');
    expect(csv.parentElement).toHaveClass('gap-3');
    expect(pdf.parentElement).toBe(csv.parentElement);

    await usuario.click(csv);
    expect(onExportar).toHaveBeenCalledWith('csv');
    await usuario.click(pdf);
    expect(onExportar).toHaveBeenCalledWith('pdf');
  });

  it('aplica o ponto semântico e o contador de cada categoria suportada', () => {
    const pagamentoOk: PagamentoHub = {
      ...PAGAMENTO,
      id: 'pag-2',
      status_conciliacao: 'conciliado',
      colaborador: { nome_completo: 'Ana Beatriz Souza' },
    };
    const eventosCategorias: AuditoriaHub[] = [
      ...AUDITORIA,
      {
        id: 'a-3',
        entidade_tipo: 'pagamento',
        entidade_id: 'pag-2',
        acao: 'aprovacao',
        motivo: 'Pagamento aprovado.',
        created_at: AGORA,
      },
      {
        id: 'a-4',
        entidade_tipo: 'regra',
        entidade_id: 'regra-1',
        acao: 'criacao',
        motivo: 'Regra criada.',
        created_at: AGORA,
      },
      {
        id: 'a-5',
        entidade_tipo: 'pagamento',
        entidade_id: 'pag-2',
        acao: 'alteracao',
        motivo: 'Pagamento atualizado.',
        created_at: AGORA,
      },
    ];
    render(
      <AuditoriaTab
        auditoria={eventosCategorias}
        pagamentos={[PAGAMENTO, pagamentoOk]}
        campanhas={[CAMPANHA]}
        onExportar={vi.fn()}
      />
    );
    const categorias = [
      [/Todas\s*5/, 'bg-primary'],
      [/Campanhas\s*1/, 'bg-[hsl(var(--chart-4))]'],
      [/Pagamentos\s*1/, 'bg-success'],
      [/Regras\s*1/, 'bg-info'],
      [/Conciliação\s*1/, 'bg-warning'],
      [/Aprovações\s*1/, 'bg-success'],
    ] as const;

    for (const [nome, ponto] of categorias) {
      const chip = screen.getByRole('button', { name: nome });
      expect(chip.querySelector('span')).toHaveClass(ponto);
      expect(chip.className).not.toContain('text-muted-foreground');
    }
  });

  it('mantém cor de texto/contador e glow da própria categoria na seleção', async () => {
    const usuario = userEvent.setup();
    renderTab();
    const campanhas = screen.getByRole('button', { name: /Campanhas\s*1/ });
    expect(campanhas).toHaveClass('text-[hsl(var(--chart-4)/0.9)]');

    await usuario.click(campanhas);
    expect(campanhas).toHaveClass('border-[hsl(var(--chart-4)/0.70)]');
    expect(campanhas).toHaveClass('text-[hsl(var(--chart-4))]');
    expect(campanhas.className).toContain('shadow-[0_0_16px_hsl(var(--chart-4)/0.16)]');
    expect(campanhas.querySelectorAll('span')[2]).toHaveClass('bg-[hsl(var(--chart-4)/0.25)]');
  });

  it('destaca Limpar filtros somente quando algum filtro real está ativo', async () => {
    const usuario = userEvent.setup();
    renderTab();
    const limpar = screen.getByRole('button', { name: 'Limpar filtros' });
    const busca = screen.getByLabelText(/Buscar evento, campanha, colaborador ou valor/i);

    expect(limpar).toHaveAttribute('data-active', 'false');
    expect(limpar).not.toHaveClass('text-primary');

    await usuario.type(busca, 'IRRF');
    expect(limpar).toHaveAttribute('data-active', 'true');
    expect(limpar).toHaveAttribute('aria-pressed', 'true');
    expect(limpar).toHaveClass('text-primary');
    expect(limpar.className).toContain('shadow-[0_0_12px_hsl(var(--primary)/0.14)]');

    await usuario.click(limpar);
    expect(busca).toHaveValue('');
    expect(limpar).toHaveAttribute('data-active', 'false');

    await usuario.click(screen.getByRole('button', { name: /Campanhas\s*1/ }));
    expect(limpar).toHaveAttribute('data-active', 'true');
    await usuario.click(limpar);
    expect(screen.getByRole('button', { name: /Todas\s*2/ })).toHaveAttribute('aria-pressed', 'true');
    expect(limpar).toHaveAttribute('data-active', 'false');
  });

  it('exibe skeleton durante o carregamento e erro com tentativa novamente', () => {
    const onTentarNovamente = vi.fn();
    const { rerender } = renderTab({ carregando: true });
    expect(screen.getByLabelText('Carregando auditoria')).toBeInTheDocument();
    rerender(
      <AuditoriaTab
        auditoria={[]}
        pagamentos={[]}
        campanhas={[]}
        erro
        onTentarNovamente={onTentarNovamente}
        onExportar={vi.fn()}
      />
    );
    expect(screen.getByText('Não foi possível carregar a auditoria agora.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onTentarNovamente).toHaveBeenCalled();
  });
});

/* ─── Contrato de layout da 2ª faixa (chips à esquerda · ações à direita) ─────
   Defeito corrigido: as pílulas cresciam por BREAKPOINT DE VIEWPORT
   (`min-[1600px]:px-[14px]`, `min-[1800px]:px-[15px]`) enquanto a coluna real
   encolhia por causa da sidebar. Na tela de referência a soma das seis pílulas
   passava da área disponível e "Aprovações" caía sozinha na segunda linha,
   desalinhando Ordenar/Limpar/CSV/PDF.

   O contrato abaixo trava o MECANISMO (não números de pixel):
   1. a faixa é `flex` com `space-between` (CSS `.audit-filter-secondary`) e o
      grupo da direita tem `ml-auto` — fica colado à direita mesmo quando desce;
   2. o wrapper dos chips é `@container` com `flex-basis` mínima: ele é a régua
      de largura que os chips consultam;
   3. os chips dimensionam por CONTAINER (`@min-[…]`), nunca por viewport — é
      isso que impede o retorno do defeito;
   4. cada chip é `shrink-0` + `whitespace-nowrap`: o texto não quebra dentro da
      pílula e a pílula não encolhe por dentro. */
describe('AuditoriaTab — faixa de chips (uma linha, sem quebra)', () => {
  type Cena = HTMLElement;
  const faixa = (c: Cena) => c.querySelector<HTMLElement>('.audit-filter-secondary')!;
  const chips = (c: Cena) => [...c.querySelectorAll<HTMLElement>('button[data-category]')];
  const wrapperDosChips = (c: Cena) => chips(c)[0].parentElement!.parentElement as HTMLElement;
  const linhaDosChips = (c: Cena) => chips(c)[0].parentElement as HTMLElement;
  const grupoDeAcoes = () => screen.getByRole('button', { name: 'Limpar filtros' }).parentElement as HTMLElement;

  it('mantém as duas áreas na mesma faixa, com as ações encostadas à direita', () => {
    const { container } = renderTab();
    const alinhamento = faixa(container);

    expect(alinhamento).toBeInTheDocument();
    expect(alinhamento.children).toHaveLength(2);
    expect(alinhamento.children[0]).toBe(wrapperDosChips(container));
    expect(alinhamento.children[1]).toBe(grupoDeAcoes());
    // `margin-left: auto`: se o bloco descer (coluna estreita), continua à direita.
    expect(grupoDeAcoes()).toHaveClass('ml-auto');
    expect(grupoDeAcoes()).toHaveClass('justify-end');
  });

  it('mede os chips pela largura DISPONÍVEL (@container), não pela viewport', () => {
    const { container } = renderTab();

    // A régua: o wrapper ocupa o espaço que sobra e não encolhe abaixo do
    // mínimo em que as seis pílulas cabem no degrau de 8px.
    expect(wrapperDosChips(container).className).toContain('@container');
    expect(wrapperDosChips(container)).toHaveClass('min-w-0');
    expect(wrapperDosChips(container)).toHaveClass('min-[1280px]:shrink-0');
    expect(wrapperDosChips(container).className).toContain('min-[1280px]:basis-[42rem]');

    // A linha dos chips só aceita quebra quando o espaço é realmente pequeno.
    expect(linhaDosChips(container)).toHaveClass('flex-wrap');
    expect(linhaDosChips(container).className).toContain('@min-[700px]:flex-nowrap');

    const pilulas = chips(container);
    expect(pilulas.length).toBeGreaterThan(0);
    pilulas.forEach((pilula) => {
      expect(pilula).toHaveClass('shrink-0');
      expect(pilula).toHaveClass('whitespace-nowrap');
      expect(pilula.className).toContain('@min-[840px]:px-[8px]');
      expect(pilula.className).toContain('@min-[910px]:px-[12px]');
      expect(pilula.className).toContain('@min-[1012px]:px-[15px]');
      // Regressão do defeito: NENHUM degrau por viewport.
      expect(pilula.className).not.toMatch(/min-\[(1600|1800)px\]|max-\[(1365|1599)px\]/);
    });
  });

  it('não deixa o rótulo do chip quebrar dentro da pílula', () => {
    const { container } = renderTab();
    chips(container).forEach((pilula) => {
      const rotulo = [...pilula.querySelectorAll('span')].find((span) => span.textContent?.trim());
      expect(rotulo).toHaveClass('whitespace-nowrap');
    });
  });

  /* ─── Largura do seletor "Ordenar por" ────────────────────────────────────
     Defeito corrigido: o trigger trazia a largura apenas abaixo de 1600px
     (`max-[1599px]:w-[118px]`). Acima disso sobrava o `w-full` da base do Design
     System e, como o pai é um `flex` de largura AUTOMÁTICA (`shrink-0`), o
     controle passava a medir 100% do grupo (~172px): estourava ~54px para a
     direita e ficava POR CIMA do botão "Limpar filtros" — o bloco aparecia
     "desconfigurado" justo na faixa ≥1600px. Agora a largura é DEFINIDA e igual
     em todos os degraus. */
  it('mantém largura definida no seletor "Ordenar por" (sem w-full em nenhum degrau)', () => {
    renderTab();
    const ordenar = screen.getByLabelText('Ordenar por');

    expect(ordenar).toHaveClass('w-[118px]', 'shrink-0');
    // `w-full` da base foi substituído; nenhuma largura presa por breakpoint.
    expect(ordenar.className).not.toMatch(/(^|\s)w-full(\s|$)/);
    expect(ordenar.className).not.toMatch(/max-\[1599px\]:w-/);

    // O rótulo continua aparecendo só quando há espaço (≥1600px).
    expect(screen.getByText('Ordenar por')).toHaveClass('hidden', 'min-[1600px]:inline');
    // E o botão vizinho segue existindo, intocado.
    expect(screen.getByRole('button', { name: 'Limpar filtros' })).toHaveClass('h-8', 'shrink-0');
  });
});
