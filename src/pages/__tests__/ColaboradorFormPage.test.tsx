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
}

async function irParaAbaProfissional() {
  await userEvent.click(screen.getByRole('tab', { name: /Profissional/i }));
}

function preencherDadosProfissionais() {
  fireEvent.change(screen.getByLabelText('Data Admissão'), { target: { value: '2024-01-10' } });
  fireEvent.change(screen.getByPlaceholderText('R$ 0,00'), { target: { value: '300000' } });
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
  email: '',
  telefone: '',
  celular: '',
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
    expect(payload.pis_pasep).toBe('');
    expect(payload.ctps_numero).toBe('');
    expect(payload.ctps_serie).toBe('');
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
