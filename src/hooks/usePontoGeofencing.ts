import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { batidasPontoService } from '@/services';
import type { BatidaGeograficaCrua, IntervaloGeo, UnidadeGeografica } from '@/utils/pontoGeofencing';

/**
 * ============================================================================
 * DADOS DO PAINEL DE GEOFENCING — uma fonte só para período, anterior, unidade
 * e raio autorizado.
 *
 * O painel precisa de QUATRO recortes diferentes da mesma base:
 *   1. batidas do período selecionado;
 *   2. batidas do período ANTERIOR (base do indicador de variação dos KPIs);
 *   3. a unidade com coordenada (`locais_trabalho`) — centro do mapa;
 *   4. o raio autorizado (`configuracoes_ponto.raio_maximo_metros`).
 *
 * Eles moram juntos aqui (e não espalhados em `useQuery` dentro do componente)
 * porque o painel também exibe estado de carregamento/erro e precisa saber se
 * AINDA não há resposta — misturar as quatro em um único `isLoading` evita o
 * "card piscando" de quem espera uma enquanto as outras já chegaram.
 *
 * O raio usa o MESMO fallback do registro de ponto (`raio_maximo_metros || 200`,
 * ver `pontoService.registrar`): o perímetro desenhado tem de ser o raio que
 * decidiu `dentro_raio` no momento da batida, nunca um número inventado na tela.
 * ============================================================================
 */

/** Raio padrão do sistema quando a empresa ainda não configurou o dela. */
export const RAIO_PADRAO_METROS = 200;

export interface ResultadoPontoGeofencing {
  /** Unidades da empresa que têm coordenada (centro do mapa). */
  unidades: UnidadeGeografica[];
  /** Unidade de referência (a primeira com coordenada, ou `null`). */
  unidade: UnidadeGeografica | null;
  /** Raio autorizado em metros, com o fallback do sistema aplicado. */
  raioMetros: number;
  /** Batidas cruas do período selecionado. */
  batidas: BatidaGeograficaCrua[];
  /** Batidas cruas do período anterior (comparação dos KPIs). */
  batidasAnteriores: BatidaGeograficaCrua[];
  carregando: boolean;
  erro: boolean;
  recarregar: () => void;
}

/** Linha de `locais_trabalho` que interessa ao mapa. */
interface LocalTrabalhoGeo {
  id: string;
  nome: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
}

function numeroOuNulo(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

export function usePontoGeofencing(
  empresaId: string | undefined,
  intervalo: IntervaloGeo,
  intervaloComparativo: IntervaloGeo
): ResultadoPontoGeofencing {
  const locaisQuery = useQuery({
    queryKey: ['ponto-geo-locais', empresaId],
    enabled: !!empresaId,
    queryFn: async (): Promise<LocalTrabalhoGeo[]> => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from('locais_trabalho')
        .select('id, nome, latitude, longitude')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);
      if (error) throw error;
      return (data ?? []) as LocalTrabalhoGeo[];
    },
  });

  const configQuery = useQuery({
    queryKey: ['ponto-geo-config', empresaId],
    enabled: !!empresaId,
    queryFn: async (): Promise<number | null> => {
      if (!empresaId) return null;
      const { data, error } = await supabase
        .from('configuracoes_ponto')
        .select('raio_maximo_metros')
        .eq('empresa_id', empresaId)
        .maybeSingle();
      if (error) throw error;
      return numeroOuNulo((data as { raio_maximo_metros?: number | string | null } | null)?.raio_maximo_metros);
    },
  });

  const batidasQuery = useQuery({
    queryKey: ['ponto-geo-batidas', empresaId, intervalo.inicio, intervalo.fim],
    enabled: !!empresaId && !!intervalo.inicio && !!intervalo.fim,
    queryFn: async (): Promise<BatidaGeograficaCrua[]> => {
      if (!empresaId) return [];
      return (await batidasPontoService.listarPorPeriodo(
        empresaId,
        intervalo.inicio,
        intervalo.fim
      )) as BatidaGeograficaCrua[];
    },
  });

  const anterioresQuery = useQuery({
    queryKey: ['ponto-geo-batidas-anteriores', empresaId, intervaloComparativo.inicio, intervaloComparativo.fim],
    enabled: !!empresaId && !!intervaloComparativo.inicio && !!intervaloComparativo.fim,
    queryFn: async (): Promise<BatidaGeograficaCrua[]> => {
      if (!empresaId) return [];
      return (await batidasPontoService.listarPorPeriodo(
        empresaId,
        intervaloComparativo.inicio,
        intervaloComparativo.fim
      )) as BatidaGeograficaCrua[];
    },
  });

  const raioMetros = configQuery.data ?? RAIO_PADRAO_METROS;

  const unidades: UnidadeGeografica[] = (locaisQuery.data ?? [])
    .map((local) => {
      const latitude = numeroOuNulo(local.latitude);
      const longitude = numeroOuNulo(local.longitude);
      if (latitude === null || longitude === null) return null;
      return {
        id: local.id,
        nome: String(local.nome ?? '').trim() || 'Unidade',
        latitude,
        longitude,
        raioMetros,
      } satisfies UnidadeGeografica;
    })
    .filter((unidade): unidade is UnidadeGeografica => unidade !== null);

  const carregando =
    locaisQuery.isLoading || configQuery.isLoading || batidasQuery.isLoading || anterioresQuery.isLoading;

  return {
    unidades,
    unidade: unidades[0] ?? null,
    raioMetros,
    batidas: batidasQuery.data ?? [],
    batidasAnteriores: anterioresQuery.data ?? [],
    carregando,
    erro: locaisQuery.isError || batidasQuery.isError,
    recarregar: () => {
      void locaisQuery.refetch();
      void configQuery.refetch();
      void batidasQuery.refetch();
      void anterioresQuery.refetch();
    },
  };
}
