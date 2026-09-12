const CONFIGURED_DASHBOARD_IDS = new Set([1, 2, 3, 4]);

/** Only explicitly configured dashboards may receive a signed embed token. */
export function isConfiguredDashboard(dashboardId: number): boolean {
  return CONFIGURED_DASHBOARD_IDS.has(dashboardId);
}
