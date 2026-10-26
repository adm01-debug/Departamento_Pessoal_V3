import type { CandidaturaComRelacoes, VagaRow } from '@/types/recrutamento';

/**
 * Fixtures LOCAIS de teste (não são mocks da aplicação). Todos os campos
 * existem no schema real de `candidatos`/`candidaturas`.
 */
export function criarCandidatura(overrides: Partial<CandidaturaComRelacoes> = {}): CandidaturaComRelacoes {
  const base: CandidaturaComRelacoes = {
    id: 'cand-1',
    empresa_id: 'empresa-1',
    vaga_id: 'vaga-1',
    candidato_id: 'pessoa-1',
    etapa: 'triagem',
    status: 'em_andamento',
    nota_geral: 4.2,
    feedback: null,
    entrevistador: null,
    data_entrevista: null,
    data_proxima_etapa: null,
    motivo_rejeicao: null,
    feedback_ia: null,
    historico_etapas: null,
    created_at: '2026-08-01T12:00:00Z',
    updated_at: '2026-08-03T12:00:00Z',
    candidato: {
      id: 'pessoa-1',
      empresa_id: 'empresa-1',
      nome: 'Ana Souza',
      email: 'ana@email.com',
      telefone: '(11) 99999-0000',
      origem: 'LinkedIn',
      experiencia_anos: 7,
      pretensao_salarial: 15000,
      formacao: 'Computação',
      linkedin: null,
      cpf: null,
      curriculo_url: null,
      observacoes: null,
      created_at: '2026-08-01T12:00:00Z',
      updated_at: '2026-08-01T12:00:00Z',
    },
    vaga: { titulo: 'Desenvolvedor(a) Full Stack Sênior', departamento: 'Tecnologia' },
  };
  return { ...base, ...overrides };
}

export function criarVaga(overrides: Partial<VagaRow> = {}): VagaRow {
  return {
    id: 'vaga-1',
    empresa_id: 'empresa-1',
    titulo: 'Desenvolvedor(a) Full Stack Sênior',
    cargo: 'Desenvolvedor Full Stack',
    departamento: 'Tecnologia',
    modalidade: 'Remoto',
    tipo_contrato: 'CLT',
    descricao: null,
    requisitos: null,
    status: 'aberta',
    quantidade: 1,
    faixa_salarial_min: null,
    faixa_salarial_max: null,
    data_abertura: '2026-08-01',
    data_encerramento: null,
    beneficios_oferecidos: null,
    responsavel_id: null,
    created_at: '2026-08-01T12:00:00Z',
    updated_at: '2026-08-01T12:00:00Z',
    ...overrides,
  };
}
