/**
 * ============================================================================
 * MOCK VISUAL — área de Recrutamento & Seleção (rota `/recrutamento`).
 *
 * ESCOPO: somente apresentação/validação de LAYOUT — os 4 blocos das Analytics
 * (Vagas Abertas, Total Candidatos, Processos Ativos, Taxa de Conversão), as
 * abas Pipeline / Vagas / Candidatos / Analytics, o filtro por vaga e a
 * timeline do candidato no dossiê. Nenhuma linha vem do Supabase: os `useQuery`
 * de `RecrutamentoPage` e de `CandidatoTimeline` curto-circuitam aqui.
 *
 * ⚠️ SOMENTE LEITURA. Toda ESCRITA (mudar a etapa de uma candidatura, publicar
 * vaga) é BLOQUEADA por `bloquearEscritaRecrutamento()` — sem o guard, gravaria
 * registros órfãos com `empresa_id`/`vaga_id`/`candidato_id` fictícios (ou
 * falharia por FK).
 *
 * GATE (mesmo padrão de src/mocks/admissoesMock.ts, desligamentosMock.ts,
 * desempenhoMock.ts, premiacoesMock.ts, treinamentosMock.ts e
 * colaboradoresMock.ts): liga somente com as DUAS condições abaixo — logo, nunca
 * em produção:
 *   1. `import.meta.env.DEV` (build de desenvolvimento);
 *   2. `VITE_RECRUTAMENTO_MOCK=true` no `.env`/`.env.local`.
 * A guarda `MODE !== 'test'` é essencial: o Vitest carrega o mesmo `.env.local`
 * do `vite dev` — sem ela os testes receberiam estes dados fictícios.
 *
 * PARA DESATIVAR: defina `VITE_RECRUTAMENTO_MOCK=false` no `.env.local` e
 * reinicie o `vite dev`.
 * PARA REMOVER DE VEZ: apague este arquivo e os trechos marcados com
 * "MOCK VISUAL — ver src/mocks/recrutamentoMock.ts" em:
 *   - src/pages/RecrutamentoPage.tsx
 *   - src/components/recrutamento/CandidatoTimeline.tsx
 * ============================================================================
 */
import { toast } from 'sonner';
import { MOCK_EMPRESA } from './colaboradoresMock';

/** Ativa o mock apenas em dev e apenas com o opt-in explícito da env var. */
export function isRecrutamentoMockEnabled(): boolean {
  return import.meta.env.DEV && import.meta.env.MODE !== 'test' && import.meta.env.VITE_RECRUTAMENTO_MOCK === 'true';
}

const EMPRESA = MOCK_EMPRESA.id;
/** `created_at` ao meio-dia UTC evita o recuo de 1 dia ao exibir em UTC-3. */
const dt = (ymd: string) => `${ymd}T12:00:00Z`;

/* ─── Vagas (`vagas`) ──────────────────────────────────────────────────────── */

export interface VagaMock {
  id: string;
  empresa_id: string;
  titulo: string;
  cargo: string;
  departamento: string;
  modalidade: string;
  tipo_contrato: string;
  descricao: string;
  requisitos: string;
  status: string;
  quantidade: number;
  faixa_salarial_min: number;
  faixa_salarial_max: number;
  data_abertura: string;
  data_encerramento: string | null;
  beneficios_oferecidos: string;
  responsavel_id: string | null;
  created_at: string;
  updated_at: string;
}

const VAGAS: VagaMock[] = [
  { id: 'mock-vaga-1', empresa_id: EMPRESA, titulo: 'Desenvolvedor(a) Full Stack Sênior', cargo: 'Desenvolvedor Full Stack', departamento: 'Tecnologia', modalidade: 'Remoto', tipo_contrato: 'CLT', descricao: 'Desenvolvimento de aplicações web de alta performance.', requisitos: 'React, TypeScript, Node.js, PostgreSQL, AWS', status: 'aberta', quantidade: 2, faixa_salarial_min: 12000, faixa_salarial_max: 16000, data_abertura: '2026-08-01', data_encerramento: null, beneficios_oferecidos: 'Vale-refeição, Plano de saúde, Home office', responsavel_id: null, created_at: dt('2026-08-01'), updated_at: dt('2026-08-01') },
  { id: 'mock-vaga-2', empresa_id: EMPRESA, titulo: 'Analista de RH Pleno', cargo: 'Analista de Recursos Humanos', departamento: 'Recursos Humanos', modalidade: 'Híbrido', tipo_contrato: 'CLT', descricao: 'Atuação em recrutamento, desenvolvimento e People Analytics.', requisitos: 'Recrutamento, People Analytics, Excel avançado, Power BI', status: 'aberta', quantidade: 1, faixa_salarial_min: 5000, faixa_salarial_max: 7000, data_abertura: '2026-08-10', data_encerramento: null, beneficios_oferecidos: 'Vale-transporte, Plano odontológico', responsavel_id: null, created_at: dt('2026-08-10'), updated_at: dt('2026-08-10') },
  { id: 'mock-vaga-3', empresa_id: EMPRESA, titulo: 'Assistente Administrativo', cargo: 'Assistente Administrativo', departamento: 'Administrativo', modalidade: 'Presencial', tipo_contrato: 'CLT', descricao: 'Apoio administrativo à área de operações.', requisitos: 'Excel, Organização, Comunicação, Rotinas administrativas', status: 'aberta', quantidade: 3, faixa_salarial_min: 2500, faixa_salarial_max: 3200, data_abertura: '2026-07-15', data_encerramento: null, beneficios_oferecidos: 'Vale-refeição, Vale-transporte', responsavel_id: null, created_at: dt('2026-07-15'), updated_at: dt('2026-07-15') },
  { id: 'mock-vaga-4', empresa_id: EMPRESA, titulo: 'Vendedor(a) Interno', cargo: 'Vendedor', departamento: 'Comercial', modalidade: 'Híbrido', tipo_contrato: 'CLT', descricao: 'Prospecção e atendimento a clientes no mercado interno.', requisitos: 'CRM, Negociação, Metas, Atendimento', status: 'fechada', quantidade: 5, faixa_salarial_min: 2200, faixa_salarial_max: 2800, data_abertura: '2026-06-01', data_encerramento: '2026-07-30', beneficios_oferecidos: 'Comissão, Vale-refeição', responsavel_id: null, created_at: dt('2026-06-01'), updated_at: dt('2026-07-30') },
  { id: 'mock-vaga-5', empresa_id: EMPRESA, titulo: 'Analista de Dados', cargo: 'Analista de Dados', departamento: 'Tecnologia', modalidade: 'Remoto', tipo_contrato: 'PJ', descricao: 'Construção de dashboards e modelos analíticos.', requisitos: 'SQL, Power BI, Python, ETL', status: 'aberta', quantidade: 1, faixa_salarial_min: 9000, faixa_salarial_max: 12000, data_abertura: '2026-09-01', data_encerramento: null, beneficios_oferecidos: 'Plano de saúde, Home office', responsavel_id: null, created_at: dt('2026-09-01'), updated_at: dt('2026-09-01') },
];

export function getMockVagas(): VagaMock[] | undefined {
  return isRecrutamentoMockEnabled() ? VAGAS : undefined;
}

/* ─── Candidatos (`candidatos`) ────────────────────────────────────────────── */

export interface CandidatoMock {
  id: string;
  empresa_id: string;
  nome: string;
  email: string;
  telefone: string;
  origem: string;
  experiencia_anos: number;
  pretensao_salarial: number;
  formacao: string;
  linkedin: string | null;
  cpf: string | null;
  curriculo_url: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

const CANDIDATOS: CandidatoMock[] = [
  { id: 'mock-cand-1', empresa_id: EMPRESA, nome: 'Mariana Alves Rodrigues', email: 'mariana.alves@email.com', telefone: '(11) 98811-2233', origem: 'LinkedIn', experiencia_anos: 7, pretensao_salarial: 15000, formacao: 'Ciência da Computação', linkedin: 'linkedin.com/in/marianaalves', cpf: null, curriculo_url: null, observacoes: null, created_at: dt('2026-08-02'), updated_at: dt('2026-08-02') },
  { id: 'mock-cand-2', empresa_id: EMPRESA, nome: 'Bruno Carvalho Mendes', email: 'bruno.mendes@email.com', telefone: '(11) 99722-3344', origem: 'Indeed', experiencia_anos: 5, pretensao_salarial: 13000, formacao: 'Sistemas de Informação', linkedin: 'linkedin.com/in/brunomendes', cpf: null, curriculo_url: null, observacoes: null, created_at: dt('2026-08-04'), updated_at: dt('2026-08-04') },
  { id: 'mock-cand-3', empresa_id: EMPRESA, nome: 'Camila Ferreira Santos', email: 'camila.santos@email.com', telefone: '(21) 98233-4455', origem: 'Site', experiencia_anos: 4, pretensao_salarial: 6500, formacao: 'Psicologia', linkedin: null, cpf: null, curriculo_url: null, observacoes: null, created_at: dt('2026-08-12'), updated_at: dt('2026-08-12') },
  { id: 'mock-cand-4', empresa_id: EMPRESA, nome: 'Diego Nascimento Lima', email: 'diego.lima@email.com', telefone: '(31) 99344-5566', origem: 'Indicação', experiencia_anos: 6, pretensao_salarial: 14000, formacao: 'Engenharia de Software', linkedin: 'linkedin.com/in/diegolima', cpf: null, curriculo_url: null, observacoes: null, created_at: dt('2026-08-06'), updated_at: dt('2026-08-06') },
  { id: 'mock-cand-5', empresa_id: EMPRESA, nome: 'Larissa Martins Oliveira', email: 'larissa.oliveira@email.com', telefone: '(11) 98455-6677', origem: 'LinkedIn', experiencia_anos: 3, pretensao_salarial: 3000, formacao: 'Administração', linkedin: null, cpf: null, curriculo_url: null, observacoes: null, created_at: dt('2026-07-18'), updated_at: dt('2026-07-18') },
  { id: 'mock-cand-6', empresa_id: EMPRESA, nome: 'Rafael Souza Pereira', email: 'rafael.pereira@email.com', telefone: '(41) 99566-7788', origem: 'Site', experiencia_anos: 8, pretensao_salarial: 11000, formacao: 'Estatística', linkedin: 'linkedin.com/in/rafaelpereira', cpf: null, curriculo_url: null, observacoes: null, created_at: dt('2026-09-03'), updated_at: dt('2026-09-03') },
  { id: 'mock-cand-7', empresa_id: EMPRESA, nome: 'Patrícia Gomes Barbosa', email: 'patricia.barbosa@email.com', telefone: '(11) 98677-8899', origem: 'Gupy', experiencia_anos: 5, pretensao_salarial: 6000, formacao: 'Gestão de RH', linkedin: 'linkedin.com/in/patriciabarbosa', cpf: null, curriculo_url: null, observacoes: null, created_at: dt('2026-08-14'), updated_at: dt('2026-08-14') },
  { id: 'mock-cand-8', empresa_id: EMPRESA, nome: 'Thiago Ribeiro Costa', email: 'thiago.costa@email.com', telefone: '(19) 99788-9900', origem: 'Indeed', experiencia_anos: 2, pretensao_salarial: 2800, formacao: 'Administração', linkedin: null, cpf: null, curriculo_url: null, observacoes: null, created_at: dt('2026-07-20'), updated_at: dt('2026-07-20') },
  { id: 'mock-cand-9', empresa_id: EMPRESA, nome: 'Juliana Rocha Azevedo', email: 'juliana.azevedo@email.com', telefone: '(11) 98899-0011', origem: 'LinkedIn', experiencia_anos: 6, pretensao_salarial: 9500, formacao: 'Data Science', linkedin: 'linkedin.com/in/julianaazevedo', cpf: null, curriculo_url: null, observacoes: null, created_at: dt('2026-09-05'), updated_at: dt('2026-09-05') },
  { id: 'mock-cand-10', empresa_id: EMPRESA, nome: 'Gustavo Henrique Dias', email: 'gustavo.dias@email.com', telefone: '(51) 99900-1122', origem: 'Indicação', experiencia_anos: 4, pretensao_salarial: 3200, formacao: 'Logística', linkedin: null, cpf: null, curriculo_url: null, observacoes: null, created_at: dt('2026-06-05'), updated_at: dt('2026-06-05') },
];

export function getMockCandidatos(): CandidatoMock[] | undefined {
  return isRecrutamentoMockEnabled() ? CANDIDATOS : undefined;
}

/* ─── Candidaturas (`candidaturas` + embeds candidato/vaga) ────────────────── */

export interface CandidaturaMock {
  id: string;
  empresa_id: string;
  vaga_id: string;
  candidato_id: string;
  etapa: string;
  status: string;
  nota_geral: number | null;
  feedback: string | null;
  entrevistador: string | null;
  data_entrevista: string | null;
  data_proxima_etapa: string | null;
  motivo_rejeicao: string | null;
  feedback_ia: string | null;
  historico_etapas: null;
  created_at: string;
  updated_at: string;
  candidato: CandidatoMock;
  vaga: { titulo: string; departamento: string };
}

// 12 candidaturas distribuídas no kanban: 4 triagem, 3 entrevista, 2 teste,
// 2 proposta, 1 contratado. Alguns candidatos aplicam a mais de uma vaga.
const CANDIDATURAS: { id: string; vaga_id: string; candidato_id: string; etapa: string; status: string; nota_geral: number | null; data: string }[] = [
  { id: 'mock-candt-1', vaga_id: 'mock-vaga-1', candidato_id: 'mock-cand-1', etapa: 'triagem', status: 'em_andamento', nota_geral: null, data: '2026-08-03' },
  { id: 'mock-candt-2', vaga_id: 'mock-vaga-3', candidato_id: 'mock-cand-5', etapa: 'triagem', status: 'em_andamento', nota_geral: null, data: '2026-07-19' },
  { id: 'mock-candt-3', vaga_id: 'mock-vaga-3', candidato_id: 'mock-cand-8', etapa: 'triagem', status: 'em_andamento', nota_geral: null, data: '2026-07-21' },
  { id: 'mock-candt-4', vaga_id: 'mock-vaga-4', candidato_id: 'mock-cand-10', etapa: 'triagem', status: 'em_andamento', nota_geral: null, data: '2026-06-06' },
  { id: 'mock-candt-5', vaga_id: 'mock-vaga-1', candidato_id: 'mock-cand-2', etapa: 'entrevista', status: 'em_andamento', nota_geral: 4.0, data: '2026-08-05' },
  { id: 'mock-candt-6', vaga_id: 'mock-vaga-2', candidato_id: 'mock-cand-3', etapa: 'entrevista', status: 'em_andamento', nota_geral: 3.5, data: '2026-08-13' },
  { id: 'mock-candt-7', vaga_id: 'mock-vaga-2', candidato_id: 'mock-cand-7', etapa: 'entrevista', status: 'em_andamento', nota_geral: 4.5, data: '2026-08-15' },
  { id: 'mock-candt-8', vaga_id: 'mock-vaga-1', candidato_id: 'mock-cand-4', etapa: 'teste', status: 'em_andamento', nota_geral: 4.2, data: '2026-08-07' },
  { id: 'mock-candt-9', vaga_id: 'mock-vaga-5', candidato_id: 'mock-cand-9', etapa: 'teste', status: 'em_andamento', nota_geral: 4.8, data: '2026-09-06' },
  { id: 'mock-candt-10', vaga_id: 'mock-vaga-5', candidato_id: 'mock-cand-6', etapa: 'proposta', status: 'em_andamento', nota_geral: 4.6, data: '2026-09-04' },
  { id: 'mock-candt-11', vaga_id: 'mock-vaga-1', candidato_id: 'mock-cand-1', etapa: 'proposta', status: 'em_andamento', nota_geral: 4.9, data: '2026-08-03' },
  { id: 'mock-candt-12', vaga_id: 'mock-vaga-1', candidato_id: 'mock-cand-2', etapa: 'contratado', status: 'contratado', nota_geral: 5.0, data: '2026-08-05' },
];

export function getMockCandidaturas(vagaId?: string): CandidaturaMock[] | undefined {
  if (!isRecrutamentoMockEnabled()) return undefined;
  return CANDIDATURAS
    .filter((c) => !vagaId || c.vaga_id === vagaId)
    .map((c) => {
      const candidato = CANDIDATOS.find((x) => x.id === c.candidato_id)!;
      const vaga = VAGAS.find((x) => x.id === c.vaga_id)!;
      return {
        id: c.id,
        empresa_id: EMPRESA,
        vaga_id: c.vaga_id,
        candidato_id: c.candidato_id,
        etapa: c.etapa,
        status: c.status,
        nota_geral: c.nota_geral,
        feedback: null,
        entrevistador: null,
        data_entrevista: null,
        data_proxima_etapa: null,
        motivo_rejeicao: null,
        feedback_ia: null,
        historico_etapas: null,
        created_at: dt(c.data),
        updated_at: dt(c.data),
        candidato,
        vaga: { titulo: vaga.titulo, departamento: vaga.departamento },
      };
    });
}

/* ─── Timeline do candidato (`recrutamento_entrevistas/testes/anotacoes`) ──── */

export interface TimelineItemMock {
  id: string;
  candidatura_id: string;
  created_at: string;
  type: 'entrevista' | 'teste' | 'anotacao';
  // entrevista
  data_hora?: string;
  entrevistador_id?: string | null;
  feedback?: string | null;
  nota?: number | null;
  status?: string | null;
  tipo?: string | null;
  local_link?: string | null;
  // teste
  nome_teste?: string;
  comentarios?: string | null;
  data_entrega?: string | null;
  data_envio?: string | null;
  url_teste?: string | null;
  // anotacao
  anotacao?: string;
  privada?: boolean | null;
  usuario_id?: string | null;
}

const TIMELINE: Record<string, TimelineItemMock[]> = {
  'mock-candt-5': [
    { id: 'mock-candt-5-tl-2', candidatura_id: 'mock-candt-5', created_at: dt('2026-08-06'), type: 'entrevista', tipo: 'remoto', status: 'realizada', feedback: 'Boa comunicação técnica, domina TypeScript.', nota: 4, local_link: 'meet.google.com/abc-defg-hij', entrevistador_id: null, data_hora: dt('2026-08-06') },
    { id: 'mock-candt-5-tl-1', candidatura_id: 'mock-candt-5', created_at: dt('2026-08-04'), type: 'anotacao', anotacao: 'Currículo forte em React e Node. Avançar para entrevista técnica.', privada: false, usuario_id: null },
  ],
  'mock-candt-8': [
    { id: 'mock-candt-8-tl-2', candidatura_id: 'mock-candt-8', created_at: dt('2026-08-08'), type: 'teste', nome_teste: 'Desafio Full Stack — API + Frontend', status: 'entregue', nota: 4.2, comentarios: 'Solução limpa, boa cobertura de testes.', data_envio: dt('2026-08-07'), data_entrega: dt('2026-08-09'), url_teste: null },
    { id: 'mock-candt-8-tl-1', candidatura_id: 'mock-candt-8', created_at: dt('2026-08-05'), type: 'entrevista', tipo: 'remoto', status: 'realizada', feedback: 'Sólida experiência em arquitetura de software.', nota: 4.5, local_link: null, entrevistador_id: null, data_hora: dt('2026-08-05') },
  ],
  'mock-candt-10': [
    { id: 'mock-candt-10-tl-3', candidatura_id: 'mock-candt-10', created_at: dt('2026-09-03'), type: 'teste', nome_teste: 'Análise Exploratória de Dados', status: 'entregue', nota: 4.7, comentarios: 'Excelente storytelling com dados.', data_envio: dt('2026-09-02'), data_entrega: dt('2026-09-04'), url_teste: null },
    { id: 'mock-candt-10-tl-2', candidatura_id: 'mock-candt-10', created_at: dt('2026-09-02'), type: 'entrevista', tipo: 'telefone', status: 'realizada', feedback: 'Alinhamento salarial ok.', nota: 4.6, local_link: null, entrevistador_id: null, data_hora: dt('2026-09-02') },
    { id: 'mock-candt-10-tl-1', candidatura_id: 'mock-candt-10', created_at: dt('2026-09-01'), type: 'anotacao', anotacao: 'Perfil sênior, ótima aderência a SQL/Python.', privada: false, usuario_id: null },
  ],
  'mock-candt-12': [
    { id: 'mock-candt-12-tl-4', candidatura_id: 'mock-candt-12', created_at: dt('2026-08-10'), type: 'anotacao', anotacao: 'Proposta enviada e aceita: R$ 13.000,00. Início previsto em 01/09.', privada: false, usuario_id: null },
    { id: 'mock-candt-12-tl-3', candidatura_id: 'mock-candt-12', created_at: dt('2026-08-07'), type: 'teste', nome_teste: 'Desafio Full Stack — API + Frontend', status: 'entregue', nota: 4.5, comentarios: 'Boa modelagem e testes automatizados.', data_envio: dt('2026-08-06'), data_entrega: dt('2026-08-08'), url_teste: null },
    { id: 'mock-candt-12-tl-2', candidatura_id: 'mock-candt-12', created_at: dt('2026-08-05'), type: 'entrevista', tipo: 'remoto', status: 'realizada', feedback: 'Excelente fit cultural e técnico.', nota: 4.2, local_link: null, entrevistador_id: null, data_hora: dt('2026-08-05') },
    { id: 'mock-candt-12-tl-1', candidatura_id: 'mock-candt-12', created_at: dt('2026-08-01'), type: 'anotacao', anotacao: 'Aprovado em todas as etapas do processo seletivo.', privada: false, usuario_id: null },
  ],
};

/** Réplica do `Promise.all` de `CandidatoTimeline`, já mesclada e ordenada desc. */
export function getMockTimeline(candidaturaId: string): TimelineItemMock[] | undefined {
  if (!isRecrutamentoMockEnabled()) return undefined;
  return [...(TIMELINE[candidaturaId] ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

/* ─── Guard de escrita (modo demo) ─────────────────────────────────────────── */

/**
 * Bloqueia uma ação de ESCRITA enquanto o mock estiver ligado.
 *
 * Os registros são fictícios (`empresa_id`/`vaga_id`/`candidato_id` não existem
 * no banco): gravar criaria lixo, falharia por FK ou deixaria registros órfãos.
 * Devolve `true` quando a ação deve ser ABORTADA, então o chamador só precisa de
 * `if (bloquearEscritaRecrutamento('...')) return;`.
 */
export function bloquearEscritaRecrutamento(acao: string): boolean {
  if (!isRecrutamentoMockEnabled()) return false;
  toast.info(`Modo demonstração: "${acao}" não é gravado — os dados de recrutamento exibidos são fictícios.`);
  return true;
}
