/**
 * ============================================================================
 * MOCK VISUAL — área de Pesquisas de Clima & eNPS (rota `/pesquisas-clima`).
 *
 * ESCOPO: somente apresentação/validação de LAYOUT — os 4 KPIs (Total, Ativas,
 * Encerradas, Respostas Total) e a grade de cards de pesquisas. Nenhuma linha
 * vem do Supabase: o `useQuery` de `PesquisasClimaPage` curto-circuita aqui.
 *
 * ⚠️ SOMENTE LEITURA. Toda ESCRITA (criar, excluir, ativar pesquisa) é
 * BLOQUEADA por `bloquearEscritaPesquisas()` — sem o guard, gravaria registros
 * órfãos com `empresa_id` fictício (ou falharia por FK).
 *
 * GATE (mesmo padrão de src/mocks/admissoesMock.ts, desligamentosMock.ts,
 * desempenhoMock.ts, premiacoesMock.ts, treinamentosMock.ts, recrutamentoMock.ts
 * e colaboradoresMock.ts): liga somente com as DUAS condições abaixo — logo,
 * nunca em produção:
 *   1. `import.meta.env.DEV` (build de desenvolvimento);
 *   2. `VITE_PESQUISAS_MOCK=true` no `.env`/`.env.local`.
 * A guarda `MODE !== 'test'` é essencial: o Vitest carrega o mesmo `.env.local`
 * do `vite dev` — sem ela os testes receberiam estes dados fictícios.
 *
 * PARA DESATIVAR: defina `VITE_PESQUISAS_MOCK=false` no `.env.local` e reinicie
 * o `vite dev`.
 * PARA REMOVER DE VEZ: apague este arquivo e os trechos marcados com
 * "MOCK VISUAL — ver src/mocks/pesquisasClimaMock.ts" em:
 *   - src/pages/PesquisasClimaPage.tsx
 * ============================================================================
 */
import { toast } from 'sonner';
import { MOCK_EMPRESA } from './colaboradoresMock';

/** Ativa o mock apenas em dev e apenas com o opt-in explícito da env var. */
export function isPesquisasMockEnabled(): boolean {
  return import.meta.env.DEV && import.meta.env.MODE !== 'test' && import.meta.env.VITE_PESQUISAS_MOCK === 'true';
}

const EMPRESA = MOCK_EMPRESA.id;
/** `created_at` ao meio-dia UTC evita o recuo de 1 dia ao exibir em UTC-3. */
const dt = (ymd: string) => `${ymd}T12:00:00Z`;

/* ─── Pesquisas (`pesquisas`) ──────────────────────────────────────────────── */

export interface PesquisaMock {
  id: string;
  empresa_id: string;
  titulo: string;
  descricao: string;
  tipo: string;
  status: string;
  anonima: boolean;
  data_inicio: string;
  data_fim: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// 5 pesquisas: 2 ativas, 1 encerrada, 2 rascunho — cobre os 4 KPIs e as variantes
// de status (rascunho → botão "Ativar"; encerrada → sem botão de ação).
const PESQUISAS: PesquisaMock[] = [
  { id: 'mock-pesq-1', empresa_id: EMPRESA, titulo: 'Pesquisa de Clima Organizacional Q3 2026', descricao: 'Avaliação trimestral do clima organizacional com foco em engajamento e bem-estar.', tipo: 'clima', status: 'ativa', anonima: true, data_inicio: '2026-07-01', data_fim: '2026-07-31', created_by: null, created_at: dt('2026-06-25'), updated_at: dt('2026-07-01') },
  { id: 'mock-pesq-2', empresa_id: EMPRESA, titulo: 'eNPS Trimestral — Colaboradores', descricao: 'Mede a probabilidade de recomendação da empresa como local de trabalho.', tipo: 'enps', status: 'ativa', anonima: true, data_inicio: '2026-09-01', data_fim: '2026-09-30', created_by: null, created_at: dt('2026-08-28'), updated_at: dt('2026-09-01') },
  { id: 'mock-pesq-3', empresa_id: EMPRESA, titulo: 'Satisfação com Benefícios 2026', descricao: 'Percepção sobre o pacote de benefícios oferecido pela empresa.', tipo: 'satisfacao', status: 'encerrada', anonima: false, data_inicio: '2026-05-01', data_fim: '2026-05-20', created_by: null, created_at: dt('2026-04-25'), updated_at: dt('2026-05-20') },
  { id: 'mock-pesq-4', empresa_id: EMPRESA, titulo: 'Onboarding — Feedback de Novos Colaboradores', descricao: 'Avaliação da experiência de integração dos últimos 90 dias.', tipo: 'custom', status: 'rascunho', anonima: true, data_inicio: '2026-10-01', data_fim: '2026-10-31', created_by: null, created_at: dt('2026-09-20'), updated_at: dt('2026-09-20') },
  { id: 'mock-pesq-5', empresa_id: EMPRESA, titulo: 'Clima — Liderança e Comunicação', descricao: 'Avaliação específica dos líderes e dos canais de comunicação interna.', tipo: 'clima', status: 'rascunho', anonima: true, data_inicio: '2026-11-01', data_fim: '2026-11-30', created_by: null, created_at: dt('2026-10-05'), updated_at: dt('2026-10-05') },
];

export function getMockPesquisas(): PesquisaMock[] | undefined {
  return isPesquisasMockEnabled() ? PESQUISAS : undefined;
}

/* ─── Guard de escrita (modo demo) ─────────────────────────────────────────── */

/**
 * Bloqueia uma ação de ESCRITA enquanto o mock estiver ligado.
 *
 * Os registros são fictícios (`empresa_id` não existe no banco): gravar criaria
 * lixo, falharia por FK ou deixaria registros órfãos. Devolve `true` quando a
 * ação deve ser ABORTADA, então o chamador só precisa de
 * `if (bloquearEscritaPesquisas('...')) return;`.
 */
export function bloquearEscritaPesquisas(acao: string): boolean {
  if (!isPesquisasMockEnabled()) return false;
  toast.info(`Modo demonstração: "${acao}" não é gravado — os dados de pesquisas exibidos são fictícios.`);
  return true;
}
