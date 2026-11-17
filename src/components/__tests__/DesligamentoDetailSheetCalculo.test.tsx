import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * ============================================================================
 * O CAMINHO DO DINHEIRO da rescisão.
 *
 * Este arquivo existe por um motivo específico: a versão desta tela na branch
 * `muri` calculava a rescisão com `aviso_trabalhado`, `ferias_vencidas_check` e
 * `saldo_fgts` lidos de COLUNAS QUE NÃO EXISTEM em `desligamentos` (as três são
 * parâmetros de entrada do motor, persistidos em `detalhes_calculo._parametros`)
 * e **sem** `dias_aviso_nao_cumpridos`, `data_fim_contrato`,
 * `termino_iniciativa`, `indenizacao_art_480_prejuizo` e `data_pagamento`.
 *
 * Resultado: aviso sempre indenizado, férias vencidas sempre simples, FGTS zero,
 * nenhum desconto de aviso não cumprido (art. 487 §2º), nenhuma indenização dos
 * arts. 479/480 e nenhuma multa do art. 477 §8º — ou seja, valor pago errado a
 * quem foi desligado.
 *
 * O que estes casos travam: o payload que chega em
 * `rescisaoService.calcularESalvar` carrega os parâmetros da tela, e não valores
 * inventados.
 * ============================================================================
 */

const { mockCalcularESalvar, mockAtualizar } = vi.hoisted(() => ({
  mockCalcularESalvar: vi.fn(async () => undefined),
  mockAtualizar: vi.fn(
    async (_id: string, _updates: Record<string, unknown>, _empresaId: string): Promise<undefined> => undefined
  ),
}));

vi.mock('framer-motion', () => ({
  motion: {
    create:
      (Component: React.ElementType) =>
      ({ children, ...rest }: { children?: ReactNode; [key: string]: unknown }) => (
        <Component {...rest}>{children}</Component>
      ),
    div: ({ children, ...rest }: { children?: ReactNode; [key: string]: unknown }) => <div {...rest}>{children}</div>,
    section: ({ children, ...rest }: { children?: ReactNode; [key: string]: unknown }) => (
      <section {...rest}>{children}</section>
    ),
    span: ({ children, ...rest }: { children?: ReactNode; [key: string]: unknown }) => (
      <span {...rest}>{children}</span>
    ),
    button: ({ children, ...rest }: { children?: ReactNode; [key: string]: unknown }) => (
      <button {...rest}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
  useInView: () => true,
  useReducedMotion: () => false,
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));

vi.mock('@/services/rescisaoService', () => ({
  rescisaoService: { calcularESalvar: mockCalcularESalvar, homologar: vi.fn() },
}));

vi.mock('@/services/desligamentoService', () => ({
  desligamentoService: { atualizar: mockAtualizar },
}));

vi.mock('@/utils/rescisaoPDF', () => ({
  gerarPDFRescisao: vi.fn(),
  mapearResultadoDeDesligamento: vi.fn(() => ({})),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children?: ReactNode }) => <div role="tablist">{children}</div>,
  TabsTrigger: ({ children }: { children?: ReactNode }) => <button>{children}</button>,
  TabsContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/utils/safeError', () => ({ safeErrorMessage: vi.fn((_e: unknown, d: string) => d) }));

import { DesligamentoDetailSheet } from '../desligamentos/DesligamentoDetailSheet';

type Registro = Parameters<typeof DesligamentoDetailSheet>[0]['desligamento'];

function registro(extra: Record<string, unknown> = {}): Registro {
  return {
    id: 'des-1',
    empresa_id: 'emp-1',
    colaborador_id: 'col-1',
    salario_base: 3000,
    data_desligamento: '2026-10-10',
    tipo: 'sem_justa_causa',
    status: 'pendente',
    etapa: 'calculo',
    valor_liquido: null,
    detalhes_calculo: null,
    data_pagamento: null,
    colaborador: {
      nome_completo: 'Ana Lima',
      cpf: '00000000000',
      cargo: 'Analista',
      departamento: 'Financeiro',
      data_admissao: '2022-01-03',
    },
    ...extra,
  } as unknown as Registro;
}

beforeEach(() => {
  mockCalcularESalvar.mockClear();
  mockAtualizar.mockClear();
});

describe('DesligamentoDetailSheet — parâmetros do cálculo da rescisão', () => {
  it('a tela oferece os parâmetros que o motor aceita', () => {
    render(<DesligamentoDetailSheet desligamento={registro()} open onClose={vi.fn()} />);

    // Sem este cartão a rescisão volta a ser calculada com defaults fixos.
    expect(screen.getByText('Parâmetros do cálculo')).toBeInTheDocument();
    expect(screen.getByLabelText(/Aviso prévio trabalhado/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Férias vencidas em dobro/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Saldo FGTS/i)).toBeInTheDocument();
  });

  it('manda ao motor os parâmetros escolhidos na tela, não defaults fixos', async () => {
    const user = userEvent.setup();
    render(<DesligamentoDetailSheet desligamento={registro()} open onClose={vi.fn()} />);

    await user.click(screen.getByLabelText(/Aviso prévio trabalhado/i));
    await user.click(screen.getByLabelText(/Férias vencidas em dobro/i));
    await user.type(screen.getByLabelText(/Saldo FGTS/i), '1500');

    await user.click(screen.getByRole('button', { name: /Calcular|Recalcular/i }));

    await waitFor(() => expect(mockCalcularESalvar).toHaveBeenCalledTimes(1));
    const [, payload] = mockCalcularESalvar.mock.calls[0] as unknown as [string, Record<string, unknown>];

    expect(payload.aviso_trabalhado).toBe(true);
    expect(payload.ferias_vencidas).toBe(true);
    expect(payload.saldo_fgts).toBe(1500);
    // A admissão vem do colaborador (não existe `data_admissao` em desligamentos).
    expect(payload.data_admissao).toBe('2022-01-03');
  });

  it('o payload carrega TODOS os campos do motor, inclusive os das modalidades', async () => {
    const user = userEvent.setup();
    render(<DesligamentoDetailSheet desligamento={registro()} open onClose={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /Calcular|Recalcular/i }));
    await waitFor(() => expect(mockCalcularESalvar).toHaveBeenCalledTimes(1));

    const [, payload] = mockCalcularESalvar.mock.calls[0] as unknown as [string, Record<string, unknown>];
    // Cada chave aqui é um artigo da CLT que a versão anterior não mandava:
    // 487 §2º (aviso não cumprido), 479/480 (contrato a prazo) e 477 §8º (multa
    // por atraso na quitação, que depende de `data_pagamento`).
    for (const campo of [
      'dias_aviso_nao_cumpridos',
      'data_fim_contrato',
      'termino_iniciativa',
      'indenizacao_art_480_prejuizo',
      'data_pagamento',
    ]) {
      expect(Object.keys(payload)).toContain(campo);
    }
  });

  it('pedido de demissão sem aviso trabalhado pede os dias não cumpridos (art. 487 §2º)', () => {
    render(<DesligamentoDetailSheet desligamento={registro({ tipo: 'pedido_demissao' })} open onClose={vi.fn()} />);
    expect(screen.getByLabelText(/Dias de aviso prévio não cumpridos/i)).toBeInTheDocument();
  });

  it('cadastro já pago não oferece recálculo (o valor está quitado)', () => {
    render(<DesligamentoDetailSheet desligamento={registro({ status: 'pago' })} open onClose={vi.fn()} />);
    expect(screen.queryByText('Parâmetros do cálculo')).not.toBeInTheDocument();
  });

  it('lê os parâmetros já salvos em detalhes_calculo._parametros', () => {
    render(
      <DesligamentoDetailSheet
        desligamento={registro({ detalhes_calculo: { _parametros: { aviso_trabalhado: true, saldo_fgts: 999 } } })}
        open
        onClose={vi.fn()}
      />
    );
    expect(screen.getByLabelText(/Aviso prévio trabalhado/i)).toBeChecked();
    expect(screen.getByLabelText(/Saldo FGTS/i)).toHaveValue(999);
  });
});

describe('DesligamentoDetailSheet — rótulo da multa do FGTS', () => {
  // `rescisaoCalc.ts:320-323`: 40% na dispensa sem justa causa (e no término
  // antecipado pelo empregador, que acompanha o art. 479), 20% no acordo mútuo
  // e na culpa recíproca. Um rótulo fixo em "40%" descrevia errado o valor já
  // calculado nessas duas modalidades.
  it('mostra 20% no acordo mútuo', () => {
    render(
      <DesligamentoDetailSheet
        desligamento={registro({ tipo: 'acordo', multa_fgts: 1000, valor_liquido: 5000 })}
        open
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('Multa FGTS (20%)')).toBeInTheDocument();
    expect(screen.queryByText('Multa FGTS (40%)')).toBeNull();
  });

  it('mostra 40% na dispensa sem justa causa', () => {
    render(
      <DesligamentoDetailSheet
        desligamento={registro({ tipo: 'sem_justa_causa', multa_fgts: 2000, valor_liquido: 5000 })}
        open
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('Multa FGTS (40%)')).toBeInTheDocument();
  });

  it('mostra 40% no término antecipado pelo empregador (art. 479)', () => {
    render(
      <DesligamentoDetailSheet
        desligamento={registro({
          tipo: 'fim_contrato',
          multa_fgts: 2000,
          valor_liquido: 5000,
          detalhes_calculo: { indenizacaoArt479: 1500 },
        })}
        open
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('Multa FGTS (40%)')).toBeInTheDocument();
  });

  it('omite o percentual quando a modalidade não gera multa', () => {
    render(
      <DesligamentoDetailSheet
        desligamento={registro({ tipo: 'pedido_demissao', multa_fgts: 0, valor_liquido: 5000 })}
        open
        onClose={vi.fn()}
      />
    );
    // A linha do bloco de multas e a do "Resumo final" ficam sem percentual.
    expect(screen.getAllByText('Multa FGTS')).toHaveLength(2);
    expect(screen.queryAllByText(/Multa FGTS \(\d+%\)/)).toHaveLength(0);
  });
});

describe('DesligamentoDetailSheet — termo de homologação após o pagamento', () => {
  // A RPC `pagar_desligamento` exige homologação concluída e troca o status
  // para `pago` sem desfazê-la: o termo não pode voltar a "Pendente".
  it('mantém o termo disponível com status pago', () => {
    render(
      <DesligamentoDetailSheet
        desligamento={registro({ status: 'pago', valor_liquido: 5000 })}
        open
        onClose={vi.fn()}
      />
    );
    // A lista de documentos aparece em mais de uma aba; nenhuma pode mostrar
    // a homologação como pendente depois do pagamento.
    const termos = screen.getAllByText('Termo de Homologação');
    expect(termos.length).toBeGreaterThan(0);
    for (const termo of termos) {
      expect(termo.parentElement?.parentElement?.textContent).toContain('Disponível');
    }
  });
});

describe('DesligamentoDetailSheet — conclusão em lote do checklist', () => {
  // Sem as transições, o cadastro ficava em `comunicacao` com o checklist cheio
  // e o cálculo seguinte era recusado por `rescisaoService.validarTransicao`.
  it('aplica as transições de etapa ao concluir todas as pendências', async () => {
    const user = userEvent.setup();
    render(
      <DesligamentoDetailSheet
        desligamento={registro({ status: 'pendente', etapa: 'comunicacao' })}
        open
        onClose={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /Concluir pendências/i }));

    await waitFor(() => expect(mockAtualizar).toHaveBeenCalled());
    const payload = mockAtualizar.mock.calls[0][1];
    expect(payload.checklist_comunicacao).toBe(true);
    expect(payload.checklist_documentacao).toBe(true);
    expect(payload.status).toBe('comunicado');
    // Duas marcações em sequência levam de `comunicacao` a `calculo`, o mesmo
    // destino do toggle item a item — e não além dele.
    expect(payload.etapa).toBe('calculo');
  });

  it('não rebaixa a etapa de um cadastro já adiantado', async () => {
    const user = userEvent.setup();
    render(
      <DesligamentoDetailSheet
        desligamento={registro({ status: 'calculado', etapa: 'homologacao', valor_liquido: 5000 })}
        open
        onClose={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /Concluir pendências/i }));

    await waitFor(() => expect(mockAtualizar).toHaveBeenCalled());
    const payload = mockAtualizar.mock.calls[0][1];
    expect(payload.etapa).toBeUndefined();
    expect(payload.status).toBeUndefined();
  });
});
