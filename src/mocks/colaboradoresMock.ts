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

// Tipado solto (não como Colaborador[]) porque o status "ferias" é usado pela
// UI (ColaboradorStatus/StatusBadge) mas não existe no union type de status.
export const MOCK_COLABORADORES = [
  { id: 'mock-1', nome_completo: 'Ana Beatriz Souza', cpf: '111.222.333-44', email: 'ana.souza@promobrindes.com.br', telefone: '(11) 98888-1001', status: 'ativo', cargo: 'Analista de RH', cbo: '2524-05', departamento: 'Recursos Humanos', centro_custo: 'CC-050 Recursos Humanos', local_trabalho_id: 'mock-local-mock-1', time_id: 'mock-time-rh', empresa_id: 'mock', matricula: 'MAT001', data_admissao: '2021-03-15', salario_base: 4500, cidade: 'São Paulo', uf: 'SP', jornada_semanal: 44, horario_entrada: '08:00', horario_saida: '17:00', horario_intervalo: '12:00-13:00', observacoes: 'Colaboradora destaque no programa de integração de 2023.' },
  { id: 'mock-2', nome_completo: 'Carlos Eduardo Lima', cpf: '222.333.444-55', email: 'carlos.lima@promobrindes.com.br', telefone: '(41) 98888-1002', status: 'ativo', cargo: 'Desenvolvedor Frontend', cbo: '2124-05', departamento: 'Tecnologia', centro_custo: 'CC-300 Tecnologia', local_trabalho_id: 'mock-local-mock-2', time_id: 'mock-time-tech', empresa_id: 'mock', matricula: 'MAT002', data_admissao: '2022-06-01', salario_base: 6200, cidade: 'Curitiba', uf: 'PR', jornada_semanal: 44, horario_entrada: '08:00', horario_saida: '17:00', horario_intervalo: '12:00-13:00', observacoes: 'Certificação React concluída em 2024.' },
  { id: 'mock-3', nome_completo: 'Fernanda Costa Ribeiro', cpf: '333.444.555-66', email: 'fernanda.ribeiro@promobrindes.com.br', telefone: '(11) 98888-1003', status: 'ferias', cargo: 'Coordenadora Financeira', cbo: '2521-05', departamento: 'Financeiro', centro_custo: 'CC-200 Financeiro', local_trabalho_id: 'mock-local-mock-3', time_id: 'mock-time-ops', empresa_id: 'mock', matricula: 'MAT003', data_admissao: '2019-11-10', salario_base: 8500, cidade: 'São Paulo', uf: 'SP', jornada_semanal: 44, horario_entrada: '08:00', horario_saida: '17:00', horario_intervalo: '12:00-13:00', observacoes: 'Retorno de férias previsto para o próximo mês.' },
  { id: 'mock-4', nome_completo: 'Gustavo Henrique Alves', cpf: '444.555.666-77', email: 'gustavo.alves@promobrindes.com.br', telefone: '(19) 98888-1004', status: 'ativo', cargo: 'Vendedor Externo', cbo: '5211-15', departamento: 'Comercial', centro_custo: 'CC-100 Comercial', local_trabalho_id: 'mock-local-mock-4', time_id: 'mock-time-comercial', empresa_id: 'mock', matricula: 'MAT004', data_admissao: '2023-01-20', salario_base: 3800, cidade: 'Campinas', uf: 'SP', jornada_semanal: 44, horario_entrada: '08:00', horario_saida: '17:00', horario_intervalo: '12:00-13:00', observacoes: 'Em período de experiência — bom desempenho nas primeiras vendas.' },
  { id: 'mock-5', nome_completo: 'Juliana Pereira Martins', cpf: '555.666.777-88', email: 'juliana.martins@promobrindes.com.br', telefone: '(11) 98888-1005', status: 'afastado', cargo: 'Assistente Administrativo', cbo: '4110-10', departamento: 'Administrativo', centro_custo: 'CC-010 Administrativo', local_trabalho_id: 'mock-local-mock-5', time_id: 'mock-time-ops', empresa_id: 'mock', matricula: 'MAT005', data_admissao: '2020-08-05', salario_base: 3200, cidade: 'São Paulo', uf: 'SP', jornada_semanal: 44, horario_entrada: '08:00', horario_saida: '17:00', horario_intervalo: '12:00-13:00', observacoes: 'Afastamento médico — previsão de retorno em avaliação.' },
  { id: 'mock-6', nome_completo: 'Lucas Gabriel Fernandes', cpf: '666.777.888-99', email: 'lucas.fernandes@promobrindes.com.br', telefone: '(31) 98888-1006', status: 'ativo', cargo: 'Designer Gráfico', cbo: '2624-10', departamento: 'Marketing', centro_custo: 'CC-400 Marketing', local_trabalho_id: 'mock-local-mock-6', time_id: 'mock-time-ops', empresa_id: 'mock', matricula: 'MAT006', data_admissao: '2022-02-14', salario_base: 4100, cidade: 'Belo Horizonte', uf: 'MG', jornada_semanal: 44, horario_entrada: '08:00', horario_saida: '17:00', horario_intervalo: '12:00-13:00', observacoes: 'Responsável pela identidade visual das campanhas sazonais.' },
  { id: 'mock-7', nome_completo: 'Mariana Oliveira Santos', cpf: '777.888.999-00', email: 'mariana.santos@promobrindes.com.br', telefone: '(11) 98888-1007', status: 'ativo', cargo: 'Gerente de Produto', cbo: '1425-15', departamento: 'Produto', centro_custo: 'CC-310 Produto', local_trabalho_id: 'mock-local-mock-7', time_id: 'mock-time-tech', empresa_id: 'mock', matricula: 'MAT007', data_admissao: '2018-05-22', salario_base: 11500, cidade: 'São Paulo', uf: 'SP', jornada_semanal: 44, horario_entrada: '08:00', horario_saida: '17:00', horario_intervalo: '12:00-13:00', observacoes: 'Líder do time de produto desde 2020.' },
  { id: 'mock-8', nome_completo: 'Pedro Henrique Barbosa', cpf: '888.999.000-11', email: 'pedro.barbosa@promobrindes.com.br', telefone: '(11) 98888-1008', status: 'desligado', cargo: 'Estoquista', cbo: '4141-15', departamento: 'Logística', centro_custo: 'CC-500 Logística', local_trabalho_id: 'mock-local-mock-8', time_id: 'mock-time-ops', empresa_id: 'mock', matricula: 'MAT008', data_admissao: '2020-01-10', salario_base: 2400, cidade: 'Guarulhos', uf: 'SP', jornada_semanal: 44, horario_entrada: '08:00', horario_saida: '17:00', horario_intervalo: '12:00-13:00', observacoes: 'Desligamento em 2025 — pedido de demissão.' },
  { id: 'mock-9', nome_completo: 'Rafaela Cristina Gomes', cpf: '999.000.111-22', email: 'rafaela.gomes@promobrindes.com.br', telefone: '(11) 98888-1009', status: 'ativo', cargo: 'Analista Fiscal', cbo: '2523-05', departamento: 'Financeiro', centro_custo: 'CC-200 Financeiro', local_trabalho_id: 'mock-local-mock-9', time_id: 'mock-time-ops', empresa_id: 'mock', matricula: 'MAT009', data_admissao: '2021-09-30', salario_base: 5300, cidade: 'São Paulo', uf: 'SP', jornada_semanal: 44, horario_entrada: '08:00', horario_saida: '17:00', horario_intervalo: '12:00-13:00', observacoes: 'Colaboradora PCD — sem restrições para as funções do cargo.' },
  { id: 'mock-10', nome_completo: 'Thiago Almeida Rocha', cpf: '000.111.222-33', email: 'thiago.rocha@promobrindes.com.br', telefone: '(48) 98888-1010', status: 'ativo', cargo: 'Desenvolvedor Backend', cbo: '2124-05', departamento: 'Tecnologia', centro_custo: 'CC-300 Tecnologia', local_trabalho_id: 'mock-local-mock-10', time_id: 'mock-time-tech', empresa_id: 'mock', matricula: 'MAT010', data_admissao: '2023-04-18', salario_base: 6800, cidade: 'Florianópolis', uf: 'SC', jornada_semanal: 44, horario_entrada: '08:00', horario_saida: '17:00', horario_intervalo: '12:00-13:00', observacoes: 'Especialista em integrações e APIs.' },
  { id: 'mock-11', nome_completo: 'Vanessa Rodrigues Dias', cpf: '123.456.789-00', email: 'vanessa.dias@promobrindes.com.br', telefone: '(11) 98888-1011', status: 'desligado', cargo: 'Recepcionista', cbo: '4221-05', departamento: 'Administrativo', centro_custo: 'CC-010 Administrativo', local_trabalho_id: 'mock-local-mock-11', time_id: 'mock-time-ops', empresa_id: 'mock', matricula: 'MAT011', data_admissao: '2019-07-08', salario_base: 2100, cidade: 'São Paulo', uf: 'SP', jornada_semanal: 44, horario_entrada: '08:00', horario_saida: '17:00', horario_intervalo: '12:00-13:00', observacoes: 'Desligamento em 2024 — fim de contrato.' },
  { id: 'mock-12', nome_completo: 'William Nunes Cardoso', cpf: '234.567.890-11', email: 'william.cardoso@promobrindes.com.br', telefone: '(21) 98888-1012', status: 'ativo', cargo: 'Supervisor Comercial', cbo: '3541-10', departamento: 'Comercial', centro_custo: 'CC-100 Comercial', local_trabalho_id: 'mock-local-mock-12', time_id: 'mock-time-comercial', empresa_id: 'mock', matricula: 'MAT012', data_admissao: '2020-12-01', salario_base: 7200, cidade: 'Rio de Janeiro', uf: 'RJ', jornada_semanal: 44, horario_entrada: '08:00', horario_saida: '17:00', horario_intervalo: '12:00-13:00', observacoes: 'Responsável pela equipe de vendas da região Sudeste.' },
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

export function getMockDependentes(colaboradorId?: string): MockRecord[] | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  return [
    { id: `${c.id}-dep-1`, nome: `${lastName(c.nome_completo)} Filho(a)`, parentesco: 'Filho(a)', cpf: `${c.cpf.slice(0, -2)}05`, data_nascimento: '2016-05-10', ir: true, salario_familia: false, incapacidade_fisica_mental: false },
  ];
}

export function getMockContatosEmergencia(colaboradorId?: string): MockRecord[] | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  return [
    { id: `${c.id}-emerg-1`, nome: `Familiar de ${firstName(c.nome_completo)}`, parentesco: 'Pai/Mãe', telefone: '(11) 3333-4444', celular: '(11) 99999-8888', email: `familiar.${firstName(c.nome_completo).toLowerCase()}@example.com` },
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

export function getMockPeriodosAquisitivos(colaboradorId?: string): MockRecord[] | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  return [
    { id: `${c.id}-aquis-1`, inicio_aquisitivo: '2024-01-01', fim_aquisitivo: '2024-12-31', inicio_concessivo: '2025-01-01', fim_concessivo: '2025-12-31', saldo_atual: 30, faltas_periodo: 0, status: 'em_aberto' },
  ];
}

export function getMockContasBancarias(colaboradorId?: string): MockRecord[] | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  return [
    { id: `${c.id}-conta-1`, banco_codigo: '341', banco_nome: 'Itaú Unibanco', agencia: '1234', conta: '56789-0', tipo_conta: 'Corrente', pix_tipo: 'Email', pix_chave: c.email, principal: true },
  ];
}

export function getMockDocumentosPessoais(colaboradorId?: string): MockRecord[] | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  return [
    { id: `${c.id}-doc-rg`, tipo_documento: 'RG', numero: '00.000.000-0', orgao_emissor: 'SSP/SP', data_emissao: '2010-03-10', data_validade: null },
    { id: `${c.id}-doc-cpf`, tipo_documento: 'CPF', numero: c.cpf, orgao_emissor: 'Receita Federal', data_emissao: '2008-01-15', data_validade: null },
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
  ];
}

// Holerites
export function getMockHolerites(colaboradorId?: string): MockRecord[] | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  const salario = (c as any).salario_base || 3000;
  return [
    { id: `${c.id}-hol-1`, competencia: '2026-07', total_proventos: salario, total_liquido: Math.round(salario * 0.82), assinado: true, created_at: '2026-08-01' },
    { id: `${c.id}-hol-2`, competencia: '2026-08', total_proventos: salario, total_liquido: Math.round(salario * 0.82), assinado: false, created_at: '2026-09-01' },
  ];
}

// Afastamentos — todo colaborador tem 1 afastamento em andamento (para a seção
// "Situação Atual") + 1 concluído no histórico dos últimos 12 meses.
export function getMockAfastamentos(colaboradorId?: string): MockRecord[] | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  const tipoAtual = c.status === 'afastado' ? 'Auxílio-doença' : 'Licença Médica (curta duração)';
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
