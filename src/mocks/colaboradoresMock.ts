import { Colaborador } from '@/types/entities';
import { formatDateLocalISO, addDaysLocal } from '@/utils/dateLocal';

// ============================================================================
// MOCK de dados fictícios da área de Colaboradores — listagem + TODAS as
// abas/sub-abas do dossiê ("Ver Perfil"). Não escreve no banco.
//
// Gateado por env var (mesmo padrão de src/mocks/dashboardMockData.ts):
// só liga em dev, nunca em teste unitário nem em produção. Para ligar
// localmente, defina VITE_COLABORADORES_MOCK=true no seu .env.local.
//
// Cada hook/service consultado pela área de Colaboradores faz um
// curto-circuito de poucas linhas usando `mockOr(getMockX(...))` antes da
// query real — ver useColaboradorDetalhes.ts, useAfastamentos.ts,
// useNovasTabelas.ts, useTabelasReferencia.ts, useBeneficiosColaborador.ts,
// useDocumentos.ts, useHistoricoContratos.ts, useSSTColaborador.ts,
// useDesenvolvimentoColaborador.ts, useComplianceColaborador.ts,
// useTimelineFuncional.ts, usePonto.ts, useOrganograma.ts, useBeneficios.ts
// e colaboradorService.ts.
//
// ⚠️ Os botões "Adicionar/Salvar" dessas sub-abas continuam chamando as
// mutations reais (gravam no Supabase de verdade). Evite usá-los em um perfil
// fictício (id começando com "mock-"): o insert pode falhar por violação de
// FK, ou — se a tabela não tiver FK — criar um registro órfão apontando para
// um colaborador_id inexistente.
// ============================================================================

/**
 * Ativa o mock apenas em dev e apenas com o opt-in explícito da env var.
 * `MODE !== 'test'` evita que os testes unitários (que rodam com o mesmo
 * .env.local) passem a receber dados fictícios em vez do que cada teste
 * configura via mock/fixture próprio.
 */
export function isColaboradoresMockEnabled(): boolean {
  return import.meta.env.DEV && import.meta.env.MODE !== 'test' && import.meta.env.VITE_COLABORADORES_MOCK === 'true';
}

// Empresa fictícia — só usada como fallback quando o usuário logado não tem
// NENHUM vínculo real em `user_empresas` (ver useEmpresas.ts). Sem uma
// empresa ativa, `empresaAtual?.id` fica undefined e toda a área de
// Colaboradores (que exige empresa_id) nunca chega a rodar, mockada ou não.
export const MOCK_EMPRESA: MockRecord = {
  id: 'mock-empresa-1',
  cnpj: '12345678000190',
  razao_social: 'Promo Brindes Fictícia LTDA',
  nome_fantasia: 'Promo Brindes (Demo)',
  inscricao_estadual: null,
  inscricao_municipal: null,
  cep: '01310000',
  logradouro: 'Av. Paulista',
  numero: '1000',
  complemento: null,
  bairro: 'Bela Vista',
  cidade: 'São Paulo',
  uf: 'SP',
  telefone: '(11) 3000-0000',
  email: 'contato@promobrindes.com.br',
  logo_url: null,
  ativa: true,
  regime_tributario: 'simples_nacional',
  aliquota_simples: 6,
  fap: 1,
  rat: 1,
  terceiros: 0,
  cor_identificacao: null,
  ordem_exibicao: 1,
  created_at: '2020-01-01T00:00:00Z',
  updated_at: '2020-01-01T00:00:00Z',
};

export function getMockUserEmpresas(): MockRecord[] {
  return [{
    id: 'mock-user-empresa-1',
    user_id: 'mock-user',
    empresa_id: MOCK_EMPRESA.id,
    is_default: true,
    created_at: '2020-01-01T00:00:00Z',
    empresa: MOCK_EMPRESA,
  }];
}

/** Retorna `mockValue` quando o mock está ligado, senão `undefined` (para o chamador cair no dado real via `??`). */
export function mockOr<T>(mockValue: T): T | undefined {
  return isColaboradoresMockEnabled() ? mockValue : undefined;
}

// `MOCK_EMPRESA.id` ('mock-empresa-1') vira `empresaAtualId` globalmente (ver
// useEmpresas.ts) para destravar a área de Colaboradores sem vínculo real.
// Hooks FORA do escopo documentado no topo deste arquivo (ex.: notificações,
// telemetria/health-check) não sabem disso e mandam esse id fictício direto
// pra chamadas reais — como não é um UUID válido, o backend rejeita com
// 400/422. Esses hooks devem checar isMockEmpresaId() antes de consultar.
export function isMockEmpresaId(id?: string | null): boolean {
  return id === MOCK_EMPRESA.id;
}

// Tipado solto (não como Colaborador[]) porque o status "ferias" é usado pela
// UI (ColaboradorStatus/StatusBadge) mas não existe no union type de status.
export const MOCK_COLABORADORES = [
  { id: 'mock-1', nome_completo: 'Ana Beatriz Souza', nome_social: 'Bia Souza', foto_url: 'https://randomuser.me/api/portraits/women/44.jpg', cpf: '111.222.333-44', rg: '44.556.778-9', data_nascimento: '1995-08-12', estado_civil: 'solteiro', email: 'ana.souza@promobrindes.com.br', email_pessoal: 'ana.beatriz@gmail.com', telefone: '(11) 98888-1001', celular: '(11) 98888-1001', cep: '01310-100', logradouro: 'Av. Paulista', numero: '1000', complemento: 'Apto 84', status: 'ativo', cargo: 'Analista de RH', cbo: '2524-05', departamento: 'Recursos Humanos', centro_custo: 'CC-050 Recursos Humanos', local_trabalho_id: 'mock-local-mock-1', time_id: 'mock-time-rh', supervisor_id: 'mock-13', empresa_id: 'mock', matricula: 'MAT001', tipo_contrato: 'clt', data_admissao: '2021-03-15', salario_base: 4500, cidade: 'São Paulo', uf: 'SP', jornada_semanal: 44, horario_entrada: '08:00', horario_saida: '17:00', horario_intervalo: '12:00-13:00', observacoes: 'Colaboradora destaque no programa de integração de 2023.' },
  { id: 'mock-2', nome_completo: 'Carlos Eduardo Lima', nome_social: 'Cadu Lima', foto_url: 'https://randomuser.me/api/portraits/men/32.jpg', cpf: '222.333.444-55', rg: '55.667.889-0', data_nascimento: '1990-02-20', estado_civil: 'casado', email: 'carlos.lima@promobrindes.com.br', email_pessoal: 'carlos.lima@gmail.com', telefone: '(41) 98888-1002', celular: '(41) 98888-1002', cep: '80010-000', logradouro: 'Rua XV de Novembro', numero: '450', complemento: 'Bloco B', status: 'ativo', cargo: 'Desenvolvedor Frontend', cbo: '2124-05', departamento: 'Tecnologia', centro_custo: 'CC-300 Tecnologia', local_trabalho_id: 'mock-local-mock-2', time_id: 'mock-time-tech', empresa_id: 'mock', matricula: 'MAT002', tipo_contrato: 'clt', data_admissao: '2022-06-01', salario_base: 6200, cidade: 'Curitiba', uf: 'PR', jornada_semanal: 44, horario_entrada: '08:00', horario_saida: '17:00', horario_intervalo: '12:00-13:00', observacoes: 'Certificação React concluída em 2024.' },
  { id: 'mock-3', nome_completo: 'Fernanda Costa Ribeiro', nome_social: 'Fê Ribeiro', foto_url: 'https://randomuser.me/api/portraits/women/65.jpg', cpf: '333.444.555-66', rg: '66.778.990-1', data_nascimento: '1988-11-03', estado_civil: 'casado', email: 'fernanda.ribeiro@promobrindes.com.br', email_pessoal: 'fernanda.ribeiro@gmail.com', telefone: '(11) 98888-1003', celular: '(11) 98888-1003', cep: '01310-200', logradouro: 'Rua Augusta', numero: '2200', complemento: 'Apto 15', status: 'ferias', cargo: 'Coordenadora Financeira', cbo: '2521-05', departamento: 'Financeiro', centro_custo: 'CC-200 Financeiro', local_trabalho_id: 'mock-local-mock-3', time_id: 'mock-time-ops', empresa_id: 'mock', matricula: 'MAT003', tipo_contrato: 'clt', data_admissao: '2019-11-10', salario_base: 8500, cidade: 'São Paulo', uf: 'SP', jornada_semanal: 44, horario_entrada: '08:00', horario_saida: '17:00', horario_intervalo: '12:00-13:00', observacoes: 'Retorno de férias previsto para o próximo mês.' },
  { id: 'mock-4', nome_completo: 'Gustavo Henrique Alves', nome_social: 'Gu Alves', foto_url: 'https://randomuser.me/api/portraits/men/45.jpg', cpf: '444.555.666-77', rg: '77.889.001-2', data_nascimento: '1996-06-18', estado_civil: 'solteiro', email: 'gustavo.alves@promobrindes.com.br', email_pessoal: 'gustavo.alves@gmail.com', telefone: '(19) 98888-1004', celular: '(19) 98888-1004', cep: '13010-141', logradouro: 'Av. Francisco Glicério', numero: '830', complemento: 'Sala 12', status: 'ativo', cargo: 'Vendedor Externo', cbo: '5211-15', departamento: 'Comercial', centro_custo: 'CC-100 Comercial', local_trabalho_id: 'mock-local-mock-4', time_id: 'mock-time-comercial', empresa_id: 'mock', matricula: 'MAT004', tipo_contrato: 'clt', data_admissao: '2023-01-20', salario_base: 3800, cidade: 'Campinas', uf: 'SP', jornada_semanal: 44, horario_entrada: '08:00', horario_saida: '17:00', horario_intervalo: '12:00-13:00', observacoes: 'Em período de experiência — bom desempenho nas primeiras vendas.' },
  { id: 'mock-5', nome_completo: 'Juliana Pereira Martins', nome_social: 'Ju Martins', foto_url: 'https://randomuser.me/api/portraits/women/68.jpg', cpf: '555.666.777-88', rg: '88.990.112-3', data_nascimento: '1985-09-25', estado_civil: 'uniao_estavel', email: 'juliana.martins@promobrindes.com.br', email_pessoal: 'juliana.martins@gmail.com', telefone: '(11) 98888-1005', celular: '(11) 98888-1005', cep: '04538-133', logradouro: 'Rua Funchal', numero: '375', complemento: 'Casa 2', status: 'afastado', cargo: 'Assistente Administrativo', cbo: '4110-10', departamento: 'Administrativo', centro_custo: 'CC-010 Administrativo', local_trabalho_id: 'mock-local-mock-5', time_id: 'mock-time-ops', empresa_id: 'mock', matricula: 'MAT005', tipo_contrato: 'clt', data_admissao: '2020-08-05', salario_base: 3200, cidade: 'São Paulo', uf: 'SP', jornada_semanal: 44, horario_entrada: '08:00', horario_saida: '17:00', horario_intervalo: '12:00-13:00', observacoes: 'Afastamento médico — previsão de retorno em avaliação.' },
  { id: 'mock-6', nome_completo: 'Lucas Gabriel Fernandes', nome_social: 'Lucas Fernandes', foto_url: 'https://randomuser.me/api/portraits/men/67.jpg', cpf: '666.777.888-99', rg: '99.001.223-4', data_nascimento: '1994-01-30', estado_civil: 'solteiro', email: 'lucas.fernandes@promobrindes.com.br', email_pessoal: 'lucas.fernandes@gmail.com', telefone: '(31) 98888-1006', celular: '(31) 98888-1006', cep: '30130-010', logradouro: 'Av. Afonso Pena', numero: '1500', complemento: 'Sala 302', status: 'ativo', cargo: 'Designer Gráfico', cbo: '2624-10', departamento: 'Marketing', centro_custo: 'CC-400 Marketing', local_trabalho_id: 'mock-local-mock-6', time_id: 'mock-time-ops', empresa_id: 'mock', matricula: 'MAT006', tipo_contrato: 'clt', data_admissao: '2022-02-14', salario_base: 4100, cidade: 'Belo Horizonte', uf: 'MG', jornada_semanal: 44, horario_entrada: '08:00', horario_saida: '17:00', horario_intervalo: '12:00-13:00', observacoes: 'Responsável pela identidade visual das campanhas sazonais.' },
  { id: 'mock-7', nome_completo: 'Mariana Oliveira Santos', nome_social: 'Mari Santos', foto_url: 'https://randomuser.me/api/portraits/women/21.jpg', cpf: '777.888.999-00', rg: '11.223.345-6', data_nascimento: '1983-04-07', estado_civil: 'casado', email: 'mariana.santos@promobrindes.com.br', email_pessoal: 'mariana.santos@gmail.com', telefone: '(11) 98888-1007', celular: '(11) 98888-1007', cep: '05426-100', logradouro: 'Rua Cardeal Arcoverde', numero: '610', complemento: 'Apto 33', status: 'ativo', cargo: 'Gerente de Produto', cbo: '1425-15', departamento: 'Produto', centro_custo: 'CC-310 Produto', local_trabalho_id: 'mock-local-mock-7', time_id: 'mock-time-tech', empresa_id: 'mock', matricula: 'MAT007', tipo_contrato: 'clt', data_admissao: '2018-05-22', salario_base: 11500, cidade: 'São Paulo', uf: 'SP', jornada_semanal: 44, horario_entrada: '08:00', horario_saida: '17:00', horario_intervalo: '12:00-13:00', observacoes: 'Líder do time de produto desde 2020.' },
  { id: 'mock-8', nome_completo: 'Pedro Henrique Barbosa', nome_social: 'Pedro Barbosa', foto_url: 'https://randomuser.me/api/portraits/men/81.jpg', cpf: '888.999.000-11', rg: '22.334.456-7', data_nascimento: '1998-12-14', estado_civil: 'solteiro', email: 'pedro.barbosa@promobrindes.com.br', email_pessoal: 'pedro.barbosa@gmail.com', telefone: '(11) 98888-1008', celular: '(11) 98888-1008', cep: '07023-000', logradouro: 'Av. Bom Clima', numero: '220', complemento: 'Fundos', status: 'desligado', cargo: 'Estoquista', cbo: '4141-15', departamento: 'Logística', centro_custo: 'CC-500 Logística', local_trabalho_id: 'mock-local-mock-8', time_id: 'mock-time-ops', empresa_id: 'mock', matricula: 'MAT008', tipo_contrato: 'clt', data_admissao: '2020-01-10', salario_base: 2400, cidade: 'Guarulhos', uf: 'SP', jornada_semanal: 44, horario_entrada: '08:00', horario_saida: '17:00', horario_intervalo: '12:00-13:00', observacoes: 'Desligamento em 2025 — pedido de demissão.' },
  { id: 'mock-9', nome_completo: 'Rafaela Cristina Gomes', nome_social: 'Rafa Gomes', foto_url: 'https://randomuser.me/api/portraits/women/90.jpg', cpf: '999.000.111-22', rg: '33.445.567-8', data_nascimento: '1991-07-22', estado_civil: 'divorciado', email: 'rafaela.gomes@promobrindes.com.br', email_pessoal: 'rafaela.gomes@gmail.com', telefone: '(11) 98888-1009', celular: '(11) 98888-1009', cep: '01311-000', logradouro: 'Alameda Santos', numero: '800', complemento: 'Apto 91', status: 'ativo', cargo: 'Analista Fiscal', cbo: '2523-05', departamento: 'Financeiro', centro_custo: 'CC-200 Financeiro', local_trabalho_id: 'mock-local-mock-9', time_id: 'mock-time-ops', empresa_id: 'mock', matricula: 'MAT009', tipo_contrato: 'clt', data_admissao: '2021-09-30', salario_base: 5300, cidade: 'São Paulo', uf: 'SP', jornada_semanal: 44, horario_entrada: '08:00', horario_saida: '17:00', horario_intervalo: '12:00-13:00', observacoes: 'Colaboradora PCD — sem restrições para as funções do cargo.' },
  { id: 'mock-10', nome_completo: 'Thiago Almeida Rocha', nome_social: 'Thi Rocha', foto_url: 'https://randomuser.me/api/portraits/men/15.jpg', cpf: '000.111.222-33', rg: '44.556.678-9', data_nascimento: '1993-03-11', estado_civil: 'solteiro', email: 'thiago.rocha@promobrindes.com.br', email_pessoal: 'thiago.rocha@gmail.com', telefone: '(48) 98888-1010', celular: '(48) 98888-1010', cep: '88010-400', logradouro: 'Av. Beira Mar Norte', numero: '1050', complemento: 'Cobertura', status: 'ativo', cargo: 'Desenvolvedor Backend', cbo: '2124-05', departamento: 'Tecnologia', centro_custo: 'CC-300 Tecnologia', local_trabalho_id: 'mock-local-mock-10', time_id: 'mock-time-tech', empresa_id: 'mock', matricula: 'MAT010', tipo_contrato: 'clt', data_admissao: '2023-04-18', salario_base: 6800, cidade: 'Florianópolis', uf: 'SC', jornada_semanal: 44, horario_entrada: '08:00', horario_saida: '17:00', horario_intervalo: '12:00-13:00', observacoes: 'Especialista em integrações e APIs.' },
  { id: 'mock-11', nome_completo: 'Vanessa Rodrigues Dias', nome_social: 'Van Dias', foto_url: 'https://randomuser.me/api/portraits/women/12.jpg', cpf: '123.456.789-00', rg: '55.667.789-0', data_nascimento: '1987-10-05', estado_civil: 'casado', email: 'vanessa.dias@promobrindes.com.br', email_pessoal: 'vanessa.dias@gmail.com', telefone: '(11) 98888-1011', celular: '(11) 98888-1011', cep: '01415-001', logradouro: 'Rua Haddock Lobo', numero: '340', complemento: 'Apto 22', status: 'desligado', cargo: 'Recepcionista', cbo: '4221-05', departamento: 'Administrativo', centro_custo: 'CC-010 Administrativo', local_trabalho_id: 'mock-local-mock-11', time_id: 'mock-time-ops', empresa_id: 'mock', matricula: 'MAT011', tipo_contrato: 'clt', data_admissao: '2019-07-08', salario_base: 2100, cidade: 'São Paulo', uf: 'SP', jornada_semanal: 44, horario_entrada: '08:00', horario_saida: '17:00', horario_intervalo: '12:00-13:00', observacoes: 'Desligamento em 2024 — fim de contrato.' },
  { id: 'mock-12', nome_completo: 'William Nunes Cardoso', nome_social: 'Will Cardoso', foto_url: 'https://randomuser.me/api/portraits/men/52.jpg', cpf: '234.567.890-11', rg: '66.778.890-1', data_nascimento: '1982-05-28', estado_civil: 'uniao_estavel', email: 'william.cardoso@promobrindes.com.br', email_pessoal: 'william.cardoso@gmail.com', telefone: '(21) 98888-1012', celular: '(21) 98888-1012', cep: '22041-001', logradouro: 'Av. Atlântica', numero: '2000', complemento: 'Cobertura', status: 'ativo', cargo: 'Supervisor Comercial', cbo: '3541-10', departamento: 'Comercial', centro_custo: 'CC-100 Comercial', local_trabalho_id: 'mock-local-mock-12', time_id: 'mock-time-comercial', empresa_id: 'mock', matricula: 'MAT012', tipo_contrato: 'clt', data_admissao: '2020-12-01', salario_base: 7200, cidade: 'Rio de Janeiro', uf: 'RJ', jornada_semanal: 44, horario_entrada: '08:00', horario_saida: '17:00', horario_intervalo: '12:00-13:00', observacoes: 'Responsável pela equipe de vendas da região Sudeste.' },
  // Gestora de mock-1 (Ana Beatriz) — existe só para popular o campo "Gestor
  // direto" do Dossiê com avatar+nome+cargo reais no modo demo.
  { id: 'mock-13', nome_completo: 'Mariana Oliveira', nome_social: 'Mari Oliveira', foto_url: 'https://randomuser.me/api/portraits/women/50.jpg', cpf: '135.246.357-90', rg: '77.889.902-3', data_nascimento: '1979-02-14', estado_civil: 'casado', email: 'mariana.oliveira@promobrindes.com.br', email_pessoal: 'mariana.oliveira@gmail.com', telefone: '(11) 98888-1013', celular: '(11) 98888-1013', cep: '01311-100', logradouro: 'Rua Oscar Freire', numero: '450', complemento: 'Apto 1201', status: 'ativo', cargo: 'Gerente de RH', cbo: '1421-05', departamento: 'Recursos Humanos', centro_custo: 'CC-050 Recursos Humanos', local_trabalho_id: 'mock-local-mock-1', time_id: 'mock-time-rh', empresa_id: 'mock', matricula: 'MAT013', tipo_contrato: 'clt', data_admissao: '2017-04-10', salario_base: 9800, cidade: 'São Paulo', uf: 'SP', jornada_semanal: 44, horario_entrada: '08:00', horario_saida: '17:00', horario_intervalo: '12:00-13:00', observacoes: 'Gestora da área de Recursos Humanos.' },
];

export const MOCK_SUMMARY = {
  total: MOCK_COLABORADORES.length,
  ativo: MOCK_COLABORADORES.filter(c => c.status === 'ativo').length,
  desligado: MOCK_COLABORADORES.filter(c => c.status === 'desligado').length,
  inativo: MOCK_COLABORADORES.filter(c => c.status === 'desligado').length,
  ferias: MOCK_COLABORADORES.filter(c => c.status === 'ferias').length,
  afastado: MOCK_COLABORADORES.filter(c => c.status === 'afastado').length,
};

export function findMockColaborador(id?: string): Colaborador | undefined {
  return MOCK_COLABORADORES.find(c => c.id === id) as unknown as Colaborador | undefined;
}

// ============================================================================
// Mocks das sub-abas do Dossiê ("Ver Perfil")
// Cada gerador retorna `undefined` quando o id não corresponde a um
// colaborador fictício, para que o hook original caia de volta na consulta
// real (nenhum efeito para colaboradores reais).
// ============================================================================
type MockRecord = Record<string, any>;

function firstName(nome: string) {
  return nome.split(' ')[0];
}

function lastName(nome: string) {
  const partes = nome.split(' ');
  return partes[partes.length - 1];
}

// Múltiplos registros fictícios (em vez de só 1) para exercitar o scroll
// vertical interno dos cards "Dependentes"/"Contatos de Emergência" no
// dashboard de Dados Pessoais (ver DependentesTab.tsx/EmergenciaTab.tsx).
export function getMockDependentes(colaboradorId?: string): MockRecord[] | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  const sobrenome = lastName(c.nome_completo);
  const primeiroNome = firstName(c.nome_completo);
  const cpfBase = c.cpf.slice(0, -2);
  return [
    { id: `${c.id}-dep-1`, nome: `${sobrenome} Filho(a)`, parentesco: 'Filho(a)', cpf: `${cpfBase}05`, data_nascimento: '2016-05-10', ir: true, salario_familia: false, incapacidade_fisica_mental: false },
    { id: `${c.id}-dep-2`, nome: `${sobrenome} Filho(a) Jr.`, parentesco: 'Filho(a)', cpf: `${cpfBase}06`, data_nascimento: '2019-09-22', ir: true, salario_familia: true, incapacidade_fisica_mental: false },
    { id: `${c.id}-dep-3`, nome: `Cônjuge de ${primeiroNome}`, parentesco: 'Cônjuge', cpf: `${cpfBase}07`, data_nascimento: '1990-03-15', ir: false, salario_familia: false, incapacidade_fisica_mental: false },
  ];
}

export function getMockContatosEmergencia(colaboradorId?: string): MockRecord[] | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  const nome = firstName(c.nome_completo);
  const nomeSlug = nome.toLowerCase();
  return [
    { id: `${c.id}-emerg-1`, nome: `Familiar de ${nome}`, parentesco: 'Pai/Mãe', telefone: '(11) 3333-4444', celular: '(11) 99999-8888', email: `familiar.${nomeSlug}@example.com` },
    { id: `${c.id}-emerg-2`, nome: `Cônjuge de ${nome}`, parentesco: 'Cônjuge', telefone: '(11) 3222-1111', celular: '(11) 98888-2222', email: `conjuge.${nomeSlug}@example.com` },
  ];
}

export function getMockHistoricoSalarial(colaboradorId?: string): MockRecord[] | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  const salarioAtual = (c as any).salario_base || 3000;
  const salarioAnterior = Math.round(salarioAtual * 0.88);
  return [
    { id: `${c.id}-sal-1`, data_vigencia: c.data_admissao, salario_anterior: null, salario_novo: salarioAnterior, motivo: 'Admissão', descricao: 'Salário de contratação' },
    { id: `${c.id}-sal-2`, data_vigencia: '2024-01-01', salario_anterior: salarioAnterior, salario_novo: salarioAtual, motivo: 'Mérito', descricao: 'Reajuste anual por desempenho' },
  ];
}

export function getMockASOs(colaboradorId?: string): MockRecord[] | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  return [
    { id: `${c.id}-aso-1`, tipo: 'Admissional', data_exame: c.data_admissao, data_validade: null, resultado: 'apto', medico_nome: 'Dra. Patrícia Nogueira', medico_crm: 'CRM 45210', clinica: 'Clínica SaúdeOcupacional' },
    { id: `${c.id}-aso-2`, tipo: 'Periódico', data_exame: '2025-02-10', data_validade: '2026-02-10', resultado: 'apto', medico_nome: 'Dr. Rogério Matos', medico_crm: 'CRM 33110', clinica: 'Clínica SaúdeOcupacional' },
  ];
}

export function getMockFormacoes(colaboradorId?: string): MockRecord[] | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  return [
    { id: `${c.id}-form-1`, tipo_escolaridade: 'Superior completo', curso: `${c.cargo}`, instituicao: 'Universidade Federal', ano_conclusao: 2016 },
  ];
}

export function getMockAnotacoes(colaboradorId?: string): MockRecord[] | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  return [
    { id: `${c.id}-nota-1`, titulo: 'Integração concluída', conteudo: `${firstName(c.nome_completo)} concluiu o processo de integração com feedback positivo do gestor.`, tipo: 'elogio', data: c.data_admissao },
  ];
}

// Campos alinhados com o schema real da tabela `periodos_aquisitivos` (ver
// migração 20251216170845): `data_inicio`/`data_fim`/`dias_direito`/
// `dias_descontados`/`data_limite_concessao`, consumidos por FeriasResumoTab.
export function getMockPeriodosAquisitivos(colaboradorId?: string): MockRecord[] | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  return [
    { id: `${c.id}-aquis-1`, data_inicio: '2025-12-01', data_fim: '2026-11-30', dias_direito: 30, dias_descontados: 3, status: 'em_aquisicao', data_limite_concessao: '2027-11-30' },
  ];
}

export function getMockContasBancarias(colaboradorId?: string): MockRecord[] | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  return [
    { id: `${c.id}-conta-1`, banco_codigo: '341', banco_nome: 'Itaú Unibanco', agencia: '1234', conta: '56789-0', tipo_conta: 'Corrente', pix_tipo: 'Email', pix_chave: c.email, principal: true },
    { id: `${c.id}-conta-2`, banco_codigo: '001', banco_nome: 'Banco do Brasil', agencia: '4321', conta: '98765-4', tipo_conta: 'Poupança', pix_tipo: 'CPF', pix_chave: c.cpf, principal: false },
    { id: `${c.id}-conta-3`, banco_codigo: '260', banco_nome: 'Nubank', agencia: '0001', conta: '12345-6', tipo_conta: 'Corrente', pix_tipo: 'Telefone', pix_chave: (c as any).telefone, principal: false },
  ];
}

export function getMockDocumentosPessoais(colaboradorId?: string): MockRecord[] | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  return [
    { id: `${c.id}-doc-rg`, tipo_documento: 'RG', numero: '00.000.000-0', orgao_emissor: 'SSP/SP', data_emissao: '2010-03-10', data_validade: null },
    { id: `${c.id}-doc-cpf`, tipo_documento: 'CPF', numero: c.cpf, orgao_emissor: 'Receita Federal', data_emissao: '2008-01-15', data_validade: null },
    // Vencido de propósito — só pra exercitar o card "Pendências" (scroll com
    // várias pendências) no modo demo.
    { id: `${c.id}-doc-cnh`, tipo_documento: 'CNH', numero: '00000000000', orgao_emissor: 'DETRAN/SP', data_emissao: '2020-05-10', data_validade: '2026-08-01' },
  ];
}

export function getMockHistoricoContratos(colaboradorId?: string): MockRecord[] | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  return [
    { id: `${c.id}-contrato-1`, data_inicio: c.data_admissao, cargo: c.cargo, departamento: c.departamento, tipo_contrato: 'CLT', salario: (c as any).salario_base, carga_horaria_semanal: 44, motivo_alteracao: 'Admissão' },
  ];
}

export function getMockBeneficiosColaborador(colaboradorId?: string): MockRecord[] | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  return [
    { id: `${c.id}-benef-1`, valor: 600, desconto: 0, data_inicio: c.data_admissao, status_vinculo: 'ativo', beneficio: { nome: 'Vale Refeição', tipo: 'alimentacao' } },
    { id: `${c.id}-benef-2`, valor: 350, desconto: 35, data_inicio: c.data_admissao, status_vinculo: 'ativo', beneficio: { nome: 'Plano de Saúde', tipo: 'saude' } },
    { id: `${c.id}-benef-3`, valor: 220, desconto: 0, data_inicio: c.data_admissao, status_vinculo: 'ativo', beneficio: { nome: 'Vale Transporte', tipo: 'transporte' } },
    { id: `${c.id}-benef-4`, valor: 80, desconto: 15, data_inicio: c.data_admissao, status_vinculo: 'ativo', beneficio: { nome: 'Seguro de Vida', tipo: 'seguro' } },
  ];
}

export function getMockDocumentosDigitais(colaboradorId?: string): MockRecord[] | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  return [
    { id: `${c.id}-arq-1`, nome: 'Contrato de Trabalho', tipo: 'Contrato de Trabalho', url: '', data_validade: null, created_at: c.data_admissao },
    { id: `${c.id}-arq-2`, nome: 'RG e CPF digitalizados', tipo: 'Outros', url: '', data_validade: null, created_at: c.data_admissao },
  ];
}

export function getMockAuditLog(colaboradorId?: string): MockRecord[] | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  return [
    {
      id: `${c.id}-audit-2`, acao: 'UPDATE', user_email: 'rh@promobrindes.com.br', created_at: '2024-01-05T10:00:00Z',
      campos_alterados: ['salario_base'],
      dados_anteriores: { salario_base: Math.round(((c as any).salario_base || 3000) * 0.88) },
      dados_novos: { salario_base: (c as any).salario_base },
    },
    {
      id: `${c.id}-audit-1`, acao: 'INSERT', user_email: 'rh@promobrindes.com.br', created_at: `${c.data_admissao}T09:00:00Z`,
      campos_alterados: [], dados_anteriores: null, dados_novos: null,
    },
  ];
}

// Dados "singleton" — preenchidos para TODOS os 12 colaboradores fictícios
// (visão de pré-visualização de layout: nenhuma aba fica em estado vazio).
export function getMockPeriodoExperiencia(colaboradorId?: string): MockRecord | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  const recente = colaboradorId === 'mock-4' || colaboradorId === 'mock-10';
  return {
    data_inicio: c.data_admissao,
    primeira_etapa_fim: recente ? '2023-03-06' : c.data_admissao,
    segunda_etapa_fim: recente ? '2023-04-20' : c.data_admissao,
    tipo: '45+45',
    status: recente ? 'em_andamento' : 'efetivado',
  };
}

const MOCK_DADOS_ESTRANGEIRO_POR_ID: Record<string, MockRecord> = {
  'mock-2': { pais_origem: 'Portugal', tipo_visto: 'Permanente (casamento)', data_chegada: '2021-11-01', reside_brasil: true },
  'mock-5': { pais_origem: 'Argentina', tipo_visto: 'Temporário (trabalho)', data_chegada: '2020-05-14', reside_brasil: true },
  'mock-9': { pais_origem: 'Bolívia', tipo_visto: 'Permanente (Mercosul)', data_chegada: '2018-09-01', reside_brasil: true },
};

export function getMockDadosEstrangeiro(colaboradorId?: string): MockRecord | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  return MOCK_DADOS_ESTRANGEIRO_POR_ID[colaboradorId!]
    ?? { pais_origem: 'Brasil', tipo_visto: 'Não aplicável (nacional)', data_chegada: c.data_admissao, reside_brasil: true };
}

const MOCK_DEFICIENCIA_POR_ID: Record<string, MockRecord> = {
  'mock-9': { tipo: 'Auditiva', cid: 'H90', descricao: 'Uso de aparelho auditivo bilateral.', observacoes: 'Sem restrições para as funções do cargo.' },
  'mock-4': { tipo: 'Física', cid: 'M16', descricao: 'Mobilidade reduzida no membro inferior direito.', observacoes: 'Vaga de estacionamento reservada.' },
};

export function getMockDeficiencia(colaboradorId?: string): MockRecord | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  return MOCK_DEFICIENCIA_POR_ID[colaboradorId!]
    ?? { tipo: 'Não se aplica', cid: 'Z00', descricao: 'Nenhuma deficiência declarada em avaliação admissional.', observacoes: 'Apto sem restrições.' };
}

export function getMockDadosEstagiario(colaboradorId?: string): MockRecord | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  return {
    instituicao_nome: 'Centro Universitário Demo',
    instituicao_cnpj: '12.345.678/0001-00',
    curso: c.cargo,
    nivel: 'Superior',
    supervisor_nome: 'RH — Promo Brindes (Demo)',
    supervisor_cargo: 'Coordenador(a) de RH',
    data_inicio: c.data_admissao,
    data_fim: null,
    carga_horaria_semanal: 30,
    valor_bolsa: Math.round((c.salario_base || 3000) * 0.6),
    numero_apolice: `AP-${c.id.toUpperCase()}`,
  };
}

// Planos de benefício disponíveis na empresa (não é por colaborador — usado
// pelo dropdown "Vincular Benefício" em BeneficiosTab). Só é usado como
// fallback quando a empresa ainda não tem planos reais cadastrados; nunca
// oculta planos reais existentes.
// Organograma (estrutura hierárquica de departamentos). Reaproveita os
// colaboradores fictícios "ativo" de MOCK_COLABORADORES, agrupados por
// `departamento`, com um nível de aninhamento (Produto sob Tecnologia) para
// exercitar a renderização recursiva de OrganogramaNode.
function colaboradoresAtivosDe(departamento: string): MockRecord[] {
  return MOCK_COLABORADORES
    .filter(c => c.status === 'ativo' && c.departamento === departamento)
    .map(c => ({ id: c.id, nome_completo: c.nome_completo, cargo: c.cargo, email: c.email, foto_url: undefined }));
}

export function getMockOrganograma(): MockRecord[] {
  return [
    {
      id: 'mock-depto-diretoria',
      nome: 'Diretoria Executiva',
      colaboradores: [],
      sub_departamentos: [
        { id: 'mock-depto-rh', nome: 'Recursos Humanos', colaboradores: colaboradoresAtivosDe('Recursos Humanos'), sub_departamentos: [] },
        { id: 'mock-depto-financeiro', nome: 'Financeiro', colaboradores: colaboradoresAtivosDe('Financeiro'), sub_departamentos: [] },
        { id: 'mock-depto-comercial', nome: 'Comercial', colaboradores: colaboradoresAtivosDe('Comercial'), sub_departamentos: [] },
        {
          id: 'mock-depto-tecnologia',
          nome: 'Tecnologia',
          colaboradores: colaboradoresAtivosDe('Tecnologia'),
          sub_departamentos: [
            { id: 'mock-depto-produto', nome: 'Produto', colaboradores: colaboradoresAtivosDe('Produto'), sub_departamentos: [] },
          ],
        },
        { id: 'mock-depto-administrativo', nome: 'Administrativo', colaboradores: colaboradoresAtivosDe('Administrativo'), sub_departamentos: [] },
      ],
    },
    { id: 'mock-depto-marketing', nome: 'Marketing', colaboradores: colaboradoresAtivosDe('Marketing'), sub_departamentos: [] },
    { id: 'mock-depto-logistica', nome: 'Logística', colaboradores: colaboradoresAtivosDe('Logística'), sub_departamentos: [] },
  ];
}

export const MOCK_PLANOS_BENEFICIO: MockRecord[] = [
  { id: 'mock-plano-1', nome: 'Vale Refeição', tipo: 'alimentacao', valor: 600 },
  { id: 'mock-plano-2', nome: 'Vale Transporte', tipo: 'transporte', valor: 220 },
  { id: 'mock-plano-3', nome: 'Plano de Saúde', tipo: 'saude', valor: 350 },
  { id: 'mock-plano-4', nome: 'Seguro de Vida', tipo: 'vida', valor: 45 },
];

// ============================================================================
// Geradores adicionais — cobrem as sub-abas do dossiê que ainda não tinham
// mock (Férias, Holerites, Afastamentos, Compliance, Desenvolvimento,
// Jornada/Ponto, SST, Hierarquia, Campos Customizados, Timeline Funcional).
// Mesmo contrato dos geradores acima: `undefined` quando o id não é um dos 12
// colaboradores fictícios, para o hook cair de volta na consulta real.
// ============================================================================

// Férias — resumo por colaborador
export function getMockFerias(colaboradorId?: string): MockRecord[] | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  return [
    { id: `${c.id}-ferias-1`, data_inicio: '2025-07-01', data_fim: '2025-07-30', dias_gozo: 30, status: 'concluida' },
    { id: `${c.id}-ferias-2`, data_inicio: '2026-11-10', data_fim: '2026-11-24', dias_gozo: 15, status: 'aprovada' },
    { id: `${c.id}-ferias-3`, data_inicio: '2025-01-06', data_fim: '2025-01-20', dias_gozo: 15, status: 'concluida' },
    { id: `${c.id}-ferias-4`, data_inicio: '2024-07-08', data_fim: '2024-07-17', dias_gozo: 10, status: 'concluida' },
    { id: `${c.id}-ferias-5`, data_inicio: '2024-01-15', data_fim: '2024-02-13', dias_gozo: 30, status: 'concluida' },
    { id: `${c.id}-ferias-6`, data_inicio: '2023-06-05', data_fim: '2023-06-14', dias_gozo: 10, status: 'concluida' },
  ];
}

// Holerites
export function getMockHolerites(colaboradorId?: string): MockRecord[] | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  const salario = (c as any).salario_base || 3000;
  const liquido = Math.round(salario * 0.82);
  const base = {
    colaborador_nome: c.nome_completo,
    colaborador_cpf: (c as any).cpf ?? '—',
    colaborador_cargo: (c as any).cargo ?? '—',
    salario_base: salario,
    total_proventos: salario,
    total_descontos: salario - liquido,
    total_liquido: liquido,
    valor_inss: Math.round(salario * 0.09),
    valor_irrf: Math.round(salario * 0.05),
    valor_fgts: Math.round(salario * 0.08),
  };
  return [
    { id: `${c.id}-hol-2`, competencia: '2026-08', assinado: false, created_at: '2026-09-01', ...base },
    { id: `${c.id}-hol-1`, competencia: '2026-07', assinado: true, created_at: '2026-08-01', ...base },
    { id: `${c.id}-hol-3`, competencia: '2026-06', assinado: true, created_at: '2026-07-01', ...base },
    { id: `${c.id}-hol-4`, competencia: '2026-05', assinado: true, created_at: '2026-06-01', ...base },
  ];
}

// Afastamentos — todo colaborador tem 1 afastamento em andamento (para a seção
// "Situação Atual") + 1 concluído no histórico dos últimos 12 meses.
export function getMockAfastamentos(colaboradorId?: string): MockRecord[] | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  const tipoAtual = c.status === 'afastado' ? 'Auxílio-doença' : 'Licença Médica';
  return [
    { id: `${c.id}-afast-1`, tipo: tipoAtual, data_inicio: '2026-08-15', data_fim_prevista: '2026-10-15', data_fim_real: null, status: 'em_andamento' },
    { id: `${c.id}-afast-hist-1`, tipo: 'Licença Maternidade/Paternidade', data_inicio: '2024-03-01', data_fim_prevista: '2024-08-28', data_fim_real: '2024-08-28', status: 'concluido' },
  ];
}

// Compliance — medidas disciplinares + consentimentos LGPD
export function getMockMedidasDisciplinares(colaboradorId?: string): MockRecord[] | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  if (c.id === 'mock-8') {
    return [{ id: `${c.id}-medida-1`, tipo: 'Advertência verbal', data_ocorrencia: '2024-11-10', gravidade: 'leve' }];
  }
  return [{ id: `${c.id}-medida-1`, tipo: 'Orientação verbal', data_ocorrencia: c.data_admissao, gravidade: 'leve' }];
}

export function getMockConsentimentosLGPD(colaboradorId?: string): MockRecord[] | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  return [
    { id: `${c.id}-lgpd-1`, tipo: 'Termo de Uso de Dados Pessoais', versao: '1.0', aceito: true },
    { id: `${c.id}-lgpd-2`, tipo: 'Consentimento para Biometria (Ponto)', versao: '1.2', aceito: true },
  ];
}

// Desenvolvimento
export function getMockCertificados(colaboradorId?: string): MockRecord[] | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  return [{ id: `${c.id}-cert-1`, curso: { nome: `Excelência em ${c.cargo}` } }];
}

export function getMockTreinamentos(colaboradorId?: string): MockRecord[] | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  return [
    { id: `${c.id}-trein-1`, presente: true, created_at: '2026-04-15', treinamento: { nome: 'Integração e Cultura Organizacional' } },
    { id: `${c.id}-trein-2`, presente: false, created_at: '2026-08-20', treinamento: { nome: 'NR-17 Ergonomia' } },
  ];
}

export function getMockFeedbacks(colaboradorId?: string): MockRecord[] | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  return [{ id: `${c.id}-feed-1`, created_at: '2026-06-30', nota_geral: 4.2, performance: 'Supera expectativas' }];
}

export function getMockPDIs(colaboradorId?: string): MockRecord[] | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  return [{ id: `${c.id}-pdi-1`, titulo: `Desenvolver liderança técnica em ${c.departamento}`, status: 'em_andamento' }];
}

export function getMockMetas(colaboradorId?: string): MockRecord[] | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  return [{ id: `${c.id}-meta-1`, titulo: 'Concluir certificação da área até o fim do trimestre', progresso: 65 }];
}

export function getMockOnboardingRegistro(colaboradorId?: string): MockRecord | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  return { id: `${c.id}-onboarding` };
}

export function getMockOnboardingTarefas(onboardingId?: string): MockRecord[] | undefined {
  if (!onboardingId) return undefined;
  const c = findMockColaborador(onboardingId.replace(/-onboarding$/, ''));
  if (!c) return undefined;
  return [
    { id: `${onboardingId}-tarefa-1`, titulo: 'Assinatura do contrato', concluida: true, data_conclusao: '2026-01-05', data_prazo: '2026-01-05' },
    { id: `${onboardingId}-tarefa-2`, titulo: 'Configuração de acessos e equipamentos', concluida: true, data_conclusao: '2026-01-06', data_prazo: '2026-01-06' },
    { id: `${onboardingId}-tarefa-3`, titulo: 'Treinamento de integração', concluida: false, data_prazo: '2026-10-01' },
  ];
}

// Jornada / Ponto
export function getMockPontoHoje(colaboradorId?: string): MockRecord | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  return {
    id: `${c.id}-ponto-hoje`,
    entrada_esperada: '08:00', saida_esperada: '17:00',
    entrada_1: '08:02', saida_1: '12:00', entrada_2: '13:00', saida_2: null,
    horas_trabalhadas: '04:58', horas_extras: '00:00', horas_falta: '00:00',
    atraso_minutos: 2, saida_antecipada_minutos: 0,
    saida_intervalo: null, retorno_intervalo: null,
  };
}

export function getMockRegistrosPontoSemana(colaboradorId?: string): MockRecord[] | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  return Array.from({ length: 5 }, (_, i) => {
    return {
      id: `${c.id}-ponto-dia-${i}`,
      data: formatDateLocalISO(addDaysLocal(new Date(), -(i + 1))),
      horas_trabalhadas: '08:00',
      horas_extras: i === 0 ? '00:45' : '00:00',
      atraso_minutos: i === 2 ? 8 : 0,
    };
  });
}

export function getMockSaldoBancoHoras(colaboradorId?: string): number | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  return 4.5;
}

export function getMockEscalaAtual(colaboradorId?: string): MockRecord | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  return { turno: { nome: 'Turno Comercial (08h–17h)' } };
}

export function getMockFaltas(colaboradorId?: string): MockRecord[] | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  return [{ id: `${c.id}-falta-1`, data: '2026-08-11', justificada: true }];
}

// SST — EPIs para todos; incidente/CAT/riscos só para um caso ilustrativo (mock-8)
export function getMockEpisEntregas(colaboradorId?: string): MockRecord[] | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  return [{ id: `${c.id}-epi-1`, data_devolucao: null, epi: { nome: 'Kit de Proteção Individual (Padrão)' } }];
}

export function getMockSstIncidentes(colaboradorId?: string): MockRecord[] | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  if (c.id === 'mock-8') {
    return [{ id: `${c.id}-inc-1`, data_hora: '2025-05-20T10:30:00Z', tipo: 'Quase acidente', gravidade: 'baixa', status: 'encerrado' }];
  }
  return [{ id: `${c.id}-inc-1`, data_hora: '2025-09-02T14:00:00Z', tipo: 'Observação de segurança', gravidade: 'baixa', status: 'encerrado' }];
}

export function getMockSstCat(colaboradorId?: string): MockRecord[] | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  if (c.id === 'mock-8') {
    return [{ id: `${c.id}-cat-1`, data_acidente: '2025-05-20', tipo_acidente: 'Típico', tipo_cat: 'Inicial', status_esocial: 'transmitido' }];
  }
  return [{ id: `${c.id}-cat-1`, data_acidente: c.data_admissao, tipo_acidente: 'Trajeto (sem afastamento)', tipo_cat: 'Comunicação', status_esocial: 'transmitido' }];
}

export function getMockSstRiscos(colaboradorId?: string): MockRecord[] | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  return [{ id: `${c.id}-risco-1`, agente_nocivo_codigo: '01.01.001', epi_eficaz: true, status_esocial: 'transmitido', data_inicio_exposicao: c.data_admissao, data_fim_exposicao: null }];
}

// Hierarquia — Lotações
export function getMockLotacoes(colaboradorId?: string): MockRecord[] | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  return [{ id: `${c.id}-lotacao-1`, nome: `Unidade ${c.cidade}/${c.uf}`, ativa: true }];
}

// Hierarquia — Local de Trabalho (chave = `colaborador.local_trabalho_id`, ver MOCK_COLABORADORES)
export function getMockLocalTrabalho(localTrabalhoId?: string): MockRecord | undefined {
  if (!localTrabalhoId?.startsWith('mock-local-')) return undefined;
  const c = findMockColaborador(localTrabalhoId.replace('mock-local-', ''));
  if (!c) return undefined;
  return { id: localTrabalhoId, nome: `Sede ${c.cidade}`, cidade: c.cidade, uf: c.uf };
}

// Hierarquia — Times da empresa (chave = `colaborador.time_id`, ver MOCK_COLABORADORES)
const MOCK_TIMES: MockRecord[] = [
  { id: 'mock-time-rh', nome: 'Time de Recursos Humanos' },
  { id: 'mock-time-tech', nome: 'Time de Tecnologia & Produto' },
  { id: 'mock-time-comercial', nome: 'Time Comercial' },
  { id: 'mock-time-ops', nome: 'Time de Operações, Financeiro & Marketing' },
];

export function getMockTimes(empresaId?: string): MockRecord[] {
  return MOCK_TIMES;
}

// Campos Customizados — definições da empresa (compartilhadas) + valores por colaborador
const MOCK_CAMPOS_CUSTOMIZADOS: MockRecord[] = [
  { id: 'mock-campo-camiseta', nome: 'Tamanho de Camiseta', tipo: 'selecao', secao: 'Geral', obrigatorio: false, opcoes: ['P', 'M', 'G', 'GG'], ordem: 1 },
  { id: 'mock-campo-obs-extra', nome: 'Observação Extra do RH', tipo: 'textarea', secao: 'Geral', obrigatorio: false, opcoes: null, ordem: 2 },
];

export function getMockCamposCustomizados(empresaId?: string): MockRecord[] {
  return MOCK_CAMPOS_CUSTOMIZADOS;
}

export function getMockValoresCamposCustomizados(colaboradorId?: string): MockRecord[] | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  return [{ campo_customizado_id: 'mock-campo-camiseta', valor: 'M' }];
}

// Vínculos — histórico de passagens/recontratação (tabela `vinculos`).
// Todos os 12 colaboradores fictícios têm 1 vínculo (a própria data_admissao);
// mock-3 tem 2, para exercitar o badge "2ª passagem" na listagem e no Dossiê.
const MOCK_DATA_DESLIGAMENTO_VINCULO_POR_ID: Record<string, string> = {
  'mock-8': '2025-03-15',
  'mock-11': '2024-05-20',
};

export function getMockVinculosPorColaborador(colaboradorId?: string): MockRecord[] | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;

  if (c.id === 'mock-3') {
    return [
      { id: `${c.id}-vinculo-1`, colaborador_id: c.id, tipo: 'Admissão', categoria: null, data_inicio: '2016-02-10', data_fim: '2018-06-30', matricula: 'MAT003-A', status: 'encerrado', created_at: '2016-02-10T09:00:00Z' },
      { id: `${c.id}-vinculo-2`, colaborador_id: c.id, tipo: 'Readmissão', categoria: null, data_inicio: c.data_admissao, data_fim: null, matricula: c.matricula, status: 'ativo', created_at: `${c.data_admissao}T09:00:00Z` },
    ];
  }

  const dataFim = MOCK_DATA_DESLIGAMENTO_VINCULO_POR_ID[c.id] ?? null;
  return [
    { id: `${c.id}-vinculo-1`, colaborador_id: c.id, tipo: 'Admissão', categoria: null, data_inicio: c.data_admissao, data_fim: dataFim, matricula: c.matricula, status: dataFim ? 'encerrado' : 'ativo', created_at: `${c.data_admissao}T09:00:00Z` },
  ];
}

export function getMockVinculosResumo(colaboradorIds: string[]): Record<string, MockRecord> | undefined {
  const relevantes = colaboradorIds.filter((id) => !!findMockColaborador(id));
  if (relevantes.length === 0) return undefined;

  const result: Record<string, MockRecord> = {};
  for (const id of relevantes) {
    const vinculos = getMockVinculosPorColaborador(id) || [];
    const ordenados = [...vinculos].sort((a, b) => String(a.data_inicio).localeCompare(String(b.data_inicio)));
    const aberto = ordenados.find((v) => !v.data_fim);
    result[id] = {
      quantidadePassagens: ordenados.length,
      quantidadeRecontratacoes: Math.max(ordenados.length - 1, 0),
      primeiraAdmissao: ordenados[0]?.data_inicio ?? null,
      admissaoAtual: (aberto ?? ordenados[ordenados.length - 1])?.data_inicio ?? null,
    };
  }
  return result;
}

// Timeline Funcional — agrega os geradores acima num único EventoTimeline[]
export function getMockTimelineFuncional(colaboradorId?: string): MockRecord[] | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  const vinculosCronologicos = [...(getMockVinculosPorColaborador(colaboradorId) || [])].sort((a, b) => String(a.data_inicio).localeCompare(String(b.data_inicio)));
  const eventos: MockRecord[] = [
    ...vinculosCronologicos.map((v, i) => ({
      data: v.data_inicio,
      tipo: i === 0 ? 'admissao_inicial' : 'recontratacao',
      titulo: i === 0 ? 'Admissão inicial' : `Recontratação (${i + 1}ª passagem)`,
      descricao: v.tipo,
      origem: 'vinculos',
    })),
    ...(getMockHistoricoSalarial(colaboradorId) || []).map(h => ({ data: h.data_vigencia, tipo: 'salario', titulo: 'Alteração salarial', descricao: h.motivo, origem: 'historico_salarial' })),
    ...(getMockTreinamentos(colaboradorId) || []).filter(t => t.presente).map(t => ({ data: t.created_at, tipo: 'treinamento', titulo: `Treinamento: ${t.treinamento.nome}`, origem: 'treinamento_participantes' })),
    ...(getMockFeedbacks(colaboradorId) || []).map(f => ({ data: f.created_at, tipo: 'avaliacao', titulo: `Feedback 360 (${f.performance})`, origem: 'feedbacks_360' })),
    ...(getMockFerias(colaboradorId) || []).map(f => ({ data: f.data_inicio, tipo: 'ferias', titulo: `Férias (${f.status})`, descricao: `${f.data_inicio} a ${f.data_fim}`, origem: 'ferias' })),
    ...(getMockMedidasDisciplinares(colaboradorId) || []).map(m => ({ data: m.data_ocorrencia, tipo: 'medida_disciplinar', titulo: `Medida disciplinar: ${m.tipo}`, descricao: m.gravidade, origem: 'medidas_disciplinares' })),
  ];
  return eventos.filter(e => !!e.data).sort((a, b) => String(b.data).localeCompare(String(a.data)));
}
