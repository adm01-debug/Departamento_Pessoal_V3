import { beforeEach, describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

const testState = vi.hoisted(() => ({
  empresaAtual: { id: 'emp-1', razao_social: 'Empresa Teste' },
  onOpenChange: null as ((open: boolean) => void) | null,
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: vi.fn(() => ({ empresaAtual: testState.empresaAtual })),
}));

vi.mock('@/services/cnabService', () => ({
  cnabService: {
    getConfig: vi.fn(() => Promise.resolve(null)),
    saveConfig: vi.fn(() => Promise.resolve()),
    generateCNAB240: vi.fn(() => Promise.resolve('cnab content')),
    generatePIXBatch: vi.fn(() => Promise.resolve('pix content')),
  },
}));

vi.mock('@/utils/dateLocal', () => ({
  todayLocalISO: vi.fn(() => '2026-07-24'),
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/utils/safeError', () => ({ safeErrorMessage: vi.fn((e: any, d: string) => d) }));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, onOpenChange }: any) => {
    testState.onOpenChange = onOpenChange;
    return <div>{children}</div>;
  },
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: any) => <label>{children}</label>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

import { CNABDialog } from '../folha/CNABDialog';
import { cnabService } from '@/services/cnabService';
import { toast } from 'sonner';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('CNABDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.empresaAtual = { id: 'emp-1', razao_social: 'Empresa Teste' };
    testState.onOpenChange = null;
    vi.mocked(cnabService.getConfig).mockResolvedValue(null);
    vi.mocked(cnabService.generateCNAB240).mockResolvedValue('cnab content');
    Object.defineProperty(window.URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:cnab'),
    });
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
  });

  it('renders Exportar Bancário trigger button', () => {
    render(<CNABDialog folhaId="f-001" />);
    expect(screen.getByText('Exportar Bancário')).toBeInTheDocument();
  });

  it('renders Pagamento de Salários dialog title', () => {
    render(<CNABDialog folhaId="f-001" />);
    expect(screen.getByText(/Pagamento de Salários.*CNAB\/PIX/i)).toBeInTheDocument();
  });

  it('renders Código do Banco label', () => {
    render(<CNABDialog folhaId="f-001" />);
    expect(screen.getByText('Código do Banco')).toBeInTheDocument();
  });

  it('renders Número do Convênio label', () => {
    render(<CNABDialog folhaId="f-001" />);
    expect(screen.getByText('Número do Convênio')).toBeInTheDocument();
  });

  it('renders Agência label', () => {
    render(<CNABDialog folhaId="f-001" />);
    expect(screen.getByText('Agência')).toBeInTheDocument();
  });

  it('renders Conta Corrente label', () => {
    render(<CNABDialog folhaId="f-001" />);
    expect(screen.getByText('Conta Corrente')).toBeInTheDocument();
  });

  it('renders CNAB 240 button', () => {
    render(<CNABDialog folhaId="f-001" />);
    expect(screen.getByText('CNAB 240')).toBeInTheDocument();
  });

  it('renders PIX Analítico button', () => {
    render(<CNABDialog folhaId="f-001" />);
    expect(screen.getByText('PIX Analítico')).toBeInTheDocument();
  });

  it('descarta resposta atrasada após fechar e reabrir na mesma empresa (ABA)', async () => {
    const antiga = deferred<any>();
    const atual = deferred<any>();
    vi.mocked(cnabService.getConfig)
      .mockImplementationOnce(() => antiga.promise)
      .mockImplementationOnce(() => atual.promise);
    render(<CNABDialog folhaId="f-001" />);

    act(() => testState.onOpenChange?.(true));
    await waitFor(() => expect(cnabService.getConfig).toHaveBeenCalledTimes(1));
    act(() => testState.onOpenChange?.(false));
    act(() => testState.onOpenChange?.(true));
    await waitFor(() => expect(cnabService.getConfig).toHaveBeenCalledTimes(2));

    await act(async () => {
      atual.resolve({
        banco_codigo: '341',
        agencia: '2222',
        agencia_digito: '1',
        conta: '22222',
        conta_digito: '2',
        convenio: 'novo',
        nome_empresa: 'Atual',
      });
      await atual.promise;
    });
    await waitFor(() => expect(screen.getByPlaceholderText('1234')).toHaveValue('2222'));

    await act(async () => {
      antiga.resolve({
        banco_codigo: '001',
        agencia: '1111',
        agencia_digito: '0',
        conta: '11111',
        conta_digito: '1',
        convenio: 'antigo',
        nome_empresa: 'Antiga',
      });
      await antiga.promise;
    });
    expect(screen.getByPlaceholderText('1234')).toHaveValue('2222');
  });

  it('não baixa nem anuncia CNAB concluído se o tenant muda durante a geração', async () => {
    const geracao = deferred<string>();
    vi.mocked(cnabService.generateCNAB240).mockImplementationOnce(() => geracao.promise);
    const { rerender } = render(<CNABDialog folhaId="f-001" />);

    act(() => testState.onOpenChange?.(true));
    await waitFor(() => expect(cnabService.getConfig).toHaveBeenCalledWith('emp-1'));
    const cnabButton = screen.getByText('CNAB 240').closest('button');
    await waitFor(() => expect(cnabButton).toBeEnabled());
    fireEvent.click(cnabButton!);

    testState.empresaAtual = { id: 'emp-2', razao_social: 'Outra Empresa' };
    rerender(<CNABDialog folhaId="f-001" />);
    await act(async () => {
      geracao.resolve('conteúdo obsoleto');
      await geracao.promise;
    });

    expect(window.URL.createObjectURL).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalledWith(expect.stringContaining('CNAB 240'));
  });
});
