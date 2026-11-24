/**
 * ============================================================================
 * MOCK DE DEMONSTRAÇÃO — ÁREAS OPERACIONAIS (Remuneração, Estrutura,
 * Documentos & Compliance, SST e afins).
 *
 * Ligado apenas em desenvolvimento E com `VITE_GESTAO_MOCK=true` no `.env`.
 * Mesmo racional do `layoutMock`:
 *   - as telas continuam fazendo as MESMAS consultas de sempre;
 *   - as LEITURAS de tabela cobertas pelo dataset são respondidas em memória;
 *   - as ESCRITAS dessas tabelas são bloqueadas antes de sair do navegador.
 *
 * FORA do escopo (seguem 100% reais, sem mock):
 *   sessão/permissão (get_user_roles), `empresas`, `user_*`, `profiles`,
 *   `security_alerts`, telemetria, além das áreas que já têm mock próprio
 *   (Desempenho, Colaboradores, Admissões, Desligamentos, Recrutamento,
 *   Treinamentos, Premiações, Pesquisas, Auditoria, Calculadora, Dashboard e
 *   as nove rotas de Tempo & Ausências do `layoutMock`).
 * ============================================================================
 */

/** Só liga em dev e com opt-in explícito; nunca em produção nem no Vitest. */
export function isGestaoMockEnabled(): boolean {
  return import.meta.env.DEV && import.meta.env.MODE !== 'test' && import.meta.env.VITE_GESTAO_MOCK === 'true';
}

/**
 * Rotas (e sub-rotas) cobertas por este mock. São exatamente as áreas que
 * ainda não tinham fonte fictícia — ver docs/ENVIRONMENT.md.
 */
export const ROTAS_GESTAO_MOCK = [
  '/passivo-trabalhista',
  '/folha', // inclui /folha/calcular e /folha/compliance
  '/rubricas',
  '/provisoes',
  '/holerites',
  '/beneficios',
  '/descontos',
  '/despesas',
  '/financeiro-bancario',
  '/contabilidade', // inclui /contabilidade/canal
  '/cargos', // inclui /cargos-salarios
  '/departamentos',
  '/lotacoes',
  '/locais-trabalho',
  '/times',
  '/centros-custo',
  '/documentos',
  '/gerador-documentos',
  '/assinaturas',
  '/contratos-gerados',
  '/esocial',
  '/obrigacoes-fiscais',
  '/lgpd',
  '/seguranca',
  '/sst',
  '/admin/sst',
  '/epis',
  '/exames',
  '/convenios',
  '/planos-saude',
  '/seguros-vida',
  '/jornadas',
  '/faltas',
  '/vales',
  '/relatorios',
  '/movimentacoes',
  '/medidas-disciplinares',
  '/pensoes',
  '/sindicatos',
  '/comunicacao-interna',
  '/notificacoes',
  '/promo-brindes', // inclui /promo-brindes/vinculos
  '/canal-etica',
] as const;

/**
 * Rotas que, mesmo caindo por prefixo acima, NÃO devem ser mockadas
 * (áreas com mock próprio ou telas que precisam do banco real).
 */
export const ROTAS_GESTAO_EXCLUIDAS = [
  '/sst/colaborador', // dossiê do colaborador → já vem do colaboradoresMock
  '/sst/portal',
] as const;

export function rotaNoEscopoDoGestaoMock(pathname: string = window.location.pathname): boolean {
  if (ROTAS_GESTAO_EXCLUIDAS.some((r) => pathname === r || pathname.startsWith(`${r}/`))) return false;
  return ROTAS_GESTAO_MOCK.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}
