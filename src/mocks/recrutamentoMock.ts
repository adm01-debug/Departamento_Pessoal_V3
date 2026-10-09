/**
 * ============================================================================
 * MOCK VISUAL — área de Recrutamento & Seleção (rota `/recrutamento`).
 *
 * COBERTURA — TODAS as áreas e subáreas da tela:
 *   • Cabeçalho — "Nova Vaga": publicar cria a vaga no store em memória.
 *   • Pipeline (kanban) — 12 candidaturas nas 5 etapas (Triagem, Entrevista,
 *     Teste Técnico, Proposta, Contratado), filtro por vaga, seletor "mover
 *     etapa" do card e botão de contato do candidato.
 *   • Vagas — 5 vagas (abertas/fechada) com requisitos, contagem de candidatos,
 *     "Gerenciar Vaga" (abre o Pipeline já filtrado por ela), "Ver análises"
 *     (abre a aba Analytics), "Excluir vaga" e "Criar Nova Vaga".
 *   • Candidatos — 10 candidatos (contato, experiência, pretensão).
 *   • Analytics — os 4 KPIs (Vagas Abertas, Total Candidatos, Processos Ativos,
 *     Taxa de Conversão) e a "Distribuição por Etapa" são DERIVADOS deste store
 *     (`getMockAnalyticsRecrutamento`) — nenhum número fica chumbado na tela.
 *   • Dossiê do candidato — contato, etapa/score, timeline e "Avançar para
 *     Próxima Etapa".
 *   • Timeline do processo seletivo — entrevistas, testes e anotações de TODAS
 *     as 12 candidaturas: nenhum dossiê abre vazio.
 *
 * ESCRITAS EM MEMÓRIA (modo demonstração): mover etapa, avançar etapa, publicar
 * vaga, excluir vaga e registrar anotação acontecem no store deste arquivo — a
 * tela responde na hora e NADA vai ao Supabase (os ids são fictícios: gravar
 * criaria registros órfãos ou falharia por FK). O estado inicial volta no F5.
 * Ação sem equivalente visual no mock (envio de e-mail, por exemplo) usa
 * `simularAcaoRecrutamento()`, que apenas avisa que a ação é de demonstração.
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
  // Cópia a cada leitura: o store é mutável (publicar/excluir vaga) e o React
  // Query só troca o dado da tela quando a referência muda.
  return isRecrutamentoMockEnabled() ? VAGAS.map((v) => ({ ...v })) : undefined;
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
  // Cópia a cada leitura (store mutável — ver `getMockVagas`).
  return isRecrutamentoMockEnabled() ? CANDIDATOS.map((c) => ({ ...c })) : undefined;
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
// `updated_at` só existe quando a candidatura já se moveu de etapa no mock.
const CANDIDATURAS: {
  id: string;
  vaga_id: string;
  candidato_id: string;
  etapa: string;
  status: string;
  nota_geral: number | null;
  data: string;
  updated_at?: string;
}[] = [
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

/**
 * Campos de `candidaturas` que complementam cada card do kanban: quem conduz o
 * processo, o resumo do feedback, a data da entrevista e o prazo da próxima
 * etapa. Preenchidos para TODAS as candidaturas — o dossiê nunca mostra campo
 * vazio por falta de dado no mock.
 */
const DETALHES: Record<
  string,
  { feedback: string; entrevistador: string; data_entrevista: string | null; data_proxima_etapa: string | null }
> = {
  'mock-candt-1': { feedback: 'Currículo aderente; aguardando agendamento da entrevista.', entrevistador: 'Camila Prado (Tech Recruiter)', data_entrevista: null, data_proxima_etapa: '2026-08-12' },
  'mock-candt-2': { feedback: 'Perfil júnior; triagem documental em andamento.', entrevistador: 'Bruno Tavares (RH)', data_entrevista: null, data_proxima_etapa: '2026-07-28' },
  'mock-candt-3': { feedback: 'Experiência administrativa compatível com a vaga.', entrevistador: 'Bruno Tavares (RH)', data_entrevista: null, data_proxima_etapa: '2026-07-29' },
  'mock-candt-4': { feedback: 'Vaga encerrada: candidatura em espera para novas aberturas.', entrevistador: 'Camila Prado (Tech Recruiter)', data_entrevista: null, data_proxima_etapa: null },
  'mock-candt-5': { feedback: 'Boa comunicação; segue para entrevista técnica.', entrevistador: 'Camila Prado (Tech Recruiter)', data_entrevista: '2026-08-06', data_proxima_etapa: '2026-08-14' },
  'mock-candt-6': { feedback: 'Alinhamento de expectativa salarial pendente.', entrevistador: 'Bruno Tavares (RH)', data_entrevista: '2026-08-14', data_proxima_etapa: '2026-08-21' },
  'mock-candt-7': { feedback: 'Ótima aderência a People Analytics; avança para teste.', entrevistador: 'Bruno Tavares (RH)', data_entrevista: '2026-08-18', data_proxima_etapa: '2026-08-25' },
  'mock-candt-8': { feedback: 'Entrevista técnica aprovada; desafio enviado.', entrevistador: 'Diego Farias (Tech Lead)', data_entrevista: '2026-08-05', data_proxima_etapa: '2026-08-12' },
  'mock-candt-9': { feedback: 'Desafio de dados entregue no prazo.', entrevistador: 'Ana Beatriz (Data Lead)', data_entrevista: '2026-09-02', data_proxima_etapa: '2026-09-12' },
  'mock-candt-10': { feedback: 'Proposta enviada; aguardando retorno do candidato.', entrevistador: 'Ana Beatriz (Data Lead)', data_entrevista: '2026-09-02', data_proxima_etapa: '2026-09-15' },
  'mock-candt-11': { feedback: 'Proposta enviada com pretensão atendida.', entrevistador: 'Camila Prado (Tech Recruiter)', data_entrevista: '2026-08-04', data_proxima_etapa: '2026-09-01' },
  'mock-candt-12': { feedback: 'Proposta aceita; início previsto para 01/09.', entrevistador: 'Camila Prado (Tech Recruiter)', data_entrevista: '2026-08-05', data_proxima_etapa: null },
};

export function getMockCandidaturas(vagaId?: string): CandidaturaMock[] | undefined {
  if (!isRecrutamentoMockEnabled()) return undefined;
  return CANDIDATURAS
    .filter((c) => !vagaId || c.vaga_id === vagaId)
    .map((c) => {
      const candidato = CANDIDATOS.find((x) => x.id === c.candidato_id)!;
      const vaga = VAGAS.find((x) => x.id === c.vaga_id)!;
      const detalhe = DETALHES[c.id];
      return {
        id: c.id,
        empresa_id: EMPRESA,
        vaga_id: c.vaga_id,
        candidato_id: c.candidato_id,
        etapa: c.etapa,
        status: c.status,
        nota_geral: c.nota_geral,
        feedback: detalhe?.feedback ?? null,
        entrevistador: detalhe?.entrevistador ?? null,
        data_entrevista: detalhe?.data_entrevista ?? null,
        data_proxima_etapa: detalhe?.data_proxima_etapa ?? null,
        motivo_rejeicao: null,
        feedback_ia: null,
        historico_etapas: null,
        created_at: dt(c.data),
        updated_at: dt(c.updated_at ?? c.data),
        candidato: { ...candidato },
        vaga: { titulo: vaga?.titulo ?? 'Vaga removida', departamento: vaga?.departamento ?? '—' },
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
  'mock-candt-1': [
    { id: 'mock-candt-1-tl-1', candidatura_id: 'mock-candt-1', created_at: dt('2026-08-03'), type: 'anotacao', anotacao: 'Triagem concluída: 7 anos de experiência, currículo aderente à vaga sênior.', privada: false, usuario_id: null },
  ],
  'mock-candt-2': [
    { id: 'mock-candt-2-tl-2', candidatura_id: 'mock-candt-2', created_at: dt('2026-07-24'), type: 'anotacao', anotacao: 'Documentação pendente (comprovante de escolaridade).', privada: false, usuario_id: null },
    { id: 'mock-candt-2-tl-1', candidatura_id: 'mock-candt-2', created_at: dt('2026-07-19'), type: 'anotacao', anotacao: 'Candidatura recebida pelo LinkedIn; triagem inicial em andamento.', privada: false, usuario_id: null },
  ],
  'mock-candt-3': [
    { id: 'mock-candt-3-tl-1', candidatura_id: 'mock-candt-3', created_at: dt('2026-07-21'), type: 'anotacao', anotacao: 'Experiência administrativa compatível; solicitar referências.', privada: false, usuario_id: null },
  ],
  'mock-candt-4': [
    { id: 'mock-candt-4-tl-2', candidatura_id: 'mock-candt-4', created_at: dt('2026-07-31'), type: 'anotacao', anotacao: 'Vaga encerrada em 30/07: candidatura mantida em banco de talentos.', privada: false, usuario_id: null },
    { id: 'mock-candt-4-tl-1', candidatura_id: 'mock-candt-4', created_at: dt('2026-06-06'), type: 'anotacao', anotacao: 'Indicação interna; perfil comercial alinhado à vaga.', privada: false, usuario_id: null },
  ],
  'mock-candt-5': [
    { id: 'mock-candt-5-tl-2', candidatura_id: 'mock-candt-5', created_at: dt('2026-08-06'), type: 'entrevista', tipo: 'remoto', status: 'realizada', feedback: 'Boa comunicação técnica, domina TypeScript.', nota: 4, local_link: 'meet.google.com/abc-defg-hij', entrevistador_id: null, data_hora: dt('2026-08-06') },
    { id: 'mock-candt-5-tl-1', candidatura_id: 'mock-candt-5', created_at: dt('2026-08-04'), type: 'anotacao', anotacao: 'Currículo forte em React e Node. Avançar para entrevista técnica.', privada: false, usuario_id: null },
  ],
  'mock-candt-6': [
    { id: 'mock-candt-6-tl-2', candidatura_id: 'mock-candt-6', created_at: dt('2026-08-14'), type: 'entrevista', tipo: 'presencial', status: 'realizada', feedback: 'Conduziu bem as rotinas de RH; expectativa salarial acima da faixa.', nota: 3.5, local_link: null, entrevistador_id: null, data_hora: dt('2026-08-14') },
    { id: 'mock-candt-6-tl-1', candidatura_id: 'mock-candt-6', created_at: dt('2026-08-13'), type: 'anotacao', anotacao: 'Perfil híbrido; alinhar pretensão de R$ 6.500,00 com a faixa da vaga.', privada: false, usuario_id: null },
  ],
  'mock-candt-7': [
    { id: 'mock-candt-7-tl-2', candidatura_id: 'mock-candt-7', created_at: dt('2026-08-18'), type: 'entrevista', tipo: 'remoto', status: 'realizada', feedback: 'Excelente domínio de People Analytics e Power BI.', nota: 4.5, local_link: 'meet.google.com/xyz-uvw-rst', entrevistador_id: null, data_hora: dt('2026-08-18') },
    { id: 'mock-candt-7-tl-1', candidatura_id: 'mock-candt-7', created_at: dt('2026-08-15'), type: 'anotacao', anotacao: 'Candidatura via Gupy; 5 anos em RH com foco em indicadores.', privada: false, usuario_id: null },
  ],
  'mock-candt-8': [
    { id: 'mock-candt-8-tl-2', candidatura_id: 'mock-candt-8', created_at: dt('2026-08-08'), type: 'teste', nome_teste: 'Desafio Full Stack — API + Frontend', status: 'entregue', nota: 4.2, comentarios: 'Solução limpa, boa cobertura de testes.', data_envio: dt('2026-08-07'), data_entrega: dt('2026-08-09'), url_teste: null },
    { id: 'mock-candt-8-tl-1', candidatura_id: 'mock-candt-8', created_at: dt('2026-08-05'), type: 'entrevista', tipo: 'remoto', status: 'realizada', feedback: 'Sólida experiência em arquitetura de software.', nota: 4.5, local_link: null, entrevistador_id: null, data_hora: dt('2026-08-05') },
  ],
  'mock-candt-9': [
    { id: 'mock-candt-9-tl-3', candidatura_id: 'mock-candt-9', created_at: dt('2026-09-06'), type: 'teste', nome_teste: 'Case de Analytics — Funil de Recrutamento', status: 'entregue', nota: 4.8, comentarios: 'Modelagem impecável e insights acionáveis.', data_envio: dt('2026-09-05'), data_entrega: dt('2026-09-07'), url_teste: 'drive.google.com/mock-case-juliana' },
    { id: 'mock-candt-9-tl-2', candidatura_id: 'mock-candt-9', created_at: dt('2026-09-03'), type: 'entrevista', tipo: 'remoto', status: 'realizada', feedback: 'Domínio avançado de SQL e storytelling com dados.', nota: 4.8, local_link: 'meet.google.com/def-ghi-jkl', entrevistador_id: null, data_hora: dt('2026-09-03') },
    { id: 'mock-candt-9-tl-1', candidatura_id: 'mock-candt-9', created_at: dt('2026-09-05'), type: 'anotacao', anotacao: '6 anos em Data Science; aderência total aos requisitos (SQL, Python, ETL).', privada: false, usuario_id: null },
  ],
  'mock-candt-10': [
    { id: 'mock-candt-10-tl-3', candidatura_id: 'mock-candt-10', created_at: dt('2026-09-03'), type: 'teste', nome_teste: 'Análise Exploratória de Dados', status: 'entregue', nota: 4.7, comentarios: 'Excelente storytelling com dados.', data_envio: dt('2026-09-02'), data_entrega: dt('2026-09-04'), url_teste: null },
    { id: 'mock-candt-10-tl-2', candidatura_id: 'mock-candt-10', created_at: dt('2026-09-02'), type: 'entrevista', tipo: 'telefone', status: 'realizada', feedback: 'Alinhamento salarial ok.', nota: 4.6, local_link: null, entrevistador_id: null, data_hora: dt('2026-09-02') },
    { id: 'mock-candt-10-tl-1', candidatura_id: 'mock-candt-10', created_at: dt('2026-09-01'), type: 'anotacao', anotacao: 'Perfil sênior, ótima aderência a SQL/Python.', privada: false, usuario_id: null },
  ],
  'mock-candt-11': [
    { id: 'mock-candt-11-tl-3', candidatura_id: 'mock-candt-11', created_at: dt('2026-08-30'), type: 'anotacao', anotacao: 'Proposta de R$ 15.000,00 enviada — dentro da faixa aprovada para a vaga.', privada: false, usuario_id: null },
    { id: 'mock-candt-11-tl-2', candidatura_id: 'mock-candt-11', created_at: dt('2026-08-08'), type: 'teste', nome_teste: 'Desafio Full Stack — API + Frontend', status: 'entregue', nota: 4.9, comentarios: 'Referência de qualidade: testes, tipagem e DX.', data_envio: dt('2026-08-06'), data_entrega: dt('2026-08-09'), url_teste: null },
    { id: 'mock-candt-11-tl-1', candidatura_id: 'mock-candt-11', created_at: dt('2026-08-04'), type: 'entrevista', tipo: 'remoto', status: 'realizada', feedback: 'Referência técnica; liderou projetos de grande porte.', nota: 4.9, local_link: null, entrevistador_id: null, data_hora: dt('2026-08-04') },
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
  // Cópia a cada leitura: o store é mutável (avançar etapa/anotar) e o React
  // Query só troca o dado da tela quando a referência muda.
  return [...(TIMELINE[candidaturaId] ?? [])]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((item) => ({ ...item }));
}

/* ─── Analytics (derivado do store) ────────────────────────────────────────── */

/** Etapas na ordem do funil — a MESMA sequência exibida no kanban. */
const ETAPAS_RECRUTAMENTO = ['triagem', 'entrevista', 'teste', 'proposta', 'contratado'] as const;
export type EtapaRecrutamento = (typeof ETAPAS_RECRUTAMENTO)[number];

const ROTULO_ETAPA: Record<EtapaRecrutamento, string> = {
  triagem: 'Triagem',
  entrevista: 'Entrevista',
  teste: 'Teste Técnico',
  proposta: 'Proposta',
  contratado: 'Contratado',
};

/* ─── Escritas em memória (modo demonstração) ──────────────────────────────── */

/** Sequência de `updated_at` das escritas: mantém a ordenação coerente. */
let carimbo = 0;
const agora = () => new Date(Date.now() + carimbo++ * 1000).toISOString();
const proximaEtapa = (etapa: string): EtapaRecrutamento | null => {
  const i = ETAPAS_RECRUTAMENTO.indexOf((etapa || 'triagem') as EtapaRecrutamento);
  return i >= 0 && i < ETAPAS_RECRUTAMENTO.length - 1 ? ETAPAS_RECRUTAMENTO[i + 1] : null;
};

/**
 * Move a candidatura de etapa (seletor do card do kanban e "Avançar para
 * Próxima Etapa" do dossiê). Escreve SÓ no store deste arquivo; devolve a
 * candidatura atualizada para o chamador dar o feedback na tela. Fechar em
 * "Contratado" também preenche o score quando ele estava em branco — é o que o
 * RH faz no fluxo real ao concluir a seleção.
 */
export function moverCandidaturaMock(id: string, etapa: string): CandidaturaMock | undefined {
  if (!isRecrutamentoMockEnabled()) return undefined;
  const candidatura = CANDIDATURAS.find((c) => c.id === id);
  if (!candidatura) return undefined;
  candidatura.etapa = etapa;
  candidatura.status = etapa === 'contratado' ? 'contratado' : 'em_andamento';
  candidatura.updated_at = agora().slice(0, 10);
  if (etapa === 'contratado' && (candidatura.nota_geral ?? 0) < 4.5) candidatura.nota_geral = 4.5;
  return getMockCandidaturas()?.find((c) => c.id === id);
}

/** Resultado de `avancarEtapaCandidaturaMock` — a página usa para o feedback. */
export interface AvancoEtapaMock {
  ok: boolean;
  de?: EtapaRecrutamento;
  para?: EtapaRecrutamento;
  candidato?: string;
}

/**
 * "Avançar para Próxima Etapa" do dossiê: move para a etapa seguinte do funil e
 * registra a anotação correspondente na timeline. Na última etapa não há para
 * onde avançar — devolve `ok: false` para a página avisar o usuário.
 */
export function avancarEtapaCandidaturaMock(id: string): AvancoEtapaMock {
  if (!isRecrutamentoMockEnabled()) return { ok: false };
  const candidatura = CANDIDATURAS.find((c) => c.id === id);
  if (!candidatura) return { ok: false };
  const de = (candidatura.etapa || 'triagem') as EtapaRecrutamento;
  const para = proximaEtapa(de);
  if (!para) return { ok: false, de };
  moverCandidaturaMock(id, para);
  adicionarAnotacaoMock(id, `Etapa avançada de "${ROTULO_ETAPA[de]}" para "${ROTULO_ETAPA[para]}".`);
  const candidato = CANDIDATOS.find((c) => c.id === candidatura.candidato_id)?.nome;
  return { ok: true, de, para, candidato };
}

/**
 * Registra uma anotação na timeline do processo seletivo (mesma tabela
 * `recrutamento_anotacoes`, só que em memória).
 */
export function adicionarAnotacaoMock(candidaturaId: string, texto: string): TimelineItemMock | undefined {
  if (!isRecrutamentoMockEnabled()) return undefined;
  const item: TimelineItemMock = {
    id: `${candidaturaId}-tl-${Date.now()}`,
    candidatura_id: candidaturaId,
    created_at: agora(),
    type: 'anotacao',
    anotacao: texto,
    privada: false,
    usuario_id: null,
  };
  (TIMELINE[candidaturaId] ??= []).push(item);
  return item;
}

/** Dados aceitos por `publicarVagaMock` (o que o diálogo "Nova Vaga" coleta). */
export interface NovaVagaMock {
  titulo: string;
  departamento: string;
  modalidade: string;
  quantidade: number;
  requisitos: string;
}

/**
 * Publica uma vaga nova no store (diálogo "Nova Vaga" e botão "Criar Nova
 * Vaga"). Entra no TOPO da lista, que é como a tela ordena (`created_at` desc).
 */
export function publicarVagaMock(dados: NovaVagaMock): VagaMock | undefined {
  if (!isRecrutamentoMockEnabled()) return undefined;
  const iso = agora();
  const titulo = dados.titulo.trim();
  const vaga: VagaMock = {
    id: `mock-vaga-${Date.now()}`,
    empresa_id: EMPRESA,
    titulo,
    cargo: titulo,
    departamento: dados.departamento.trim() || 'Não informado',
    modalidade: dados.modalidade.trim() || 'Presencial',
    tipo_contrato: 'CLT',
    descricao: `Processo seletivo aberto para ${titulo}.`,
    requisitos: dados.requisitos.trim(),
    status: 'aberta',
    quantidade: dados.quantidade > 0 ? dados.quantidade : 1,
    faixa_salarial_min: 0,
    faixa_salarial_max: 0,
    data_abertura: iso.slice(0, 10),
    data_encerramento: null,
    beneficios_oferecidos: 'A combinar',
    responsavel_id: null,
    created_at: iso,
    updated_at: iso,
  };
  VAGAS.unshift(vaga);
  return { ...vaga };
}

/**
 * Exclui a vaga e as candidaturas dela (mesma cascata que o banco faria): sem
 * isso os cards do kanban ficariam apontando para uma vaga inexistente.
 */
export function excluirVagaMock(id: string): boolean {
  if (!isRecrutamentoMockEnabled()) return false;
  const i = VAGAS.findIndex((v) => v.id === id);
  if (i < 0) return false;
  const [removida] = VAGAS.splice(i, 1);
  for (let j = CANDIDATURAS.length - 1; j >= 0; j--) {
    if (CANDIDATURAS[j].vaga_id === removida.id) {
      delete TIMELINE[CANDIDATURAS[j].id];
      CANDIDATURAS.splice(j, 1);
    }
  }
  return true;
}

/* ─── Ações de demonstração (sem equivalente no mock) ──────────────────────── */

/**
 * Avisa que uma ação do modo demonstração foi apenas SIMULADA — usada no que
 * não tem efeito visual no mock (envio de e-mail, por exemplo). Devolve `true`
 * quando o mock está ligado, então o chamador só precisa de
 * `if (simularAcaoRecrutamento('...')) return;`.
 */
export function simularAcaoRecrutamento(acao: string): boolean {
  if (!isRecrutamentoMockEnabled()) return false;
  toast.info(`Modo demonstração: "${acao}" foi simulada — os dados de recrutamento são fictícios.`);
  return true;
}
