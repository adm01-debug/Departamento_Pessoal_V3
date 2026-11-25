/**
 * Central de Auditoria (aba "Auditoria" de Controle de Ponto).
 *
 * O teste exercita a TELA, não o banco: a consulta é substituída por um cenário
 * controlável (as linhas de `audit_log` que o componente receberia) e a
 * exportação por um espião. O que se confere aqui é a fiação — KPIs derivados
 * das linhas, timeline paginada, painel que acompanha a seleção, busca/limpeza
 * de filtros, parecer de integridade e o "exportar".
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { addDaysLocal, formatDateLocalISO } from '@/utils/dateLocal';
import { digestDaBatida, normalizarEventos, type LinhaAuditoriaCrua } from '../ponto/centralAuditoria';

/** Cenário mutável lido pelo mock de `useQuery` (hoisted para o `vi.mock`). */
const cenario = vi.hoisted(() => ({
  linhas: [] as Record<string, unknown>[],
  carregando: false,
  erro: null as string | null,
  exportar: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: () => ({ empresaAtual: { id: 'emp-001' } }),
}));

vi.mock('@/services/exportService', () => ({
  exportPontoCSV: (...args: unknown[]) => cenario.exportar(...args),
}));

/** O mock de demonstração é usado como FONTE das linhas do cenário. */
vi.mock('@/mocks/pontoAuditoriaMock', () => ({
  isPontoAuditoriaMockEnabled: () => true,
  trilhaAuditoriaDemonstrativa: () => cenario.linhas,
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data:
      cenario.erro !== null
        ? { eventos: [], erro: cenario.erro }
        : { eventos: normalizarEventos(cenario.linhas as LinhaAuditoriaCrua[]), erro: null },
    isLoading: cenario.carregando,
  }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

import { AuditoriaPonto } from '../ponto/AuditoriaPonto';

/** Data local deslocada em dias — mantém as linhas dentro do período de 30 dias. */
const dia = (offset: number) => formatDateLocalISO(addDaysLocal(new Date(), offset));

/**
 * Raiz de um CARD da tela, pelo título do cabeçalho (`<h3>` → header → `Card`).
 *
 * Necessário porque timeline e painel de detalhes mostram os MESMOS textos (o
 * painel já abre no primeiro evento da página): buscar por texto solto no
 * `document` encontra dois elementos. Escopar no card mantém a asserção
 * apontando para a coluna certa.
 */
const card = (titulo: string) => screen.getByText(titulo).parentElement!.parentElement as HTMLElement;

/**
 * Bloco de um card de KPI: o título vive na linha do selo de variação
 * (`<p>` → linha) e o número fica no `div` pai (`min-w-0 flex-1`) — por isso o
 * `closest('div')` seguido de `parentElement`.
 */
const kpi = (titulo: string) => screen.getByText(titulo).closest('div')!.parentElement as HTMLElement;

/** Batida com o digest REAL (a tela verifica de verdade sobre o cenário). */
function batida(overrides: Partial<LinhaAuditoriaCrua> = {}): LinhaAuditoriaCrua {
  const data = dia(-1);
  return {
    id: 'aud-batida',
    tabela: 'batidas_ponto',
    registro_id: 'bp-1',
    acao: 'INSERT',
    user_email: 'mariana.oliveira@empresa.com.br',
    dados_novos: {
      colaborador_id: 'c1',
      data,
      hora: '09:10',
      dispositivo_id: 'web-browser',
      hash_integridade: digestDaBatida('c1', data, '09:10', 'web'),
    },
    created_at: new Date(`${data}T09:10:00`).toISOString(),
    ...overrides,
  };
}

/** Sete eventos: uma batida verificada, uma divergente, um DELETE e quatro comuns. */
function cenarioPadrao(): LinhaAuditoriaCrua[] {
  const divergente = batida({ id: 'aud-divergente', registro_id: 'bp-2' });
  const dados: Record<string, unknown> = { ...(divergente.dados_novos ?? {}) };
  dados.hash_integridade = `0${String(dados.hash_integridade).slice(1)}`;

  return [
    batida({ id: 'aud-1' }),
    batida({ ...divergente, dados_novos: dados }),
    {
      id: 'aud-3',
      tabela: 'registros_ponto',
      registro_id: 'rp-1',
      acao: 'DELETE',
      user_email: null,
      dados_novos: { colaborador_id: 'c1', data: dia(-2) },
      created_at: new Date(`${dia(-2)}T18:03:00`).toISOString(),
    },
    {
      id: 'aud-4',
      tabela: 'solicitacoes_ajuste_ponto',
      registro_id: 'saj-1',
      acao: 'INSERT',
      user_email: 'ana.silva@empresa.com.br',
      dados_novos: { status: 'pendente' },
      created_at: new Date(`${dia(-3)}T14:22:00`).toISOString(),
    },
    {
      id: 'aud-5',
      tabela: 'solicitacoes_ajuste_ponto',
      registro_id: 'saj-1',
      acao: 'UPDATE',
      user_email: 'william.cardoso@empresa.com.br',
      dados_anteriores: { status: 'pendente' },
      dados_novos: { status: 'aprovado' },
      campos_alterados: ['status'],
      created_at: new Date(`${dia(-4)}T17:45:00`).toISOString(),
    },
    {
      id: 'aud-6',
      tabela: 'registros_ponto',
      registro_id: 'rp-2',
      acao: 'UPDATE',
      user_email: 'ana.silva@empresa.com.br',
      dados_novos: { horas_extras: '01:30' },
      campos_alterados: ['horas_extras'],
      created_at: new Date(`${dia(-5)}T19:30:00`).toISOString(),
    },
    {
      id: 'aud-7',
      tabela: 'batidas_ponto',
      registro_id: 'bp-3',
      acao: 'INSERT',
      user_email: 'mariana.oliveira@empresa.com.br',
      dados_novos: { colaborador_id: 'c2', data: dia(-6), hora: '08:02', dispositivo_id: 'web-browser' },
      created_at: new Date(`${dia(-6)}T08:02:00`).toISOString(),
    },
  ];
}

beforeEach(() => {
  cenario.linhas = cenarioPadrao() as unknown as Record<string, unknown>[];
  cenario.carregando = false;
  cenario.erro = null;
  cenario.exportar.mockClear();
});

describe('AuditoriaPonto — cabeçalho e KPIs', () => {
  it('mostra o título, o subtítulo e as duas ações do cabeçalho', () => {
    render(<AuditoriaPonto />);
    expect(screen.getByText('Central de Auditoria')).toBeInTheDocument();
    expect(
      screen.getByText(/Histórico de operações, rastreabilidade e integridade dos registros\./i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Exportar Trilha/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Período da trilha de auditoria')).toBeInTheDocument();
  });

  it('deriva os quatro KPIs das linhas do período', () => {
    render(<AuditoriaPonto />);
    const total = kpi('Total de eventos');
    expect(within(total).getByText('7')).toBeInTheDocument();

    const atencao = kpi('Eventos de atenção');
    // Atenção = 1 divergente + 1 exclusão sem digest.
    expect(within(atencao).getByText('2')).toBeInTheDocument();
  });
});

describe('AuditoriaPonto — timeline e painel', () => {
  it('lista a primeira página (5 de 7) com títulos legíveis', () => {
    render(<AuditoriaPonto />);
    expect(screen.getByText('Linha do Tempo de Auditoria')).toBeInTheDocument();
    expect(screen.getByText('1–5 de 7 eventos')).toBeInTheDocument();
    // Duas batidas INSERT caem na primeira página (aud-1 e aud-7): mesmo título 2x.
    const timeline = card('Linha do Tempo de Auditoria');
    expect(within(timeline).getAllByText('Batida de ponto criada')).toHaveLength(2);
    expect(screen.getByText('Registro de jornada excluído')).toBeInTheDocument();
  });

  it('abre o primeiro evento no painel e troca ao clicar em outro registro', () => {
    render(<AuditoriaPonto />);
    expect(screen.getByText('Detalhes do Evento')).toBeInTheDocument();
    // O primeiro da página é a batida verificada.
    expect(screen.getByText('Integridade da evidência')).toBeInTheDocument();
    expect(screen.getByText('Verificada')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Ver detalhes: Registro de jornada excluído/i }));
    expect(screen.getByText(/Exclusão de um registro de registro de jornada/i)).toBeInTheDocument();
    // O selo aparece na linha da timeline e no painel — a asserção é do painel.
    expect(within(card('Detalhes do Evento')).getByText('Revisão recomendada')).toBeInTheDocument();
  });

  it('mostra os metadados do evento aberto', () => {
    render(<AuditoriaPonto />);
    // Responsável/identificador também aparecem na linha da timeline: escopo no painel.
    const painel = card('Detalhes do Evento');
    expect(within(painel).getByText('Responsável')).toBeInTheDocument();
    expect(within(painel).getByText('mariana.oliveira@empresa.com.br')).toBeInTheDocument();
    expect(within(painel).getByText('Entidade')).toBeInTheDocument();
    expect(within(painel).getByText('Identificador')).toBeInTheDocument();
    expect(within(painel).getByText('bp-1')).toBeInTheDocument();
  });

  it('não afirma "Verificada" para hash que não é reproduzível no cliente', () => {
    cenario.linhas = [
      {
        id: 'aud-sem-prova',
        tabela: 'registros_ponto',
        registro_id: 'rp-9',
        acao: 'UPDATE',
        user_email: 'ana.silva@empresa.com.br',
        dados_novos: { hash_integridade: 'hash-qualquer' },
        created_at: new Date(`${dia(-1)}T10:00:00`).toISOString(),
      },
    ];
    render(<AuditoriaPonto />);
    expect(screen.queryByText('Verificada')).not.toBeInTheDocument();
    expect(screen.getByText('Não verificada')).toBeInTheDocument();
  });

  it('pagina a timeline e atualiza a faixa do rodapé', () => {
    render(<AuditoriaPonto />);
    fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    expect(screen.getByText('6–7 de 7 eventos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page');

    fireEvent.click(screen.getByRole('button', { name: 'Página anterior' }));
    expect(screen.getByText('1–5 de 7 eventos')).toBeInTheDocument();
  });
});

/**
 * A COR DO CARTÃO DE INTEGRIDADE segue o PARECER, não a existência do hash:
 * verde só em "verificada"; os demais estados (divergente, revisão e sem
 * comprovação) vestem vermelho. O teste fixa essa amarração — se alguém voltar
 * a pintar o cartão de neutro/cinza, a evidência some no meio do painel.
 */
describe('AuditoriaPonto — leitura visual da integridade', () => {
  /** O cartão do parecer é o `rounded-lg` que envolve título, selo e descrição. */
  const cartaoDoParecer = () => screen.getByText('Integridade da evidência').closest('.rounded-lg') as HTMLElement;

  it('veste verde quando o digest foi recalculado e confere', () => {
    render(<AuditoriaPonto />);
    const cartao = cartaoDoParecer();
    expect(cartao).toHaveClass('bg-[#0C2922]', 'border-[#146C4B]');
    expect(within(cartao).getByText('Verificada')).toHaveClass('text-[#16D98A]');
  });

  it('veste vermelho quando não há evidência verificável', () => {
    cenario.linhas = [
      {
        id: 'aud-sem-prova',
        tabela: 'registros_ponto',
        registro_id: 'rp-9',
        acao: 'UPDATE',
        user_email: 'ana.silva@empresa.com.br',
        dados_novos: { hash_integridade: 'hash-qualquer' },
        created_at: new Date(`${dia(-1)}T10:00:00`).toISOString(),
      },
    ];
    render(<AuditoriaPonto />);
    const cartao = cartaoDoParecer();
    expect(cartao).toHaveClass('bg-[#30191E]', 'border-[#87313A]');
    expect(within(cartao).getByText('Não verificada')).toHaveClass('text-[#FF5364]');
  });

  it('veste vermelho na exclusão sem digest (revisão recomendada)', () => {
    render(<AuditoriaPonto />);
    fireEvent.click(screen.getByRole('button', { name: /Ver detalhes: Registro de jornada excluído/i }));
    const cartao = cartaoDoParecer();
    expect(cartao).toHaveClass('bg-[#30191E]');
    expect(within(cartao).getByText('Revisão recomendada')).toHaveClass('text-[#FF5364]');
  });
});

describe('AuditoriaPonto — filtros', () => {
  it('a busca textual recorta a timeline', () => {
    render(<AuditoriaPonto />);
    fireEvent.change(screen.getByLabelText('Buscar na trilha'), { target: { value: 'william' } });
    expect(screen.getByText('1–1 de 1 evento')).toBeInTheDocument();
    // O evento único também é aberto no painel: escopo na coluna da timeline.
    expect(
      within(card('Linha do Tempo de Auditoria')).getByText('Solicitação de ajuste atualizada')
    ).toBeInTheDocument();
  });

  it('"Limpar filtros" só habilita com filtro ativo e restaura a lista', () => {
    render(<AuditoriaPonto />);
    const limpar = screen.getByRole('button', { name: /Limpar filtros/i });
    expect(limpar).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Buscar na trilha'), { target: { value: 'william' } });
    expect(limpar).toBeEnabled();
    fireEvent.click(limpar);

    expect(screen.getByLabelText('Buscar na trilha')).toHaveValue('');
    expect(screen.getByText('1–5 de 7 eventos')).toBeInTheDocument();
  });

  it('barra de filtros: busca elástica na linha 1 e os três recortes na linha 2', () => {
    render(<AuditoriaPonto />);
    const busca = screen.getByLabelText('Buscar na trilha');
    const botao = screen.getByRole('button', { name: /Limpar filtros/i });
    // <input> → wrapper da busca → linha 1 → barra (coluna de duas linhas).
    const wrapperBusca = busca.parentElement as HTMLElement;
    const linhaBusca = wrapperBusca.parentElement as HTMLElement;
    const barra = linhaBusca.parentElement as HTMLElement;
    const recortes = screen.getByLabelText('Filtrar por operação').parentElement as HTMLElement;

    // Linha 1: flex com a busca absorvendo TODA a sobra (`flex-1 min-w-0`) e o
    // botão com a largura do próprio conteúdo (`shrink-0`), separados por
    // `gap-3` (15 px reais — dentro da faixa de 12–16 px pedida).
    expect(linhaBusca).toHaveClass('flex', 'gap-3');
    expect(linhaBusca).toContainElement(botao);
    expect(wrapperBusca).toHaveClass('flex-1', 'min-w-0');
    expect(botao).toHaveClass('shrink-0');

    // Linha 2: os três recortes num grid próprio, fora da linha da busca.
    expect(linhaBusca).not.toContainElement(recortes);
    expect(recortes).toHaveClass('grid');
    expect(recortes.children).toHaveLength(3);
    expect(barra.children).toHaveLength(2);
  });

  it('estado vazio sem eventos e com o recorte sem resultados', () => {
    cenario.linhas = [];
    render(<AuditoriaPonto />);
    expect(screen.getByText('Nenhum evento no período')).toBeInTheDocument();
    expect(screen.getByText('0 evento')).toBeInTheDocument();
  });

  it('avisa quando a consulta falha', () => {
    cenario.erro = 'A consulta ao log de auditoria falhou: permission denied';
    render(<AuditoriaPonto />);
    expect(screen.getByText('Não foi possível ler a trilha')).toBeInTheDocument();
    expect(screen.getByText(/permission denied/i)).toBeInTheDocument();
  });
});

describe('AuditoriaPonto — exportação', () => {
  it('exporta a trilha FILTRADA em CSV', () => {
    render(<AuditoriaPonto />);
    fireEvent.click(screen.getByRole('button', { name: /Exportar Trilha/i }));
    expect(cenario.exportar).toHaveBeenCalledTimes(1);
    const [linhas, arquivo] = cenario.exportar.mock.calls[0];
    expect(arquivo).toBe('trilha-auditoria-ponto.csv');
    expect(linhas).toHaveLength(7);
    expect(linhas[0]).toMatchObject({
      responsavel: 'mariana.oliveira@empresa.com.br',
      operacao: 'INSERT',
      entidade: 'batidas_ponto',
      integridade: 'Verificada',
    });
  });
});

describe('AuditoriaPonto — diagramação em duas colunas', () => {
  /**
   * Colunas do grid da Central, a partir do card da timeline:
   * `<h3>` → header → `Card` → wrapper (`flex`, alvo do scroll) → coluna → grid.
   */
  const colunas = () => {
    let no = screen.getByText('Linha do Tempo de Auditoria') as HTMLElement;
    for (let nivel = 0; nivel < 5; nivel += 1) no = no.parentElement as HTMLElement;
    return {
      grid: no,
      esquerda: no.children[0] as HTMLElement,
      direita: no.children[1] as HTMLElement,
    };
  };

  it('põe KPIs, filtros e timeline na coluna esquerda e o painel na direita', () => {
    render(<AuditoriaPonto />);
    const { grid, esquerda, direita } = colunas();

    // Duas colunas a partir de `xl`, esticadas na mesma linha do grid.
    expect(grid.className).toContain('xl:grid-cols-');
    expect(grid.className).toContain('items-stretch');
    expect(grid.children).toHaveLength(2);

    expect(within(esquerda).getByText('Total de eventos')).toBeInTheDocument();
    expect(within(esquerda).getByLabelText('Buscar na trilha')).toBeInTheDocument();
    expect(within(esquerda).getByLabelText('Filtrar por operação')).toBeInTheDocument();
    expect(within(esquerda).getByText('Linha do Tempo de Auditoria')).toBeInTheDocument();
    // A paginação continua DENTRO do card da timeline (base da coluna esquerda).
    expect(within(esquerda).getByRole('navigation', { name: 'Paginação da trilha' })).toBeInTheDocument();
    expect(within(esquerda).queryByText('Detalhes do Evento')).not.toBeInTheDocument();

    expect(within(direita).getByText('Detalhes do Evento')).toBeInTheDocument();
    expect(within(direita).queryByText('Linha do Tempo de Auditoria')).not.toBeInTheDocument();
  });
});
