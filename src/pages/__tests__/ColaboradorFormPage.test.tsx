import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ColaboradorFormPage, { schema, normalizarPayloadColaborador, NULLABLE_TEXT_FIELDS } from '@/pages/ColaboradorFormPage';

// PARTE 3A: valida que CREATE/UPDATE respeitam empresa_id (isolamento de
// tenant) e que os enums de status/tipo_contrato/estado_civil enviados
// batem com os valores reais do banco.

const { mockCreate, mockUpdate, mockBuscarPorId } = vi.hoisted(() => ({
  mockCreate: vi.fn().mockResolvedValue({ id: 'novo-id' }),
  mockUpdate: vi.fn().mockResolvedValue({ id: 'colab-1' }),
  mockBuscarPorId: vi.fn(),
}));

vi.mock('@/services', () => ({
  colaboradorService: {
    create: mockCreate,
    update: mockUpdate,
    buscarPorId: mockBuscarPorId,
  },
}));

const { mockUseEmpresas } = vi.hoisted(() => ({ mockUseEmpresas: vi.fn() }));
vi.mock('@/hooks/useEmpresas', () => ({ useEmpresas: mockUseEmpresas }));

const { mockUseDepartamentos, mockUseCargos } = vi.hoisted(() => ({
  mockUseDepartamentos: vi.fn(() => ({ departamentos: [{ id: 'd1', nome: 'TI' }] })),
  mockUseCargos: vi.fn(() => ({ cargos: [{ id: 'c1', nome: 'Analista' }] })),
}));
vi.mock('@/hooks/useDepartamentos', () => ({ useDepartamentos: mockUseDepartamentos }));
vi.mock('@/hooks/useCargos', () => ({ useCargos: mockUseCargos }));

// Bloco "Estrutura Interna"/"Alocação" (aba Profissional redesenhada) passou
// a consumir Time/Centro de custo/Local de trabalho/Lotações via `@/hooks`
// (barrel) — sem mocká-los aqui, os hooks reais chamam os services (via
// useGenericCrud/useQuery) e batem no mock global do Supabase de
// setupTests.ts, que não cobre todo caminho de erro desses services
// (loggerService.flush referencia `supabaseBase`, não exportado pelo mock).
// Mesmo padrão de mock de useDepartamentos/useCargos acima, só que pelo
// barrel — é por ele que ColaboradorFormPage importa esses 4 hooks.
const { mockUseTimes, mockUseCentrosCusto, mockUseLocaisTrabalho, mockUseLotacoesCatalogo, mockUseLotacaoPrincipal } = vi.hoisted(() => ({
  mockUseTimes: vi.fn(() => ({ data: [{ id: 't1', nome: 'Time de Recursos Humanos', ativo: true }] })),
  mockUseCentrosCusto: vi.fn(() => ({ data: [{ id: 'cc1', nome: 'Recursos Humanos', codigo: 'CC-050', ativo: true }] })),
  mockUseLocaisTrabalho: vi.fn(() => ({ locais: [{ id: 'lt1', nome: 'Sede São Paulo', ativo: true }] })),
  mockUseLotacoesCatalogo: vi.fn(() => ({ data: [{ id: 'lo1', nome: 'Unidade São Paulo/SP', codigo: null, ativa: true }] })),
  mockUseLotacaoPrincipal: vi.fn(() => ({
    data: { id: 'lo1', nome: 'Unidade São Paulo/SP', codigo: null, ativa: true } as { id: string; nome: string; codigo: string | null; ativa: boolean } | null,
  })),
}));
vi.mock('@/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks')>();
  return {
    ...actual,
    useTimes: mockUseTimes,
    useCentrosCusto: mockUseCentrosCusto,
    useLocaisTrabalho: mockUseLocaisTrabalho,
    useLotacoesCatalogo: mockUseLotacoesCatalogo,
    useLotacaoPrincipal: mockUseLotacaoPrincipal,
  };
});

// A aba Profissional agora persiste a lotação principal chamando o service
// diretamente (não via hook/mutation) depois que o colaborador existe — ver
// mutationFn de ColaboradorFormPage.tsx. Mockado à parte do
// colaboradorService para poder afirmar exatamente quando/com o quê é
// chamado, sem depender do mock global do Supabase.
const { mockDefinirPrincipal } = vi.hoisted(() => ({
  mockDefinirPrincipal: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/services/colaboradorLotacaoService', () => ({
  colaboradorLotacaoService: { definirPrincipal: mockDefinirPrincipal },
}));

const { notifySuccess, notifyErrorMock } = vi.hoisted(() => ({
  notifySuccess: vi.fn(),
  notifyErrorMock: vi.fn(),
}));
vi.mock('@/contexts', () => ({
  useNotification: () => ({ success: notifySuccess, error: notifyErrorMock }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// PARTE 4E: a aba "Financeiro" passa a renderizar o componente real do
// Dossiê para colaboradores existentes. Ele tem suas próprias dependências
// (hooks de contas_bancarias) já testadas em ContasBancariasTab.test.tsx —
// aqui só confirmamos que É ele quem é montado, e com o colaboradorId certo.
vi.mock('@/components/colaborador-detalhes/ContasBancariasTab', () => ({
  ContasBancariasTab: ({ colaboradorId }: any) => (
    <div data-testid="contas-bancarias-tab">{colaboradorId}</div>
  ),
}));

// PageLayout/PageTitle puxam Helmet/Breadcrumbs — shells mínimos (mesmo
// padrão de ColaboradoresPage.test.tsx / ImportacaoPage.test.tsx).
vi.mock('@/components/layout', () => ({
  PageLayout: ({ children, actions }: any) => (
    <div data-testid="page-layout">
      {actions}
      {children}
    </div>
  ),
}));
vi.mock('@/components/PageTitle', () => ({ PageTitle: () => null }));

// FormSelect é baseado no Radix Select (portal + pointer capture), pouco
// confiável em jsdom sem polyfills que este projeto não configura. Trocamos
// por um <select> nativo com a mesma prop contract (value/onChange/options),
// preservando o comportamento real testado — só a implementação do widget
// de UI muda no teste. FormField é mantido real (é só um <input> nativo).
vi.mock('@/components/forms', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/forms')>();
  return {
    ...actual,
    FormSelect: ({ label, value, onChange, options, error }: any) => (
      <div>
        {label && <label htmlFor={label}>{label}</label>}
        <select id={label} aria-label={label} value={value ?? ''} onChange={(e) => onChange?.(e.target.value)}>
          <option value="" />
          {options.map((o: any) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {error && <span>{error}</span>}
      </div>
    ),
  };
});

// DatePicker (Popover + Calendar do Radix) é tão pouco confiável em jsdom
// quanto o Select acima — e, diferente dele, navegar o calendário mês a mês
// até 1990 num teste não é viável. Mesmo princípio da troca do FormSelect:
// um `<input type="date">` nativo com o MESMO contrato de evento
// (`onChange` recebendo `e.target.value`) que `Input` (ui/input.tsx) já usa
// internamente — os testes continuam preenchendo a data com `fireEvent.change`
// normalmente, só a implementação do widget muda.
vi.mock('@/components/ui/date-picker', () => ({
  DatePicker: ({ value, onChange, id, name, disabled, placeholder }: any) => (
    <input
      type="date"
      id={id}
      name={name}
      value={value ?? ''}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));

function renderPage(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/colaboradores" element={<div data-testid="listing" />} />
          <Route path="/colaboradores/novo" element={<ColaboradorFormPage />} />
          <Route path="/colaboradores/editar/:id" element={<ColaboradorFormPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// Radix Tabs desmonta o conteúdo da aba inativa — os campos de e-mail/
// telefone/celular vivem na aba "Dados Gerais", então precisam ser
// preenchidos ANTES de trocar para a aba "Profissional" (cargo/departamento).
function preencherDadosGerais() {
  fireEvent.change(screen.getByLabelText('Nome Completo'), { target: { value: 'Ana Teste da Silva' } });
  fireEvent.change(screen.getByPlaceholderText('000.000.000-00'), { target: { value: '12345678900' } });
  fireEvent.change(screen.getByLabelText('Data Nascimento'), { target: { value: '1990-05-20' } });
  fireEvent.change(screen.getByLabelText('Nome da Mãe'), { target: { value: 'Mãe da Ana' } });
  // E-mail e Celular passaram a ser obrigatórios — sem preenchê-los aqui, o
  // submit é bloqueado pela validação antes de chegar em `onSubmit`.
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana.teste@empresa.com' } });
  const [, celularInputPadrao] = screen.getAllByPlaceholderText('(00) 00000-0000');
  fireEvent.change(celularInputPadrao, { target: { value: '11988887777' } });
}

async function irParaAbaProfissional() {
  await userEvent.click(screen.getByRole('tab', { name: /Profissional/i }));
}

function preencherDadosProfissionais() {
  fireEvent.change(screen.getByLabelText('Data de admissão'), { target: { value: '2024-01-10' } });
  // Salário Base usa `CurrencyInput showPrefix` (aba Profissional redesenhada):
  // "R$" vira um prefixo fixo fora do input, então o placeholder real do
  // campo passou a ser só "0,00" (sem repetir o "R$" que já aparece ao lado).
  fireEvent.change(screen.getByPlaceholderText('0,00'), { target: { value: '300000' } });
  fireEvent.change(screen.getByLabelText('Cargo'), { target: { value: 'Analista' } });
  fireEvent.change(screen.getByLabelText('Departamento'), { target: { value: 'TI' } });
}

async function preencherDadosMinimos() {
  preencherDadosGerais();
  await irParaAbaProfissional();
  preencherDadosProfissionais();
}

const COLABORADOR_EXISTENTE = {
  id: 'colab-1',
  nome_completo: 'Maria Existente',
  cpf: '98765432100',
  email: 'maria@empresa.com',
  telefone: '',
  celular: '11999998888',
  data_nascimento: '1985-03-15',
  sexo: 'feminino',
  estado_civil: 'casado',
  nome_mae: 'Mãe da Maria',
  nome_pai: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  data_admissao: '2020-02-01',
  salario_base: 4500,
  cargo: 'Analista',
  departamento: 'TI',
  tipo_contrato: 'clt',
  status: 'ativo',
  matricula: 'MAT001',
  time_id: 't1',
  centro_custo_id: 'cc1',
  centro_custo: 'Recursos Humanos',
  local_trabalho_id: 'lt1',
  local_trabalho: 'Sede São Paulo',
  banco_codigo: '',
  agencia: '',
  conta: '',
  tipo_conta: '',
  pix_chave: '',
  rg: '',
  rg_orgao_emissor: '',
  pis_pasep: '',
  ctps_numero: '',
  ctps_serie: '',
  empresa_id: 'emp-colaborador-1',
};

describe('ColaboradorFormPage — CREATE (empresa_id / tenant)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDepartamentos.mockReturnValue({ departamentos: [{ id: 'd1', nome: 'TI' }] });
    mockUseCargos.mockReturnValue({ cargos: [{ id: 'c1', nome: 'Analista' }] });
  });

  it('envia empresa_id da empresa atual no payload de criação', async () => {
    mockUseEmpresas.mockReturnValue({ empresaAtual: { id: 'emp-atual-1' } });
    renderPage('/colaboradores/novo');

    await preencherDadosMinimos();
    await userEvent.click(screen.getByRole('button', { name: /Cadastrar agora/i }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    const payload = mockCreate.mock.calls[0][0];
    expect(payload.empresa_id).toBe('emp-atual-1');
    expect(payload.nome_completo).toBe('Ana Teste da Silva');
    expect(notifyErrorMock).not.toHaveBeenCalled();
  });

  it('NÃO cria colaborador quando nenhuma empresa está selecionada', async () => {
    mockUseEmpresas.mockReturnValue({ empresaAtual: null });
    renderPage('/colaboradores/novo');

    await preencherDadosMinimos();
    await userEvent.click(screen.getByRole('button', { name: /Cadastrar agora/i }));

    await waitFor(() => expect(notifyErrorMock).toHaveBeenCalled());
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('o schema do formulário não possui campo empresa_id (não pode ser fornecido pelo usuário)', () => {
    expect(Object.keys(schema.shape)).not.toContain('empresa_id');
  });
});

describe('ColaboradorFormPage — UPDATE (empresa_id / tenant)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDepartamentos.mockReturnValue({ departamentos: [{ id: 'd1', nome: 'TI' }] });
    mockUseCargos.mockReturnValue({ cargos: [{ id: 'c1', nome: 'Analista' }] });
  });

  it('atualiza usando o empresa_id do próprio colaborador carregado', async () => {
    mockBuscarPorId.mockResolvedValue({ ...COLABORADOR_EXISTENTE });
    mockUseEmpresas.mockReturnValue({ empresaAtual: { id: 'emp-colaborador-1' } });
    renderPage('/colaboradores/editar/colab-1');

    await waitFor(() => expect(screen.getByLabelText('Nome Completo')).toHaveValue('Maria Existente'));
    await userEvent.click(screen.getByRole('button', { name: /Salvar Alterações/i }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate).toHaveBeenCalledWith('colab-1', expect.any(Object), 'emp-colaborador-1');
    expect(notifyErrorMock).not.toHaveBeenCalled();
  });

  it('NÃO atualiza quando o colaborador carregado não tem empresa_id', async () => {
    mockBuscarPorId.mockResolvedValue({ ...COLABORADOR_EXISTENTE, empresa_id: null });
    mockUseEmpresas.mockReturnValue({ empresaAtual: { id: 'emp-colaborador-1' } });
    renderPage('/colaboradores/editar/colab-1');

    await waitFor(() => expect(screen.getByLabelText('Nome Completo')).toHaveValue('Maria Existente'));
    await userEvent.click(screen.getByRole('button', { name: /Salvar Alterações/i }));

    await waitFor(() => expect(notifyErrorMock).toHaveBeenCalled());
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('NÃO atualiza quando a empresa atual diverge da empresa do colaborador (isolamento de tenant)', async () => {
    mockBuscarPorId.mockResolvedValue({ ...COLABORADOR_EXISTENTE, empresa_id: 'emp-A' });
    mockUseEmpresas.mockReturnValue({ empresaAtual: { id: 'emp-B' } });
    renderPage('/colaboradores/editar/colab-1');

    await waitFor(() => expect(screen.getByLabelText('Nome Completo')).toHaveValue('Maria Existente'));
    await userEvent.click(screen.getByRole('button', { name: /Salvar Alterações/i }));

    await waitFor(() => expect(notifyErrorMock).toHaveBeenCalled());
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe('ColaboradorFormPage — Cargo/Departamento usam pageSize 100', () => {
  it('chama useDepartamentos e useCargos com pageSize: 100', () => {
    mockUseEmpresas.mockReturnValue({ empresaAtual: { id: 'emp-1' } });
    renderPage('/colaboradores/novo');
    expect(mockUseDepartamentos).toHaveBeenCalledWith({ pageSize: 100 });
    expect(mockUseCargos).toHaveBeenCalledWith({ pageSize: 100 });
  });
});

describe('schema — enums alinhados ao banco (Parte 3A)', () => {
  const base = {
    nome_completo: 'Ana Teste',
    cpf: '12345678900',
    email: 'ana@empresa.com',
    celular: '11988887777',
    data_nascimento: '1990-01-01',
    nome_mae: 'Mãe Teste',
    data_admissao: '2020-01-01',
    salario_base: 1000,
    cargo: 'Dev',
    departamento: 'TI',
  };

  it.each(['ativo', 'pendente', 'desligado', 'ferias', 'afastado'])('aceita status "%s"', (status) => {
    expect(schema.safeParse({ ...base, status }).success).toBe(true);
  });

  it('rejeita status "inativo" (não existe no banco)', () => {
    expect(schema.safeParse({ ...base, status: 'inativo' }).success).toBe(false);
  });

  it.each(['clt', 'pj', 'estagiario', 'temporario', 'intermitente', 'aprendiz'])(
    'aceita tipo_contrato "%s"',
    (tipo_contrato) => {
      expect(schema.safeParse({ ...base, tipo_contrato }).success).toBe(true);
    }
  );

  it.each(['estagio', 'autonomo'])('rejeita tipo_contrato "%s" (não existe no banco)', (tipo_contrato) => {
    expect(schema.safeParse({ ...base, tipo_contrato }).success).toBe(false);
  });

  it('aceita estado_civil "separado"', () => {
    expect(schema.safeParse({ ...base, estado_civil: 'separado' }).success).toBe(true);
  });

  it.each(['solteiro', 'casado', 'divorciado', 'viuvo', 'uniao_estavel', 'separado'])(
    'aceita estado_civil "%s"',
    (estado_civil) => {
      expect(schema.safeParse({ ...base, estado_civil }).success).toBe(true);
    }
  );
});

describe('ColaboradorFormPage — E-mail (Parte 3B)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDepartamentos.mockReturnValue({ departamentos: [{ id: 'd1', nome: 'TI' }] });
    mockUseCargos.mockReturnValue({ cargos: [{ id: 'c1', nome: 'Analista' }] });
  });

  it('usa o rótulo neutro "E-mail" (não mais "Email Pessoal")', () => {
    mockUseEmpresas.mockReturnValue({ empresaAtual: { id: 'emp-1' } });
    renderPage('/colaboradores/novo');
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
    expect(screen.queryByText('Email Pessoal')).not.toBeInTheDocument();
  });

  it('continua usando colaboradores.email — não envia email_pessoal nem email_corporativo', async () => {
    mockUseEmpresas.mockReturnValue({ empresaAtual: { id: 'emp-atual-1' } });
    renderPage('/colaboradores/novo');

    preencherDadosGerais();
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@empresa.com' } });
    await irParaAbaProfissional();
    preencherDadosProfissionais();
    await userEvent.click(screen.getByRole('button', { name: /Cadastrar agora/i }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    const payload = mockCreate.mock.calls[0][0];
    expect(payload.email).toBe('ana@empresa.com');
    expect(payload).not.toHaveProperty('email_pessoal');
    expect(payload).not.toHaveProperty('email_corporativo');
  });
});

describe('ColaboradorFormPage — Telefone e Celular independentes (Parte 3B)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDepartamentos.mockReturnValue({ departamentos: [{ id: 'd1', nome: 'TI' }] });
    mockUseCargos.mockReturnValue({ cargos: [{ id: 'c1', nome: 'Analista' }] });
  });

  it('persiste telefone e celular de forma independente na criação', async () => {
    mockUseEmpresas.mockReturnValue({ empresaAtual: { id: 'emp-atual-1' } });
    renderPage('/colaboradores/novo');
    preencherDadosGerais();

    const [telefoneInput, celularInput] = screen.getAllByPlaceholderText('(00) 00000-0000');
    fireEvent.change(telefoneInput, { target: { value: '1133334444' } });
    fireEvent.change(celularInput, { target: { value: '11988887777' } });

    await irParaAbaProfissional();
    preencherDadosProfissionais();
    await userEvent.click(screen.getByRole('button', { name: /Cadastrar agora/i }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    const payload = mockCreate.mock.calls[0][0];
    expect(payload.telefone).toBe('1133334444');
    expect(payload.celular).toBe('11988887777');
  });

  it('editar apenas o celular não altera o telefone existente', async () => {
    mockBuscarPorId.mockResolvedValue({ ...COLABORADOR_EXISTENTE, telefone: '1122223333', celular: '11999998888' });
    mockUseEmpresas.mockReturnValue({ empresaAtual: { id: 'emp-colaborador-1' } });
    renderPage('/colaboradores/editar/colab-1');

    await waitFor(() => expect(screen.getByLabelText('Nome Completo')).toHaveValue('Maria Existente'));
    const [telefoneInput, celularInput] = screen.getAllByPlaceholderText('(00) 00000-0000');
    expect(telefoneInput).toHaveValue('(11) 2222-3333');
    expect(celularInput).toHaveValue('(11) 99999-8888');

    fireEvent.change(celularInput, { target: { value: '11977776666' } });
    await userEvent.click(screen.getByRole('button', { name: /Salvar Alterações/i }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    const payload = mockUpdate.mock.calls[0][1];
    expect(payload.celular).toBe('11977776666');
    expect(payload.telefone).toBe('1122223333');
  });

  it('editar apenas o telefone não altera o celular existente', async () => {
    mockBuscarPorId.mockResolvedValue({ ...COLABORADOR_EXISTENTE, telefone: '1122223333', celular: '11999998888' });
    mockUseEmpresas.mockReturnValue({ empresaAtual: { id: 'emp-colaborador-1' } });
    renderPage('/colaboradores/editar/colab-1');

    await waitFor(() => expect(screen.getByLabelText('Nome Completo')).toHaveValue('Maria Existente'));
    const [telefoneInput] = screen.getAllByPlaceholderText('(00) 00000-0000');

    fireEvent.change(telefoneInput, { target: { value: '1144445555' } });
    await userEvent.click(screen.getByRole('button', { name: /Salvar Alterações/i }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    const payload = mockUpdate.mock.calls[0][1];
    expect(payload.telefone).toBe('1144445555');
    expect(payload.celular).toBe('11999998888');
  });
});

describe('normalizarPayloadColaborador (Parte 3B — "" -> null)', () => {
  const dataCompleta: any = {
    nome_completo: 'Ana Teste',
    nome_social: '',
    cpf: '12345678900',
    email: '',
    telefone: '',
    celular: '',
    data_nascimento: '1990-01-01',
    sexo: 'masculino',
    estado_civil: 'solteiro',
    nome_mae: 'Mãe Teste',
    nome_pai: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    data_admissao: '2020-01-01',
    salario_base: 3500.5,
    cargo: 'Dev',
    departamento: 'TI',
    tipo_contrato: 'clt',
    status: 'ativo',
    matricula: '',
    centro_custo: '',
    local_trabalho: '',
    banco_codigo: '',
    agencia: '',
    conta: '',
    tipo_conta: '',
    pix_chave: '',
    rg: '',
    rg_orgao_emissor: '',
    rg_uf: '',
    rg_data_emissao: '',
    rg_data_validade: '',
    pis_pasep: '',
    ctps_numero: '',
    ctps_serie: '',
    ctps_uf: '',
  };

  it.each(NULLABLE_TEXT_FIELDS)('converte "%s" vazio para null', (field) => {
    const payload = normalizarPayloadColaborador(dataCompleta);
    expect(payload[field]).toBeNull();
  });

  it('preserva valores preenchidos nos campos normalizados (não força null quando há dado)', () => {
    const payload = normalizarPayloadColaborador({ ...dataCompleta, nome_social: 'Aninha', telefone: '1122223333' });
    expect(payload.nome_social).toBe('Aninha');
    expect(payload.telefone).toBe('1122223333');
  });

  it('NÃO normaliza campos bancários (fora de escopo desta etapa)', () => {
    const payload = normalizarPayloadColaborador(dataCompleta);
    expect(payload.banco_codigo).toBe('');
    expect(payload.agencia).toBe('');
    expect(payload.conta).toBe('');
    expect(payload.tipo_conta).toBe('');
    expect(payload.pix_chave).toBe('');
  });

  it('NÃO normaliza campos de documentos (fora de escopo desta etapa)', () => {
    const payload = normalizarPayloadColaborador(dataCompleta);
    expect(payload.rg).toBe('');
    expect(payload.rg_orgao_emissor).toBe('');
    expect(payload.rg_uf).toBe('');
    expect(payload.pis_pasep).toBe('');
    expect(payload.ctps_numero).toBe('');
    expect(payload.ctps_serie).toBe('');
    expect(payload.ctps_uf).toBe('');
  });

  it('não altera CPF', () => {
    expect(normalizarPayloadColaborador(dataCompleta).cpf).toBe('12345678900');
  });

  it('não altera salário', () => {
    expect(normalizarPayloadColaborador(dataCompleta).salario_base).toBe(3500.5);
  });

  it('não altera datas', () => {
    const payload = normalizarPayloadColaborador(dataCompleta);
    expect(payload.data_nascimento).toBe('1990-01-01');
    expect(payload.data_admissao).toBe('2020-01-01');
  });

  it('não altera enums (status, tipo_contrato, estado_civil, sexo)', () => {
    const payload = normalizarPayloadColaborador(dataCompleta);
    expect(payload.status).toBe('ativo');
    expect(payload.tipo_contrato).toBe('clt');
    expect(payload.estado_civil).toBe('solteiro');
    expect(payload.sexo).toBe('masculino');
  });
});

describe('ColaboradorFormPage — payload sem dados bancários legados (PARTE 4E)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDepartamentos.mockReturnValue({ departamentos: [{ id: 'd1', nome: 'TI' }] });
    mockUseCargos.mockReturnValue({ cargos: [{ id: 'c1', nome: 'Analista' }] });
  });

  const CAMPOS_BANCARIOS_LEGADOS = [
    'banco_codigo', 'banco_nome', 'agencia', 'conta', 'tipo_conta', 'pix_chave', 'pix_tipo',
  ];

  it('o schema do formulário não possui mais nenhum campo bancário', () => {
    for (const campo of CAMPOS_BANCARIOS_LEGADOS) {
      expect(Object.keys(schema.shape)).not.toContain(campo);
    }
  });

  it('CREATE: payload não contém campos bancários legados e demais campos continuam funcionando', async () => {
    mockUseEmpresas.mockReturnValue({ empresaAtual: { id: 'emp-atual-1' } });
    renderPage('/colaboradores/novo');

    await preencherDadosMinimos();
    await userEvent.click(screen.getByRole('button', { name: /Cadastrar agora/i }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    const payload = mockCreate.mock.calls[0][0];
    for (const campo of CAMPOS_BANCARIOS_LEGADOS) {
      expect(payload).not.toHaveProperty(campo);
    }
    // demais campos continuam sendo enviados normalmente
    expect(payload.nome_completo).toBe('Ana Teste da Silva');
    expect(payload.cargo).toBe('Analista');
    // PARTE C: seleção de cargo via combobox também grava o FK real (cargo_id)
    expect(payload.cargo_id).toBe('c1');
    expect(payload.departamento).toBe('TI');
    expect(payload.empresa_id).toBe('emp-atual-1');
  });

  it('UPDATE: payload não contém campos bancários legados e demais campos continuam funcionando', async () => {
    mockBuscarPorId.mockResolvedValue({ ...COLABORADOR_EXISTENTE });
    mockUseEmpresas.mockReturnValue({ empresaAtual: { id: 'emp-colaborador-1' } });
    renderPage('/colaboradores/editar/colab-1');

    await waitFor(() => expect(screen.getByLabelText('Nome Completo')).toHaveValue('Maria Existente'));
    fireEvent.change(screen.getByLabelText('Nome Completo'), { target: { value: 'Maria Editada' } });
    await userEvent.click(screen.getByRole('button', { name: /Salvar Alterações/i }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    const payload = mockUpdate.mock.calls[0][1];
    for (const campo of CAMPOS_BANCARIOS_LEGADOS) {
      expect(payload).not.toHaveProperty(campo);
    }
    expect(payload.nome_completo).toBe('Maria Editada');
    expect(mockUpdate.mock.calls[0][0]).toBe('colab-1');
    expect(mockUpdate.mock.calls[0][2]).toBe('emp-colaborador-1');
  });
});

describe('ColaboradorFormPage — aba Financeiro reutiliza ContasBancariasTab (PARTE 4E)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDepartamentos.mockReturnValue({ departamentos: [{ id: 'd1', nome: 'TI' }] });
    mockUseCargos.mockReturnValue({ cargos: [{ id: 'c1', nome: 'Analista' }] });
  });

  async function irParaAbaFinanceiro() {
    await userEvent.click(screen.getByRole('tab', { name: /Financeiro/i }));
  }

  it('edição: monta ContasBancariasTab com o colaboradorId correto', async () => {
    mockBuscarPorId.mockResolvedValue({ ...COLABORADOR_EXISTENTE });
    mockUseEmpresas.mockReturnValue({ empresaAtual: { id: 'emp-colaborador-1' } });
    renderPage('/colaboradores/editar/colab-1');

    await waitFor(() => expect(screen.getByLabelText('Nome Completo')).toHaveValue('Maria Existente'));
    await irParaAbaFinanceiro();

    expect(screen.getByTestId('contas-bancarias-tab')).toHaveTextContent('colab-1');
  });

  it('novo colaborador: NÃO monta ContasBancariasTab e explica que os dados bancários virão depois de salvar', async () => {
    mockUseEmpresas.mockReturnValue({ empresaAtual: { id: 'emp-1' } });
    renderPage('/colaboradores/novo');

    await irParaAbaFinanceiro();

    expect(screen.queryByTestId('contas-bancarias-tab')).not.toBeInTheDocument();
    expect(screen.getByText(/Salve o colaborador primeiro/i)).toBeInTheDocument();
  });
});

// Aba "Profissional" redesenhada — fonte única de edição dos campos que o
// card "Vínculo & Alocação" (TrabalhoHierarquiaTab.tsx, não tocado por esta
// tarefa) exibe. Cobre os itens 39/40 do pedido: opções carregando, edição
// pré-preenchendo os selects por ID, salvamento persistindo id+texto
// sincronizados, e Unidade/Lotação permanecendo somente leitura.
describe('ColaboradorFormPage — Aba Profissional: mapeamento para "Vínculo & Alocação"', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDepartamentos.mockReturnValue({ departamentos: [{ id: 'd1', nome: 'TI' }] });
    mockUseCargos.mockReturnValue({ cargos: [{ id: 'c1', nome: 'Analista' }] });
    // `vi.clearAllMocks()` não desfaz um `.mockReturnValue(...)` de um teste
    // anterior (só limpa `.mock.calls`) — reafirma o default aqui pra nenhum
    // teste desta suíte depender da ordem de execução dos outros.
    mockUseLotacoesCatalogo.mockReturnValue({ data: [{ id: 'lo1', nome: 'Unidade São Paulo/SP', codigo: null, ativa: true }] });
    mockUseLotacaoPrincipal.mockReturnValue({ data: { id: 'lo1', nome: 'Unidade São Paulo/SP', codigo: null, ativa: true } });
  });

  it('carrega as opções de Time, Centro de custo e Local de trabalho na aba Profissional', async () => {
    mockUseEmpresas.mockReturnValue({ empresaAtual: { id: 'emp-1' } });
    renderPage('/colaboradores/novo');
    await irParaAbaProfissional();

    expect(screen.getByRole('option', { name: 'Time de Recursos Humanos' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'CC-050 Recursos Humanos' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Sede São Paulo' })).toBeInTheDocument();
  });

  it('edição pré-preenche Time/Centro de custo/Local de trabalho com os IDs (FK) corretos, não com o texto', async () => {
    mockBuscarPorId.mockResolvedValue({ ...COLABORADOR_EXISTENTE });
    mockUseEmpresas.mockReturnValue({ empresaAtual: { id: 'emp-colaborador-1' } });
    renderPage('/colaboradores/editar/colab-1');

    await waitFor(() => expect(screen.getByLabelText('Nome Completo')).toHaveValue('Maria Existente'));
    await irParaAbaProfissional();

    expect(screen.getByLabelText('Time')).toHaveValue('t1');
    expect(screen.getByLabelText('Centro de custo')).toHaveValue('cc1');
    expect(screen.getByLabelText('Local de trabalho')).toHaveValue('lt1');
  });

  it('alterar Time/Centro de custo/Local de trabalho e salvar envia o novo FK e o texto sincronizado', async () => {
    mockBuscarPorId.mockResolvedValue({ ...COLABORADOR_EXISTENTE });
    mockUseEmpresas.mockReturnValue({ empresaAtual: { id: 'emp-colaborador-1' } });
    mockUseTimes.mockReturnValue({ data: [{ id: 't1', nome: 'Time de Recursos Humanos', ativo: true }, { id: 't2', nome: 'Time Administrativo', ativo: true }] });
    mockUseCentrosCusto.mockReturnValue({ data: [{ id: 'cc1', nome: 'Recursos Humanos', codigo: 'CC-050', ativo: true }, { id: 'cc2', nome: 'Administrativo', codigo: 'CC-070', ativo: true }] });
    mockUseLocaisTrabalho.mockReturnValue({ locais: [{ id: 'lt1', nome: 'Sede São Paulo', ativo: true }, { id: 'lt2', nome: 'Filial Campinas', ativo: true }] });
    renderPage('/colaboradores/editar/colab-1');

    await waitFor(() => expect(screen.getByLabelText('Nome Completo')).toHaveValue('Maria Existente'));
    await irParaAbaProfissional();

    fireEvent.change(screen.getByLabelText('Time'), { target: { value: 't2' } });
    fireEvent.change(screen.getByLabelText('Centro de custo'), { target: { value: 'cc2' } });
    fireEvent.change(screen.getByLabelText('Local de trabalho'), { target: { value: 'lt2' } });
    await userEvent.click(screen.getByRole('button', { name: /Salvar Alterações/i }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    const payload = mockUpdate.mock.calls[0][1];
    expect(payload.time_id).toBe('t2');
    expect(payload.centro_custo_id).toBe('cc2');
    expect(payload.centro_custo).toBe('Administrativo');
    expect(payload.local_trabalho_id).toBe('lt2');
    expect(payload.local_trabalho).toBe('Filial Campinas');
  });

  it('"Unidade / Lotação principal" é um Select real alimentado pelo catálogo /lotacoes', async () => {
    mockUseEmpresas.mockReturnValue({ empresaAtual: { id: 'emp-1' } });
    renderPage('/colaboradores/novo');
    await irParaAbaProfissional();

    expect(screen.getByLabelText('Unidade / Lotação principal')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Unidade São Paulo/SP' })).toBeInTheDocument();
  });

  it('edição pré-preenche "Unidade / Lotação principal" com o vínculo já salvo (colaborador_lotacoes.principal=true)', async () => {
    mockBuscarPorId.mockResolvedValue({ ...COLABORADOR_EXISTENTE });
    mockUseEmpresas.mockReturnValue({ empresaAtual: { id: 'emp-colaborador-1' } });
    renderPage('/colaboradores/editar/colab-1');

    await waitFor(() => expect(screen.getByLabelText('Nome Completo')).toHaveValue('Maria Existente'));
    await irParaAbaProfissional();

    await waitFor(() => expect(screen.getByLabelText('Unidade / Lotação principal')).toHaveValue('lo1'));
  });

  it('trocar a lotação principal e salvar chama definirPrincipal DEPOIS que o colaborador foi atualizado, com o novo lotacao_id', async () => {
    mockBuscarPorId.mockResolvedValue({ ...COLABORADOR_EXISTENTE });
    mockUseEmpresas.mockReturnValue({ empresaAtual: { id: 'emp-colaborador-1' } });
    mockUseLotacoesCatalogo.mockReturnValue({
      data: [
        { id: 'lo1', nome: 'Unidade São Paulo/SP', codigo: null, ativa: true },
        { id: 'lo2', nome: 'Unidade Campinas/SP', codigo: null, ativa: true },
      ],
    });
    renderPage('/colaboradores/editar/colab-1');

    await waitFor(() => expect(screen.getByLabelText('Nome Completo')).toHaveValue('Maria Existente'));
    await irParaAbaProfissional();

    fireEvent.change(screen.getByLabelText('Unidade / Lotação principal'), { target: { value: 'lo2' } });
    await userEvent.click(screen.getByRole('button', { name: /Salvar Alterações/i }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    // O colaborador salvo (mockUpdate resolve com { id: 'colab-1' }) precisa
    // existir antes da chamada — definirPrincipal usa esse id, não o `id` da
    // rota diretamente, para também cobrir corretamente o fluxo de criação.
    expect(mockDefinirPrincipal).toHaveBeenCalledWith('colab-1', 'lo2', 'emp-colaborador-1');
    // Nunca envia lotacao_principal_id dentro do payload de colaboradores —
    // não existe essa coluna na tabela.
    const payload = mockUpdate.mock.calls[0][1];
    expect(payload).not.toHaveProperty('lotacao_principal_id');
  });

  it('novo colaborador: só persiste a lotação principal depois de criado, usando o ID retornado pelo create', async () => {
    mockUseEmpresas.mockReturnValue({ empresaAtual: { id: 'emp-atual-1' } });
    renderPage('/colaboradores/novo');

    await preencherDadosMinimos();
    fireEvent.change(screen.getByLabelText('Unidade / Lotação principal'), { target: { value: 'lo1' } });
    await userEvent.click(screen.getByRole('button', { name: /Cadastrar agora/i }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    // mockCreate resolve com { id: 'novo-id' } — é esse id (não algum id
    // local inexistente) que precisa ser usado para vincular a lotação.
    expect(mockDefinirPrincipal).toHaveBeenCalledWith('novo-id', 'lo1', 'emp-atual-1');
  });

  it('não chama definirPrincipal quando nenhuma lotação foi selecionada (campo continua opcional)', async () => {
    mockUseEmpresas.mockReturnValue({ empresaAtual: { id: 'emp-atual-1' } });
    mockUseLotacaoPrincipal.mockReturnValue({ data: null });
    renderPage('/colaboradores/novo');

    await preencherDadosMinimos();
    await userEvent.click(screen.getByRole('button', { name: /Cadastrar agora/i }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockDefinirPrincipal).not.toHaveBeenCalled();
  });

  it('colaborador antigo com centro_custo/local_trabalho em texto (sem *_id) resolve o Select pelo nome, sem apagar o dado', async () => {
    mockBuscarPorId.mockResolvedValue({
      ...COLABORADOR_EXISTENTE,
      centro_custo_id: null,
      centro_custo: 'Recursos Humanos',
      local_trabalho_id: null,
      local_trabalho: 'Sede São Paulo',
    });
    mockUseEmpresas.mockReturnValue({ empresaAtual: { id: 'emp-colaborador-1' } });
    renderPage('/colaboradores/editar/colab-1');

    await waitFor(() => expect(screen.getByLabelText('Nome Completo')).toHaveValue('Maria Existente'));
    await irParaAbaProfissional();

    // 'cc1'/'lt1' são os IDs mockados em useCentrosCusto/useLocaisTrabalho
    // para os nomes 'Recursos Humanos'/'Sede São Paulo' — a resolução só
    // funciona se o texto salvo bater com o nome de um cadastro real.
    await waitFor(() => expect(screen.getByLabelText('Centro de custo')).toHaveValue('cc1'));
    await waitFor(() => expect(screen.getByLabelText('Local de trabalho')).toHaveValue('lt1'));
  });

  it('Matrícula Interna deixou de ser editável na aba "Dados Gerais" (fonte única em Profissional)', async () => {
    mockUseEmpresas.mockReturnValue({ empresaAtual: { id: 'emp-1' } });
    renderPage('/colaboradores/novo');

    expect(screen.queryByLabelText('Matrícula Interna')).not.toBeInTheDocument();
    await irParaAbaProfissional();
    expect(screen.getByLabelText('Matrícula Interna')).toBeInTheDocument();
  });
});
