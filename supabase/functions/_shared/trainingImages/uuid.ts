/**
 * UUID no formato lexical aceito pelo PostgreSQL (8-4-4-4-12 hex).
 *
 * Não exigimos bits de versão/variante RFC 4122 porque o banco contém IDs de
 * demonstração/seed (ex.: `aaaa1111-1111-1111-1111-111111111111`) que são UUIDs
 * válidos para o Postgres, mas não seguem a variante RFC. A validação continua
 * sendo apenas de FORMATO; autorização, tenant e allowlist são verificados
 * separadamente e nunca dependem deste regex.
 */
export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(valor: unknown): boolean {
  return typeof valor === 'string' && UUID_RE.test(valor.trim());
}
