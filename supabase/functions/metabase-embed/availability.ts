export const METABASE_UNAVAILABLE_MESSAGE =
  'Metabase indisponível. Nenhum dado de demonstração é exibido.';

export function metabaseUnavailablePayload(dashboardId: number) {
  return {
    metabaseOk: false as const,
    dashboardId,
    message: METABASE_UNAVAILABLE_MESSAGE,
  };
}
