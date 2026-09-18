import { Colaborador } from '@/types/entities';

// ============================================================================
// MOCK TEMPORÁRIO — dados fictícios apenas para pré-visualizar o layout
// (lista de Colaboradores e o Dossiê/"Ver Perfil"). Não escreve no banco.
//
// Usado por:
//   - src/pages/ColaboradoresPage.tsx
//   - src/pages/ColaboradorDetalhesPage.tsx
//
// Para voltar a usar dados reais: defina MOCK_MODE = false, ou apague este
// arquivo e reverta os imports/usos de MOCK_MODE nas duas páginas acima.
//
// As sub-abas do dossiê (Dependentes, Histórico Salarial, ASO, Contas
// Bancárias, Benefícios, Documentos, Histórico de Auditoria, etc.) também são
// mockadas — ver os geradores `getMock*` no fim deste arquivo — e os hooks
// que os usam (useColaboradorDetalhes, useTabelasReferencia,
// useHistoricoContratos, useBeneficiosColaborador, useDocumentos e o
// ColaboradorHistory).
//
// ⚠️ Os botões "Adicionar/Salvar" dessas sub-abas continuam chamando as
// mutations reais (gravam no Supabase de verdade). Evite usá-los em um perfil
// fictício (id começando com "mock-"): o insert pode falhar por violação de
// FK, ou — se a tabela não tiver FK — criar um registro órfão apontando para
// um colaborador_id inexistente.
// ============================================================================
export const MOCK_MODE = true;

// Tipado solto (não como Colaborador[]) porque o status "ferias" é usado pela
// UI (ColaboradorStatus/StatusBadge) mas não existe no union type de status.
export const MOCK_COLABORADORES = [
  { id: 'mock-1', nome_completo: 'Ana Beatriz Souza', cpf: '111.222.333-44', email: 'ana.souza@promobrindes.com.br', status: 'ativo', cargo: 'Analista de RH', departamento: 'Recursos Humanos', empresa_id: 'mock', matricula: 'MAT001', data_admissao: '2021-03-15', salario_base: 4500, cidade: 'São Paulo', uf: 'SP', observacoes: 'Colaboradora destaque no programa de integração de 2023.' },
  { id: 'mock-2', nome_completo: 'Carlos Eduardo Lima', cpf: '222.333.444-55', email: 'carlos.lima@promobrindes.com.br', status: 'ativo', cargo: 'Desenvolvedor Frontend', departamento: 'Tecnologia', empresa_id: 'mock', matricula: 'MAT002', data_admissao: '2022-06-01', salario_base: 6200, cidade: 'Curitiba', uf: 'PR', observacoes: 'Certificação React concluída em 2024.' },
  { id: 'mock-3', nome_completo: 'Fernanda Costa Ribeiro', cpf: '333.444.555-66', email: 'fernanda.ribeiro@promobrindes.com.br', status: 'ferias', cargo: 'Coordenadora Financeira', departamento: 'Financeiro', empresa_id: 'mock', matricula: 'MAT003', data_admissao: '2019-11-10', salario_base: 8500, cidade: 'São Paulo', uf: 'SP', observacoes: 'Retorno de férias previsto para o próximo mês.' },
  { id: 'mock-4', nome_completo: 'Gustavo Henrique Alves', cpf: '444.555.666-77', email: 'gustavo.alves@promobrindes.com.br', status: 'ativo', cargo: 'Vendedor Externo', departamento: 'Comercial', empresa_id: 'mock', matricula: 'MAT004', data_admissao: '2023-01-20', salario_base: 3800, cidade: 'Campinas', uf: 'SP', observacoes: '' },
  { id: 'mock-5', nome_completo: 'Juliana Pereira Martins', cpf: '555.666.777-88', email: 'juliana.martins@promobrindes.com.br', status: 'afastado', cargo: 'Assistente Administrativo', departamento: 'Administrativo', empresa_id: 'mock', matricula: 'MAT005', data_admissao: '2020-08-05', salario_base: 3200, cidade: 'São Paulo', uf: 'SP', observacoes: 'Afastamento médico — previsão de retorno em avaliação.' },
  { id: 'mock-6', nome_completo: 'Lucas Gabriel Fernandes', cpf: '666.777.888-99', email: 'lucas.fernandes@promobrindes.com.br', status: 'ativo', cargo: 'Designer Gráfico', departamento: 'Marketing', empresa_id: 'mock', matricula: 'MAT006', data_admissao: '2022-02-14', salario_base: 4100, cidade: 'Belo Horizonte', uf: 'MG', observacoes: '' },
  { id: 'mock-7', nome_completo: 'Mariana Oliveira Santos', cpf: '777.888.999-00', email: 'mariana.santos@promobrindes.com.br', status: 'ativo', cargo: 'Gerente de Produto', departamento: 'Produto', empresa_id: 'mock', matricula: 'MAT007', data_admissao: '2018-05-22', salario_base: 11500, cidade: 'São Paulo', uf: 'SP', observacoes: 'Líder do time de produto desde 2020.' },
  { id: 'mock-8', nome_completo: 'Pedro Henrique Barbosa', cpf: '888.999.000-11', email: 'pedro.barbosa@promobrindes.com.br', status: 'desligado', cargo: 'Estoquista', departamento: 'Logística', empresa_id: 'mock', matricula: 'MAT008', data_admissao: '2020-01-10', salario_base: 2400, cidade: 'Guarulhos', uf: 'SP', observacoes: 'Desligamento em 2025 — pedido de demissão.' },
  { id: 'mock-9', nome_completo: 'Rafaela Cristina Gomes', cpf: '999.000.111-22', email: 'rafaela.gomes@promobrindes.com.br', status: 'ativo', cargo: 'Analista Fiscal', departamento: 'Financeiro', empresa_id: 'mock', matricula: 'MAT009', data_admissao: '2021-09-30', salario_base: 5300, cidade: 'São Paulo', uf: 'SP', observacoes: '' },
  { id: 'mock-10', nome_completo: 'Thiago Almeida Rocha', cpf: '000.111.222-33', email: 'thiago.rocha@promobrindes.com.br', status: 'ativo', cargo: 'Desenvolvedor Backend', departamento: 'Tecnologia', empresa_id: 'mock', matricula: 'MAT010', data_admissao: '2023-04-18', salario_base: 6800, cidade: 'Florianópolis', uf: 'SC', observacoes: 'Especialista em integrações e APIs.' },
  { id: 'mock-11', nome_completo: 'Vanessa Rodrigues Dias', cpf: '123.456.789-00', email: 'vanessa.dias@promobrindes.com.br', status: 'desligado', cargo: 'Recepcionista', departamento: 'Administrativo', empresa_id: 'mock', matricula: 'MAT011', data_admissao: '2019-07-08', salario_base: 2100, cidade: 'São Paulo', uf: 'SP', observacoes: 'Desligamento em 2024 — fim de contrato.' },
  { id: 'mock-12', nome_completo: 'William Nunes Cardoso', cpf: '234.567.890-11', email: 'william.cardoso@promobrindes.com.br', status: 'ativo', cargo: 'Supervisor Comercial', departamento: 'Comercial', empresa_id: 'mock', matricula: 'MAT012', data_admissao: '2020-12-01', salario_base: 7200, cidade: 'Rio de Janeiro', uf: 'RJ', observacoes: 'Responsável pela equipe de vendas da região Sudeste.' },
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
    { id: `${c.id}-dep-1`, nome: `${lastName(c.nome_completo)} Filho(a)`, parentesco: 'Filho(a)', cpf: '', data_nascimento: '2016-05-10', ir: true, salario_familia: false, incapacidade_fisica_mental: false },
  ];
}

export function getMockContatosEmergencia(colaboradorId?: string): MockRecord[] | undefined {
  const c = findMockColaborador(colaboradorId);
  if (!c) return undefined;
  return [
    { id: `${c.id}-emerg-1`, nome: `Familiar de ${firstName(c.nome_completo)}`, parentesco: 'Pai/Mãe', telefone: '(11) 3333-4444', celular: '(11) 99999-8888', email: '' },
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

// Dados "singleton" — só preenchidos para alguns colaboradores fictícios
// (nem todo colaborador é estrangeiro/PCD/estagiário/em período de
// experiência; os demais mostram o estado vazio normal da aba).
export function getMockPeriodoExperiencia(colaboradorId?: string): MockRecord | null | undefined {
  if (colaboradorId === 'mock-4' || colaboradorId === 'mock-10') {
    const c = findMockColaborador(colaboradorId)!;
    return { data_inicio: c.data_admissao, primeira_etapa_fim: '2023-03-06', segunda_etapa_fim: '2023-04-20', tipo: '45+45', status: 'em_andamento' };
  }
  if (findMockColaborador(colaboradorId)) return null;
  return undefined;
}

export function getMockDadosEstrangeiro(colaboradorId?: string): MockRecord | null | undefined {
  if (colaboradorId === 'mock-2') {
    return { pais_origem: 'Portugal', tipo_visto: 'Permanente (casamento)', data_chegada: '2021-11-01', reside_brasil: true };
  }
  if (findMockColaborador(colaboradorId)) return null;
  return undefined;
}

export function getMockDeficiencia(colaboradorId?: string): MockRecord | null | undefined {
  if (colaboradorId === 'mock-9') {
    return { tipo: 'Auditiva', cid: 'H90', descricao: 'Uso de aparelho auditivo bilateral', observacoes: 'Sem restrições para as funções do cargo.' };
  }
  if (findMockColaborador(colaboradorId)) return null;
  return undefined;
}

export function getMockDadosEstagiario(colaboradorId?: string): MockRecord | null | undefined {
  if (findMockColaborador(colaboradorId)) return null;
  return undefined;
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
