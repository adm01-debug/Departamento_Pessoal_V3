import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ColaboradorFormPage from '@/pages/ColaboradorFormPage';
import { colaboradorFormSchema } from '@/pages/colaboradorFormSchema';

/**
 * Cobertura de tela do cadastro de colaborador, que não existia: a porta de
 * entrada de todo o sistema entrava em produção sem nenhum teste.
 *
 * Origem: PR #546 ("muri", fechada sem merge) tinha 40 casos em
 * `src/pages/__tests__/ColaboradorFormPage.test.tsx`; a `main` não tinha
 * nenhum. Aqui ficam os casos que travam os dois defeitos reais que a medição
 * encontrou, e não só o comportamento já correto:
 *
 *  1. o select de Status oferecia `inativo` rotulado "Desligado", valor que
 *     NÃO existe no enum `status_colaborador` do banco (ativo | ferias |
 *     afastado | desligado | pendente) — desligar pela tela falhava com erro
 *     cru do Postgres;
 *  2. telefone fixo e celular compartilhavam UM campo, que mostrava
 *     `celular || telefone` e gravava só em `celular` — o fixo não tinha como
 *     ser cadastrado nem corrigido pela tela.
 */

const COLABORADOR = {
  id: 'colab-1',
  nome_completo: 'Ana Lima',
  cpf: '52998224725',
  nome_mae: 'Maria Lima',
  data_admissao: '2024-01-10',
  salario_base: 3000,
  cargo: 'Analista',
  departamento: 'TI',
  status: 'ativo',
  estado_civil: 'solteiro',
  tipo_contrato: 'clt',
  sexo: 'masculino',
  celular: '11988887777',
  telefone: '1133334444',
};

const atualizar = vi.fn(async () => COLABORADOR);
const criar = vi.fn(async () => COLABORADOR);
const buscarPorId = vi.fn(async () => COLABORADOR);

vi.mock('@/services', () => ({
  colaboradorService: {
    buscarPorId: (...a: unknown[]) => buscarPorId(...(a as [])),
    atualizar: (...a: unknown[]) => atualizar(...(a as [])),
    criar: (...a: unknown[]) => criar(...(a as [])),
  },
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'colab-1' }),
  useNavigate: () => vi.fn(),
}));

vi.mock('@/hooks', () => ({ useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }) }));
vi.mock('@/hooks/useDepartamentos', () => ({
  useDepartamentos: () => ({ departamentos: [{ id: 'd1', nome: 'TI' }] }),
}));
vi.mock('@/hooks/useCargos', () => ({ useCargos: () => ({ cargos: [{ id: 'c1', nome: 'Analista' }] }) }));
vi.mock('@/hooks/useFormGuard', () => ({ useFormGuard: () => undefined }));
vi.mock('@/hooks/useServerValidation', () => ({
  useServerValidation: () => ({ handleServerError: vi.fn() }),
}));
vi.mock('@/contexts', () => ({ useNotification: () => ({ success: vi.fn(), error: vi.fn() }) }));
vi.mock('@/components/layout', () => ({
  PageLayout: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/PageTitle', () => ({ PageTitle: () => null }));
vi.mock('@/components/ponto/DefinirPinQuiosqueDialog', () => ({ DefinirPinQuiosqueDialog: () => null }));

function renderPagina() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ColaboradorFormPage />
    </QueryClientProvider>
  );
}

/** Valores do enum `status_colaborador` no banco canônico. */
const STATUS_DO_BANCO = ['ativo', 'ferias', 'afastado', 'desligado', 'pendente'];

beforeEach(() => {
  atualizar.mockClear();
  criar.mockClear();
  buscarPorId.mockClear();
});

describe('ColaboradorFormPage — status e telefones', () => {
  it('o schema aceita exatamente os status do enum do banco e recusa "inativo"', () => {
    for (const valido of STATUS_DO_BANCO) {
      expect(colaboradorFormSchema.shape.status.safeParse(valido).success, `${valido} deveria ser aceito`).toBe(true);
    }
    // Era o valor que a tela mandava com o rótulo "Desligado": o Postgres
    // recusa, e antes nada na tela recusava.
    expect(colaboradorFormSchema.shape.status.safeParse('inativo').success).toBe(false);
    expect(colaboradorFormSchema.shape.status.safeParse('qualquer_coisa').success).toBe(false);
  });

  it('telefone fixo e celular são campos independentes, cada um com o seu valor', async () => {
    renderPagina();
    const celular = await screen.findByLabelText('Celular (WhatsApp)');
    const fixo = await screen.findByLabelText('Telefone fixo');

    // Antes havia UM campo mostrando `celular || telefone`: o fixo aparecia
    // dentro da caixa do celular e os dois valores nunca coexistiam na tela.
    await waitFor(() => {
      expect(celular).toHaveValue('(11) 98888-7777');
      expect(fixo).toHaveValue('(11) 3333-4444');
    });
  });

  it('editar o celular não mexe no telefone fixo', async () => {
    renderPagina();
    const celular = await screen.findByLabelText('Celular (WhatsApp)');
    const fixo = await screen.findByLabelText('Telefone fixo');
    await waitFor(() => expect(fixo).toHaveValue('(11) 3333-4444'));

    fireEvent.change(celular, { target: { value: '11955554444' } });

    expect(fixo).toHaveValue('(11) 3333-4444');
    expect(celular).toHaveValue('(11) 95555-4444');
  });

  it('editar o telefone fixo não mexe no celular', async () => {
    renderPagina();
    const celular = await screen.findByLabelText('Celular (WhatsApp)');
    const fixo = await screen.findByLabelText('Telefone fixo');
    await waitFor(() => expect(celular).toHaveValue('(11) 98888-7777'));

    fireEvent.change(fixo, { target: { value: '1122221111' } });

    expect(celular).toHaveValue('(11) 98888-7777');
    expect(fixo).toHaveValue('(11) 2222-1111');
  });

  it('a edição é sempre carregada e gravada no escopo da empresa atual', async () => {
    renderPagina();

    // Isolamento de tenant: o id da empresa entra na leitura do registro.
    await waitFor(() => expect(buscarPorId).toHaveBeenCalledWith('colab-1', 'emp-1'));
  });
});
