import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import ExcelJS from 'exceljs';
import ImportacaoPage from '@/pages/ImportacaoPage';

// --- Mocks ---------------------------------------------------------------

const { toastSuccess, toastError, toastInfo } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastInfo: vi.fn(),
}));
vi.mock('sonner', () => ({
  toast: { success: toastSuccess, error: toastError, info: toastInfo },
}));

// EmpresaContext hook used by useImportacaoColaboradores
vi.mock('@/contexts', () => ({
  useEmpresa: () => ({ empresaAtual: { id: 'empresa-1' } }),
}));

const { supabaseSelectResult, insertMock } = vi.hoisted(() => ({
  supabaseSelectResult: { data: [] as any[], error: null as any },
  insertMock: vi.fn(async (_payload: any) => ({ error: null })),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: async () => supabaseSelectResult }),
      insert: (payload: any) => insertMock(payload),
    }),
  },
}));

// PageLayout / PageTitle: minimal shells to keep the render fast + focused.
vi.mock('@/components/layout', () => ({
  PageLayout: ({ children }: any) => <div data-testid="page-layout">{children}</div>,
}));
vi.mock('@/components/PageTitle', () => ({
  PageTitle: () => null,
}));

// --- Helpers -------------------------------------------------------------

async function buildXlsxFile(rows: unknown[][], filename = 'in.xlsx'): Promise<File> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Sheet1');
  for (const r of rows) ws.addRow(r);
  const buf = await wb.xlsx.writeBuffer();
  return new File([buf], filename, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ImportacaoPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// --- Tests ---------------------------------------------------------------

describe('ImportacaoPage (integração)', () => {
  beforeEach(() => {
    toastSuccess.mockClear();
    toastError.mockClear();
    toastInfo.mockClear();
    insertMock.mockClear();
    supabaseSelectResult.data = [];
  });

  it('renderiza o passo de upload com dropzone e botão de modelo', () => {
    renderPage();
    expect(screen.getByText(/Arraste ou clique para selecionar/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Baixar Modelo/i })).toBeInTheDocument();
  });

  it('faz upload, parseia e exibe preview com 1 linha válida', async () => {
    renderPage();
    const file = await buildXlsxFile([
      ['Nome', 'CPF', 'Cargo', 'Salário'],
      ['Ana Souza', '529.982.247-25', 'Dev', '5000'],
    ]);

    // The file input is hidden; grab it directly from the DOM.
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    await userEvent.upload(input, file);

    // Wait for preview step to render.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Importar 1 Colaboradores/i })).toBeInTheDocument()
    );
    expect(screen.getByText('Ana Souza')).toBeInTheDocument();
    expect(screen.getByText(/Válidos/)).toBeInTheDocument();
  });

  it('classifica linha inválida (CPF errado + nome vazio) como erro na UI', async () => {
    renderPage();
    const file = await buildXlsxFile([
      ['Nome', 'CPF'],
      ['', '11111111111'],
    ]);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, file);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Importar 0 Colaboradores/i })).toBeDisabled()
    );
    expect(screen.getByText(/CPF inválido/)).toBeInTheDocument();
  });

  it('detecta CPF duplicado consultando colaboradores existentes', async () => {
    supabaseSelectResult.data = [{ cpf: '529.982.247-25' }];
    renderPage();
    const file = await buildXlsxFile([
      ['Nome', 'CPF'],
      ['Ana Souza', '529.982.247-25'],
    ]);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, file);

    await waitFor(() => expect(screen.getByText(/Duplicados/)).toBeInTheDocument());
    expect(screen.getByText(/CPF já cadastrado/)).toBeInTheDocument();
  });

  it('mostra erro amigável quando o arquivo é inválido (sem coluna Nome)', async () => {
    renderPage();
    const file = await buildXlsxFile([
      ['CPF', 'Cargo'],
      ['529.982.247-25', 'Dev'],
    ]);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, file);

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    // Continua no passo de upload
    expect(screen.getByText(/Arraste ou clique para selecionar/i)).toBeInTheDocument();
  });

  it('reseta o fluxo ao clicar em Cancelar', async () => {
    renderPage();
    const file = await buildXlsxFile([
      ['Nome', 'CPF'],
      ['Ana Souza', '529.982.247-25'],
    ]);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, file);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Cancelar/i })).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(screen.getByText(/Arraste ou clique para selecionar/i)).toBeInTheDocument();
  });

  it('dispara download do modelo ao clicar em "Baixar Modelo"', async () => {
    renderPage();
    // Spy on anchor.click so we don't actually navigate.
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    await userEvent.click(screen.getByRole('button', { name: /Baixar Modelo/i }));
    await waitFor(() => expect(clickSpy).toHaveBeenCalled());
    expect(toastSuccess).toHaveBeenCalledWith('Modelo baixado!');
    clickSpy.mockRestore();
  });
});
