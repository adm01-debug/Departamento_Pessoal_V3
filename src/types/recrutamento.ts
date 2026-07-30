import type { Database } from '@/integrations/supabase/types';

/**
 * Tipos do módulo de Recrutamento & Seleção.
 *
 * Fonte da verdade: os tipos gerados do banco (`Database['public']['Tables']`).
 * As variantes `...ComRelacoes` refletem exatamente os `select()` com joins
 * usados em `recrutamentoService`, evitando `any` na camada de apresentação.
 */

type Tables = Database['public']['Tables'];

export type VagaRow = Tables['vagas']['Row'];
export type CandidatoRow = Tables['candidatos']['Row'];
export type CandidaturaRow = Tables['candidaturas']['Row'];

/** Subconjunto da vaga trazido no join de `listarCandidaturas`. */
export interface VagaResumo {
  titulo: string | null;
  departamento: string | null;
}

/**
 * Linha de `candidaturas` com os relacionamentos embutidos.
 * `candidato` e `vaga` podem vir `null` quando o registro relacionado
 * foi removido ou está fora do escopo da RLS.
 */
export type CandidaturaComRelacoes = CandidaturaRow & {
  candidato: CandidatoRow | null;
  vaga: VagaResumo | null;
};
