import type { ReactNode } from 'react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { makeChain } from '@/test/chain';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: { children?: ReactNode; [key: string]: unknown }) => <div {...rest}>{children}</div>,
  },
}));

const captured = vi.hoisted(() => ({
  queries: [] as Array<{ queryKey: string[]; queryFn: () => Promise<unknown> }>,
  mutations: [] as Array<{
    mutationFn: (vars: never) => Promise<unknown>;
    onSuccess?: (data: unknown, vars: unknown, ctx: unknown) => unknown;
    onError?: (err: unknown, vars: unknown, ctx: unknown) => unknown;
  }>,
  queryData: new Map<string, { data: unknown; isLoading: boolean }>(),
  dialogOpenChange: null as ((open: boolean) => void) | null,
  dialogOpen: false,
  empresaAtual: { id: 'empresa-1', exigir_pin_quiosque: false } as {
    id: string;
    exigir_pin_quiosque: boolean;
  } | null,
  invalidateQueries: vi.fn(),
  mutateMock: vi.fn(),
}));

const { mutateMock } = captured;

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({
    children,
    open,
    onOpenChange,
  }: {
    children?: ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => {
    captured.dialogOpenChange = onOpenChange ?? null;
    captured.dialogOpen = open !== false;
    return <div>{children}</div>;
  },
  DialogContent: ({ children }: { children?: ReactNode }) =>
    captured.dialogOpen ? <div role="dialog">{children}</div> : null,
  DialogHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogTrigger: ({ children, asChild }: { children?: ReactNode; asChild?: boolean }) =>
    asChild ? <span onClick={() => captured.dialogOpenChange?.(true)}>{children}</span> : <div>{children}</div>,
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn((opts: { queryKey: string[]; queryFn: () => Promise<unknown> }) => {
    captured.queries.push(opts);
    const entry = captured.queryData.get(opts.queryKey[0]);
    return { data: entry?.data ?? [], isLoading: entry?.isLoading ?? false };
  }),
  useMutation: vi.fn((opts: (typeof captured.mutations)[number]) => {
    captured.mutations.push(opts);
    return {
      isPending: false,
      mutate: (vars: unknown) => {
        mutateMock(vars);
        Promise.resolve()
          .then(() => opts.mutationFn(vars as never))
          .then((data) => opts.onSuccess?.(data, vars, undefined))
          .catch((err) => opts.onError?.(err, vars, undefined));
      },
    };
  }),
  useQueryClient: () => ({ invalidateQueries: captured.invalidateQueries }),
  QueryClient: vi.fn(),
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: () => ({ empresaAtual: captured.empresaAtual }),
}));

vi.mock('@/services/edgeFunctionsService', () => ({
  edgeFunctionsService: { sincronizarBitrix: vi.fn(async () => ({ data: null, error: null })) },
}));

vi.mock('@/utils/safeError', () => ({
  safeErrorMessage: vi.fn((e: unknown, d: string) => d),
}));

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { edgeFunctionsService } from '@/services/edgeFunctionsService';
import {
  PreferenciasTab,
  NotificacoesTab,
  FolhaConfigTab,
  PontoConfigTab,
  AlertasKpiTab,
  IntegracoesTab,
  WebhooksLogsTab,
} from '../settings/InlineTabs';

const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>;

function queryOpts(key: string) {
  return captured.queries.find((q) => q.queryKey[0] === key);
}

beforeEach(() => {
  vi.clearAllMocks();
  fromMock.mockReset();
  captured.queries.length = 0;
  captured.mutations.length = 0;
  captured.queryData.clear();
  captured.dialogOpenChange = null;
  captured.dialogOpen = false;
  captured.empresaAtual = { id: 'empresa-1', exigir_pin_quiosque: false };
  fromMock.mockImplementation(() => makeChain({ data: null, error: null }));
});

describe('PreferenciasTab', () => {
  it('renders Preferências de Interface title', () => {
    render(<PreferenciasTab user={{ name: 'Ana Lima' }} />);
    expect(screen.getByText('Preferências de Interface')).toBeInTheDocument();
  });

  it('renders Modo Escuro switch label', () => {
    render(<PreferenciasTab user={null} />);
    expect(screen.getByText('Modo Escuro')).toBeInTheDocument();
  });

  it('renders Salvar Alterações button', () => {
    render(<PreferenciasTab user={null} />);
    expect(screen.getByRole('button', { name: 'Salvar Alterações' })).toBeInTheDocument();
  });
});

describe('NotificacoesTab', () => {
  it('renders Central de Notificações title', () => {
    render(<NotificacoesTab />);
    expect(screen.getByText('Central de Notificações')).toBeInTheDocument();
  });

  it('renders Operacional section', () => {
    render(<NotificacoesTab />);
    expect(screen.getByText('Operacional')).toBeInTheDocument();
  });

  it('renders Compliance section', () => {
    render(<NotificacoesTab />);
    expect(screen.getByText('Compliance')).toBeInTheDocument();
  });

  it('renders Novas Admissões switch', () => {
    render(<NotificacoesTab />);
    expect(screen.getByText('Novas Admissões')).toBeInTheDocument();
  });

  it('renders Salvar Preferências button', () => {
    render(<NotificacoesTab />);
    expect(screen.getByRole('button', { name: 'Salvar Preferências' })).toBeInTheDocument();
  });
});

describe('FolhaConfigTab', () => {
  it('renders Parâmetros de Folha title', () => {
    render(<FolhaConfigTab />);
    expect(screen.getByText('Parâmetros de Folha')).toBeInTheDocument();
  });

  it('renders Dia de Fechamento field', () => {
    render(<FolhaConfigTab />);
    expect(screen.getByText('Dia de Fechamento')).toBeInTheDocument();
  });

  it('renders Cálculo Automático switch', () => {
    render(<FolhaConfigTab />);
    expect(screen.getByText('Cálculo Automático')).toBeInTheDocument();
  });
});

describe('PontoConfigTab', () => {
  it('renders Compliance de Jornada title', () => {
    render(<PontoConfigTab />);
    expect(screen.getByText('Compliance de Jornada')).toBeInTheDocument();
  });

  it('renders Exigir Geolocalização switch', () => {
    render(<PontoConfigTab />);
    expect(screen.getByText('Exigir Geolocalização')).toBeInTheDocument();
  });

  it('renders Ponto Offline switch', () => {
    render(<PontoConfigTab />);
    expect(screen.getByText('Ponto Offline')).toBeInTheDocument();
  });

  it('renders Exigir PIN no quiosque switch reading exigir_pin_quiosque=false', () => {
    render(<PontoConfigTab />);
    expect(screen.getByText('Exigir PIN no quiosque')).toBeInTheDocument();
    const switches = screen.getAllByRole('switch');
    // 4 switches nesta aba: Geolocalização, Facial, Offline, e o PIN por último.
    expect(switches[switches.length - 1]).toHaveAttribute('aria-checked', 'false');
  });

  it('chamar o switch Exigir PIN no quiosque dispara mutate com o valor invertido', () => {
    mutateMock.mockClear();
    render(<PontoConfigTab />);
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[switches.length - 1]);
    expect(mutateMock).toHaveBeenCalledWith(true);
  });
});

describe('PontoConfigTab — mutação exigir_pin_quiosque', () => {
  it('mutationFn persiste em empresas com eq(id) e sucesso invalida + avisa', async () => {
    const chain = makeChain({ data: null, error: null });
    fromMock.mockReturnValue(chain);
    render(<PontoConfigTab />);
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[switches.length - 1]);

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('PIN do quiosque agora é obrigatório.'));
    expect(fromMock).toHaveBeenCalledWith('empresas');
    expect(chain.update).toHaveBeenCalledWith({ exigir_pin_quiosque: true });
    expect(chain.eq).toHaveBeenCalledWith('id', 'empresa-1');
    expect(captured.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['todas-empresas'] });
  });

  it('desativar PIN mostra mensagem de desativação', async () => {
    captured.empresaAtual = { id: 'empresa-1', exigir_pin_quiosque: true };
    fromMock.mockReturnValue(makeChain({ data: null, error: null }));
    render(<PontoConfigTab />);
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[switches.length - 1]);
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('PIN do quiosque desativado.'));
  });

  it('erro do PostgREST propaga para onError com toast.error', async () => {
    fromMock.mockReturnValue(makeChain({ data: null, error: { message: 'rls' } }));
    render(<PontoConfigTab />);
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[switches.length - 1]);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erro ao atualizar configuração.'));
  });

  it('sem empresa selecionada a mutationFn rejeita e avisa', async () => {
    captured.empresaAtual = null;
    render(<PontoConfigTab />);
    const mutation = captured.mutations[0];
    await expect(mutation.mutationFn(true as never)).rejects.toThrow('Nenhuma empresa selecionada');
    mutation.onError?.(new Error('Nenhuma empresa selecionada'), true, undefined);
    expect(toast.error).toHaveBeenCalled();
  });
});

describe('AlertasKpiTab', () => {
  const ALERTAS = [
    {
      id: 'a1',
      tipo: 'horas_extras',
      limite_atencao: 10,
      limite_critico: 20,
      updated_at: '2026-07-01T00:00:00Z',
    },
  ];

  it('renderiza linhas da tabela com tipo legível e limites', () => {
    captured.queryData.set('config-alertas-indicadores', { data: ALERTAS, isLoading: false });
    render(<AlertasKpiTab />);
    expect(screen.getByText('horas extras')).toBeInTheDocument();
    expect(screen.getByText('10%')).toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument();
  });

  it('mostra estado vazio quando não há alertas', () => {
    render(<AlertasKpiTab />);
    expect(screen.getByText('Nenhum alerta de KPI configurado.')).toBeInTheDocument();
  });

  it('mostra spinner enquanto carrega', () => {
    captured.queryData.set('config-alertas-indicadores', { data: undefined, isLoading: true });
    const { container } = render(<AlertasKpiTab />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('queryFn lê config_alertas_indicadores ordenado por tipo', async () => {
    const chain = makeChain({ data: ALERTAS, error: null });
    fromMock.mockReturnValue(chain);
    render(<AlertasKpiTab />);
    const result = await queryOpts('config-alertas-indicadores')!.queryFn();
    expect(fromMock).toHaveBeenCalledWith('config_alertas_indicadores');
    expect(chain.select).toHaveBeenCalledWith('*');
    expect(chain.order).toHaveBeenCalledWith('tipo');
    expect(result).toEqual(ALERTAS);
  });

  it('queryFn propaga erro do PostgREST', async () => {
    fromMock.mockReturnValue(makeChain({ data: null, error: { message: 'boom' } }));
    render(<AlertasKpiTab />);
    await expect(queryOpts('config-alertas-indicadores')!.queryFn()).rejects.toEqual({ message: 'boom' });
  });

  it('abrir Novo Alerta, preencher e salvar dispara insert e fecha o diálogo', async () => {
    const chain = makeChain({ data: null, error: null });
    fromMock.mockReturnValue(chain);
    render(<AlertasKpiTab />);
    expect(screen.queryByPlaceholderText('E: turnover, absenteismo, horas_extras')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Novo Alerta/i }));
    const tipo = await screen.findByPlaceholderText('E: turnover, absenteismo, horas_extras');
    const salvar = screen.getByRole('button', { name: /Salvar Configuração/i });
    expect(salvar).toBeDisabled();

    fireEvent.change(tipo, { target: { value: 'turnover' } });
    fireEvent.change(screen.getByPlaceholderText('E: 10'), { target: { value: '10' } });
    fireEvent.change(screen.getByPlaceholderText('E: 20'), { target: { value: '20' } });
    expect(salvar).toBeEnabled();
    fireEvent.click(salvar);

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Configuração de alerta criada'));
    expect(chain.insert).toHaveBeenCalledWith({ tipo: 'turnover', limite_atencao: 10, limite_critico: 20 });
    expect(captured.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['config-alertas-indicadores'] });
    await waitFor(() =>
      expect(screen.queryByPlaceholderText('E: turnover, absenteismo, horas_extras')).not.toBeInTheDocument()
    );
  });

  it('erro no insert mostra toast.error', async () => {
    fromMock.mockReturnValue(makeChain({ data: null, error: { message: 'boom' } }));
    render(<AlertasKpiTab />);
    fireEvent.click(screen.getByRole('button', { name: /Novo Alerta/i }));
    fireEvent.change(await screen.findByPlaceholderText('E: turnover, absenteismo, horas_extras'), {
      target: { value: 'absenteismo' },
    });
    fireEvent.change(screen.getByPlaceholderText('E: 10'), { target: { value: '5' } });
    fireEvent.change(screen.getByPlaceholderText('E: 20'), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar Configuração/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erro ao criar configuração'));
  });

  it('botão excluir chama delete com eq(id) e confirma', async () => {
    const chain = makeChain({ data: null, error: null });
    fromMock.mockReturnValue(chain);
    captured.queryData.set('config-alertas-indicadores', { data: ALERTAS, isLoading: false });
    render(<AlertasKpiTab />);
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Configuração removida'));
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith('id', 'a1');
  });
});

describe('IntegracoesTab', () => {
  const INTEGRACOES = [
    {
      id: 'i1',
      nome: 'Webhook RH',
      tipo: 'rest',
      ativa: true,
      ultima_sincronizacao: '2026-07-10T12:00:00Z',
    },
    { id: 'i2', nome: 'Legado', tipo: null, ativa: false, ultima_sincronizacao: null },
  ];

  it('renderiza cards de integrações nativas', () => {
    render(<IntegracoesTab />);
    expect(screen.getByText('Bitrix24 CRM')).toBeInTheDocument();
    expect(screen.getByText('RD Station')).toBeInTheDocument();
    expect(screen.getByText('Google Workspace')).toBeInTheDocument();
    expect(screen.getAllByText('EM BREVE')).toHaveLength(2);
  });

  it('renderiza tabela de integrações com status e fallback de sincronização', () => {
    captured.queryData.set('integracoes', { data: INTEGRACOES, isLoading: false });
    render(<IntegracoesTab />);
    expect(screen.getByText('Webhook RH')).toBeInTheDocument();
    expect(screen.getByText('ATIVO')).toBeInTheDocument();
    expect(screen.getByText('INATIVO')).toBeInTheDocument();
    expect(screen.getByText('Nunca sincronizado')).toBeInTheDocument();
  });

  it('mostra estado vazio sem integrações', () => {
    render(<IntegracoesTab />);
    expect(screen.getByText('Nenhuma integração personalizada ativa.')).toBeInTheDocument();
  });

  it('Sincronizar Agora chama sincronizarBitrix e confirma', async () => {
    render(<IntegracoesTab />);
    fireEvent.click(screen.getByRole('button', { name: /Sincronizar Agora/i }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Sincronização Bitrix24 iniciada!'));
    expect(edgeFunctionsService.sincronizarBitrix).toHaveBeenCalledWith({ action: 'sync_all' });
  });

  it('erro na sincronização mostra toast.error', async () => {
    vi.mocked(edgeFunctionsService.sincronizarBitrix).mockRejectedValue(new Error('edge down'));
    render(<IntegracoesTab />);
    fireEvent.click(screen.getByRole('button', { name: /Sincronizar Agora/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erro na sincronização.'));
  });

  it('queryFn retorna dados e tolera tabela ausente (42P01)', async () => {
    const chain = makeChain({ data: INTEGRACOES, error: null });
    fromMock.mockReturnValue(chain);
    render(<IntegracoesTab />);
    await expect(queryOpts('integracoes')!.queryFn()).resolves.toEqual(INTEGRACOES);
    expect(chain.order).toHaveBeenCalledWith('nome');

    fromMock.mockReturnValue(makeChain({ data: null, error: { message: 'no table', code: '42P01' } }));
    await expect(queryOpts('integracoes')!.queryFn()).resolves.toEqual([]);

    fromMock.mockReturnValue(makeChain({ data: null, error: { message: 'boom', code: 'XX' } }));
    await expect(queryOpts('integracoes')!.queryFn()).rejects.toEqual({ message: 'boom', code: 'XX' });
  });
});

describe('WebhooksLogsTab', () => {
  const LOGS = [
    {
      id: 'l1',
      webhook_id: 'w1',
      evento: 'colaborador.created',
      status_code: 200,
      created_at: '2026-07-11T09:00:00Z',
    },
    { id: 'l2', webhook_id: 'w2', evento: null, status_code: 500, created_at: null },
  ];

  it('renderiza logs com URL resolvida via webhook_id e badges de status', () => {
    captured.queryData.set('webhooks-logs', { data: LOGS, isLoading: false });
    captured.queryData.set('webhooks-config-urls', {
      data: [{ id: 'w1', url: 'https://hooks.test/abc' }],
      isLoading: false,
    });
    render(<WebhooksLogsTab />);
    expect(screen.getByText('https://hooks.test/abc')).toBeInTheDocument();
    expect(screen.getByText('colaborador.created')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
  });

  it('mostra estado vazio sem logs', () => {
    render(<WebhooksLogsTab />);
    expect(screen.getByText('Nenhum log de webhook registrado.')).toBeInTheDocument();
  });

  it('queryFn dos logs consulta com ordenação desc e limite 50; 42P01 vira []', async () => {
    const chain = makeChain({ data: LOGS, error: null });
    fromMock.mockReturnValue(chain);
    render(<WebhooksLogsTab />);
    await expect(queryOpts('webhooks-logs')!.queryFn()).resolves.toEqual(LOGS);
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(chain.limit).toHaveBeenCalledWith(50);

    fromMock.mockReturnValue(makeChain({ data: null, error: { message: 'no table', code: '42P01' } }));
    await expect(queryOpts('webhooks-logs')!.queryFn()).resolves.toEqual([]);
  });

  it('queryFn das configs seleciona id,url; erro não-42P01 propaga', async () => {
    const chain = makeChain({ data: [{ id: 'w1', url: 'u' }], error: null });
    fromMock.mockReturnValue(chain);
    render(<WebhooksLogsTab />);
    await expect(queryOpts('webhooks-config-urls')!.queryFn()).resolves.toEqual([{ id: 'w1', url: 'u' }]);
    expect(chain.select).toHaveBeenCalledWith('id, url');

    fromMock.mockReturnValue(makeChain({ data: null, error: { message: 'boom', code: 'XX' } }));
    await expect(queryOpts('webhooks-config-urls')!.queryFn()).rejects.toEqual({ message: 'boom', code: 'XX' });
  });
});
