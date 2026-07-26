/**
 * Service para tabelas de domínio com cache em memória
 * P4-067: resolve queries repetidas para CBO/CNAE/IRRF/INSS
 *
 * Usa cachedFetch no backend (edge functions) + cache local em memória
 */

import { supabase } from '@/integrations/supabase/client';

export type DomainType = 'cbo' | 'cnae' | 'irrf' | 'inss' | 'feriados' | 'rubricas';

export interface CBORow {
  codigo: string;
  descricao: string;
  grupo: string | null;
}

export interface CNAERow {
  codigo: string;
  descricao: string;
  subclasse: string | null;
}

export interface IRRFTable {
  faixa: string;
  aliquota: number;
  deducao: number;
}

export interface INSSTable {
  faixa: string;
  aliquota: number;
  teto: number;
}

export interface FeriadoRow {
  data: string;
  nome: string;
  tipo: string;
  municipio: string | null;
  estado: string | null;
}

export interface RubricaRow {
  codigo: string;
  descricao: string;
  tipo: 'provento' | 'desconto' | 'informativo';
  natureza: string;
}

// Cache local em memória (para uso no frontend)
const localCache = new Map<DomainType, { data: unknown; expiresAt: number }>();
const LOCAL_CACHE_TTL_MS = 60_000; // 1 minuto no frontend

/**
 * Busca dados de tabela de domínio via edge function
 * Com cache local em memória para evitar chamadas repetidas
 */
async function fetchDomainData<T>(type: DomainType): Promise<T[]> {
  const now = Date.now();

  // Verifica cache local primeiro
  const cached = localCache.get(type);
  if (cached && cached.expiresAt > now) {
    return cached.data as T[];
  }

  // Busca do backend (que tem cachedFetch)
  const { data, error } = await supabase.functions.invoke('tabelas-dominio', {
    body: { type },
  });

  if (error) {
    loggerService.error(`Erro ao buscar domínio ${type}`, { type }, error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  const result = (data as { data: T[] })?.data ?? [];

  // Armazena no cache local
  localCache.set(type, {
    data: result,
    expiresAt: now + LOCAL_CACHE_TTL_MS,
  });

  return result;
}

/**
 * Busca CBO por código ou descrição
 */
export async function buscarCBO(termo: string): Promise<CBORow[]> {
  if (!termo || termo.length < 2) return [];

  const todos = await fetchDomainData<CBORow>('cbo');
  const termoLower = termo.toLowerCase();

  return todos.filter(
    (c) =>
      c.codigo.includes(termo) ||
      c.descricao.toLowerCase().includes(termoLower)
  ).slice(0, 20);
}

/**
 * Busca CNAE por código ou descrição
 */
export async function buscarCNAE(termo: string): Promise<CNAERow[]> {
  if (!termo || termo.length < 2) return [];

  const todos = await fetchDomainData<CNAERow>('cnae');
  const termoLower = termo.toLowerCase();

  return todos.filter(
    (c) =>
      c.codigo.includes(termo) ||
      c.descricao.toLowerCase().includes(termoLower)
  ).slice(0, 20);
}

/**
 * Retorna tabela de IRRF completa
 */
export async function getIRRFTable(): Promise<IRRFTable[]> {
  return fetchDomainData<IRRFTable>('irrf');
}

/**
 * Retorna tabela de INSS completa
 */
export async function getINSSTable(): Promise<INSSTable[]> {
  return fetchDomainData<INSSTable>('inss');
}

/**
 * Retorna lista de feriados
 */
export async function getFeriados(ano?: number): Promise<FeriadoRow[]> {
  const todos = await fetchDomainData<FeriadoRow>('feriados');
  const anoAtual = ano ?? new Date().getFullYear();

  return todos.filter((f) => f.data.startsWith(String(anoAtual)));
}

/**
 * Retorna rubricas de folha de pagamento
 */
export async function getRubricas(): Promise<RubricaRow[]> {
  return fetchDomainData<RubricaRow>('rubricas');
}

/**
 * Invalida cache local (para uso após mutações)
 */
export function invalidateDomainCache(type?: DomainType): void {
  if (type) {
    localCache.delete(type);
  } else {
    localCache.clear();
  }
}
