import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ComponentProps, ElementType, ReactNode } from 'react';
import type { DesligamentoLike } from '../desligamentos/desligamentosDerivacoes';

/**
 * Cobre o que a tela de Desligamentos NÃO tinha antes deste resgate: paginação,
 * ordenação e filtro rápido por etapa (a lista era renderizada inteira). Cada
 * caso falha na versão anterior da tela — ou porque o controle não existia, ou
 * porque todas as linhas apareciam de uma vez.
 */

// Props de ANIMAÇÃO do Framer Motion (não existem no DOM) — descartadas por
// desestruturação; className, onClick, aria-* e type seguem para o elemento.
vi.mock('framer-motion', () => {
  type PropsDeAnimacao = {
    custom?: unknown;
    variants?: unknown;
    initial?: unknown;
    animate?: unknown;
    exit?: unknown;
    whileHover?: unknown;
    whileTap?: unknown;
    transition?: unknown;
    layoutId?: unknown;
  };
  const semMotion = <P extends object>({
    custom,
    variants,
    initial,
    animate,
    exit,
    whileHover,
    whileTap,
    transition,
    layoutId,
    ...resto
  }: P & PropsDeAnimacao) => resto;
  return {
    motion: {
      create: (Component: ElementType) => (props: ComponentProps<'div'> & PropsDeAnimacao) => (
        <Component {...semMotion(props)} />
      ),
      div: (props: ComponentProps<'div'> & PropsDeAnimacao) => <div {...semMotion(props)} />,
      span: (props: ComponentProps<'span'> & PropsDeAnimacao) => <span {...semMotion(props)} />,
      tr: (props: ComponentProps<'tr'> & PropsDeAnimacao) => <tr {...semMotion(props)} />,
      button: (props: ComponentProps<'button'> & PropsDeAnimacao) => <button {...semMotion(props)} />,
    },
    AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
    useInView: () => true,
    useReducedMotion: () => false,
  };
});

// Mesmo mock de dropdown usado por `AnalyticsSection.test.tsx`/`DashboardHeader.test.tsx`:
// o conteúdo rende inline (o Radix não abre popover em jsdom) e o `onClick` do
// item continua sendo o real.
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuItem: ({ children, onClick }: { children?: ReactNode; onClick?: () => void }) => (
    <div role="menuitem" onClick={onClick}>
      {children}
    </div>
  ),
}));

import { GestaoDesligamentos } from '../desligamentos/GestaoDesligamentos';

/**
 * Sete processos — mais que uma página (o padrão da tabela é 5). A ordem por
 * DATA é propositalmente diferente da ordem por NOME: "Ana Nunes" é a última
 * por data e a primeira por nome, então trocar a ordenação muda quem aparece na
 * página 1. Sem isso o caso de ordenação passaria por acidente.
 */
const DESLIGAMENTOS: DesligamentoLike[] = [
  {
    id: 'd1',
    data_desligamento: '2026-11-10',
    tipo: 'sem_justa_causa',
    status: 'em_andamento',
    etapa: 'comunicacao',
    motivo: 'Reestruturação da área',
    valor_liquido: 1000,
    colaborador: { nome_completo: 'Zelia Souza', cargo: 'Analista', departamento: 'RH' },
  },
  {
    id: 'd2',
    data_desligamento: '2026-11-09',
    tipo: 'pedido_demissao',
    status: 'em_andamento',
    etapa: 'calculo',
    motivo: 'Pedido do colaborador',
    valor_liquido: 5000,
    colaborador: { nome_completo: 'Bruno Lima', cargo: 'Motorista', departamento: 'Logística' },
  },
  {
    id: 'd3',
    data_desligamento: '2026-11-08',
    tipo: 'sem_justa_causa',
    status: 'em_andamento',
    etapa: 'calculo',
    motivo: 'Fim de contrato',
    valor_liquido: 2000,
    colaborador: { nome_completo: 'Carla Dias', cargo: 'Auxiliar', departamento: 'Logística' },
  },
  {
    id: 'd4',
    data_desligamento: '2026-11-07',
    tipo: 'sem_justa_causa',
    status: 'em_andamento',
    etapa: 'documentacao',
    motivo: 'Mudança de cidade',
    valor_liquido: 3000,
    colaborador: { nome_completo: 'Diego Rocha', cargo: 'Conferente', departamento: 'Logística' },
  },
  {
    id: 'd5',
    data_desligamento: '2026-11-06',
    tipo: 'acordo',
    status: 'em_andamento',
    etapa: 'homologacao',
    motivo: 'Acordo entre as partes',
    valor_liquido: 4000,
    colaborador: { nome_completo: 'Elisa Prado', cargo: 'Contadora', departamento: 'Financeiro' },
  },
  {
    id: 'd6',
    data_desligamento: '2026-11-05',
    tipo: 'sem_justa_causa',
    status: 'em_andamento',
    etapa: 'pagamento',
    motivo: 'Corte de custos',
    valor_liquido: 6000,
    colaborador: { nome_completo: 'Ana Nunes', cargo: 'Compradora', departamento: 'Compras' },
  },
  {
    id: 'd7',
    data_desligamento: '2026-11-04',
    tipo: 'sem_justa_causa',
    status: 'finalizado',
    etapa: 'finalizado',
    motivo: 'Encerramento de projeto',
    valor_liquido: 7000,
    colaborador: { nome_completo: 'Gisele Alves', cargo: 'Designer', departamento: 'Marketing' },
  },
];

function montar(over: Partial<ComponentProps<typeof GestaoDesligamentos>> = {}) {
  const onExportarSelecionados = vi.fn();
  const onFiltradosChange = vi.fn();
  const onOpenDetalhes = vi.fn();
  render(
    <GestaoDesligamentos
      desligamentos={DESLIGAMENTOS}
      onOpenDetalhes={onOpenDetalhes}
      onNovo={vi.fn()}
      onExcluir={vi.fn()}
      onCalcular={vi.fn()}
      onFiltradosChange={onFiltradosChange}
      onExportarSelecionados={onExportarSelecionados}
      {...over}
    />
  );
  return { onExportarSelecionados, onFiltradosChange, onOpenDetalhes };
}

const ordenarPor = (rotulo: string) => {
  const item = screen.getAllByRole('menuitem').find((el) => el.textContent?.trim() === rotulo);
  if (!item) throw new Error(`Opção de ordenação "${rotulo}" não encontrada`);
  fireEvent.click(item);
};

describe('GestaoDesligamentos — paginação, ordenação e etapa', () => {
  it('mostra só a primeira página (5 de 7) e avança para a segunda', () => {
    montar();

    // Ordem padrão: mais recentes primeiro.
    expect(screen.getByText('Zelia Souza')).toBeInTheDocument();
    expect(screen.getByText('Elisa Prado')).toBeInTheDocument();
    // 6º e 7º ficam FORA da página 1 — antes do resgate apareciam todos.
    expect(screen.queryByText('Ana Nunes')).toBeNull();
    expect(screen.queryByText('Gisele Alves')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }));

    expect(screen.getByText('Ana Nunes')).toBeInTheDocument();
    expect(screen.getByText('Gisele Alves')).toBeInTheDocument();
    expect(screen.queryByText('Zelia Souza')).toBeNull();
  });

  it('ordena por nome e troca quem aparece na primeira página', () => {
    montar();
    expect(screen.queryByText('Ana Nunes')).toBeNull();

    ordenarPor('Nome (A–Z)');

    expect(screen.getByText('Ana Nunes')).toBeInTheDocument();
    expect(screen.queryByText('Zelia Souza')).toBeNull();
  });

  it('ordena por maior valor', () => {
    montar();
    ordenarPor('Maior valor');

    // Maiores: 7000 (Gisele), 6000 (Ana), 5000 (Bruno), 4000 (Elisa), 3000 (Diego).
    expect(screen.getByText('Gisele Alves')).toBeInTheDocument();
    expect(screen.getByText('Ana Nunes')).toBeInTheDocument();
    // Os dois menores (1000 e 2000) caem para a página 2.
    expect(screen.queryByText('Zelia Souza')).toBeNull();
    expect(screen.queryByText('Carla Dias')).toBeNull();
  });

  it('a pílula de etapa conta e filtra os processos daquela etapa', () => {
    montar();

    const pilula = screen.getByRole('button', { name: /Cálculo/ });
    // A contagem sai da base filtrada, não de um número fixo.
    expect(pilula.textContent).toContain('2');

    fireEvent.click(pilula);

    expect(screen.getByText('Bruno Lima')).toBeInTheDocument();
    expect(screen.getByText('Carla Dias')).toBeInTheDocument();
    expect(screen.queryByText('Zelia Souza')).toBeNull();
    expect(screen.queryByText('Diego Rocha')).toBeNull();
  });

  it('a pílula Finalização agrupa pagamento e finalizado', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: /Finalização/ }));

    expect(screen.getByText('Ana Nunes')).toBeInTheDocument(); // etapa pagamento
    expect(screen.getByText('Gisele Alves')).toBeInTheDocument(); // etapa finalizado
    expect(screen.queryByText('Bruno Lima')).toBeNull();
  });

  it('devolve ao pai os ids do recorte na tela (é o que o cabeçalho exporta)', () => {
    const { onFiltradosChange } = montar();

    expect(onFiltradosChange).toHaveBeenCalled();
    expect(onFiltradosChange.mock.calls.at(-1)?.[0]).toEqual(['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7']);

    fireEvent.click(screen.getByRole('button', { name: /Cálculo/ }));

    expect(onFiltradosChange.mock.calls.at(-1)?.[0]).toEqual(['d2', 'd3']);
  });

  it('a busca filtra por nome, cargo, departamento e motivo', () => {
    const { onFiltradosChange } = montar();

    fireEvent.change(screen.getByPlaceholderText(/buscar/i), { target: { value: 'marketing' } });

    expect(onFiltradosChange.mock.calls.at(-1)?.[0]).toEqual(['d7']);
    expect(screen.getByText('Gisele Alves')).toBeInTheDocument();
    expect(screen.queryByText('Zelia Souza')).toBeNull();
  });

  it('a linha marcada no checkbox ganha uma ação de verdade (exportar seleção)', () => {
    const { onExportarSelecionados } = montar();

    // Sem seleção não existe barra de ação.
    expect(screen.queryByRole('button', { name: 'Exportar selecionados' })).toBeNull();

    fireEvent.click(screen.getByLabelText('Selecionar Bruno Lima'));

    expect(screen.getByText('processo selecionado')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Exportar selecionados' }));

    expect(onExportarSelecionados).toHaveBeenCalledWith(['d2']);
  });

  it('"Selecionar página" marca só as linhas visíveis', () => {
    const { onExportarSelecionados } = montar();

    fireEvent.click(screen.getByLabelText('Selecionar página'));
    fireEvent.click(screen.getByRole('button', { name: 'Exportar selecionados' }));

    // As 5 da página 1 — não as 7 da base.
    expect(onExportarSelecionados).toHaveBeenCalledWith(['d1', 'd2', 'd3', 'd4', 'd5']);
  });

  it('mantém a coluna Motivo que a tabela anterior já mostrava', () => {
    montar();
    expect(screen.getByText('Pedido do colaborador')).toBeInTheDocument();
  });

  it('com a faixa de atenção ligada, mostra o aviso e o atalho para limpar', () => {
    const onLimparAtencao = vi.fn();
    montar({ atencaoAtiva: true, onLimparAtencao });

    expect(screen.getByText('Mostrando só processos que precisam de atenção')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'limpar' }));
    expect(onLimparAtencao).toHaveBeenCalled();
  });
});
