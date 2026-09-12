/**
 * Tenant identifiers used by write operations in the generic DB bridge.
 *
 * External writes carry the verified caller JWT and remain subject to RLS.
 * This application-level scope check is independent defense in depth: an
 * unscoped write is rejected before it reaches PostgREST.
 */
export type BridgeWriteData =
  | Record<string, unknown>
  | Record<string, unknown>[]
  | undefined;

export interface TenantWriteScope {
  empresaIds: Set<string>;
  rowCount: number;
  missingTenantRows: number;
}

export function tenantColumnFor(table: string): 'id' | 'empresa_id' {
  // A company is its own tenant. Client-created companies must provide their
  // UUID so the bridge can authorize that write explicitly.
  return table === 'empresas' ? 'id' : 'empresa_id';
}

/**
 * Extracts tenant identifiers and records every malformed/unscoped row.
 * This deliberately does not silently discard invalid values: an array where
 * one row lacks empresa_id must fail as a whole, otherwise it bypasses the
 * per-tenant authorization check for that row.
 */
export function extractTenantWriteScope(table: string, data: BridgeWriteData): TenantWriteScope {
  const rows = Array.isArray(data) ? data : data ? [data] : [];
  const tenantColumn = tenantColumnFor(table);
  const empresaIds = new Set<string>();
  let missingTenantRows = 0;

  for (const row of rows) {
    const value = row[tenantColumn];
    if (typeof value !== 'string' || value.trim().length === 0) {
      missingTenantRows++;
      continue;
    }
    empresaIds.add(value);
  }

  return { empresaIds, rowCount: rows.length, missingTenantRows };
}

export function hasCompleteTenantWriteScope(scope: TenantWriteScope): boolean {
  return scope.rowCount > 0 && scope.missingTenantRows === 0 && scope.empresaIds.size > 0;
}

/** A generic UPDATE may preserve a tenant key, but may never reassign it. */
export function preservesTenantOnUpdate(
  table: string,
  data: BridgeWriteData,
  targetEmpresaIds: ReadonlySet<string>,
): boolean {
  if (!data || Array.isArray(data)) return !Array.isArray(data);
  const tenantColumn = tenantColumnFor(table);
  if (!Object.prototype.hasOwnProperty.call(data, tenantColumn)) return true;
  const supplied = data[tenantColumn];
  return typeof supplied === 'string' && targetEmpresaIds.size === 1 && targetEmpresaIds.has(supplied);
}
