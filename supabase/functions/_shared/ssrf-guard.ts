/**
 * E50-37: bloqueia SSRF em destinos externos configuráveis (ex.: webhook_url
 * do Bitrix24, gravado por um admin em ConfigPanels.tsx). Sem isso, um admin
 * malicioso — ou uma conta de admin comprometida — grava uma URL apontando
 * para o metadata service da nuvem (169.254.169.254), localhost, ou a rede
 * interna, e a edge function (rodando com service_role) busca esse endpoint
 * por ele.
 *
 * Defesa: exige https, resolve o hostname e recusa qualquer IP privado/
 * loopback/link-local/reservado — inclusive quando isso só aparece depois
 * de um redirect (por isso o caller precisa seguir redirects manualmente
 * com `assertSafeRedirectTarget`, não com o `redirect: 'follow'` padrão).
 */

const BLOCKED_HOSTNAMES = new Set(['localhost', '0.0.0.0', '::1']);

function ipv4ToInt(parts: number[]): number {
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function isPrivateOrReservedIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return true; // formato inválido → recusa por segurança
  const n = ipv4ToInt(parts);
  const inRange = (base: string, maskBits: number) => {
    const baseParts = base.split('.').map(Number);
    const baseN = ipv4ToInt(baseParts);
    const mask = maskBits === 0 ? 0 : (0xffffffff << (32 - maskBits)) >>> 0;
    return (n & mask) === (baseN & mask);
  };
  return (
    inRange('0.0.0.0', 8) ||
    inRange('10.0.0.0', 8) ||
    inRange('100.64.0.0', 10) || // CGNAT
    inRange('127.0.0.0', 8) ||
    inRange('169.254.0.0', 16) || // link-local, inclui metadata service (169.254.169.254)
    inRange('172.16.0.0', 12) ||
    inRange('192.0.0.0', 24) ||
    inRange('192.168.0.0', 16) ||
    inRange('198.18.0.0', 15) ||
    inRange('224.0.0.0', 4) || // multicast
    inRange('240.0.0.0', 4) // reservado
  );
}

function isPrivateOrReservedIPv6(ip: string): boolean {
  const norm = ip.toLowerCase();
  if (norm === '::1' || norm === '::') return true;
  if (norm.startsWith('fe80:') || norm.startsWith('fe8') || norm.startsWith('fe9') || norm.startsWith('fea') || norm.startsWith('feb')) return true; // link-local fe80::/10
  if (norm.startsWith('fc') || norm.startsWith('fd')) return true; // unique-local fc00::/7
  if (norm.startsWith('::ffff:')) {
    // IPv4-mapped — valida a parte v4
    const v4 = norm.split(':').pop() ?? '';
    if (v4.includes('.')) return isPrivateOrReservedIPv4(v4);
  }
  return false;
}

export class UnsafeUrlError extends Error {
  constructor(url: string, reason: string) {
    super(`URL de destino recusada (${reason}): ${url}`);
    this.name = 'UnsafeUrlError';
  }
}

/** Resolve o hostname e recusa se qualquer IP retornado for privado/reservado. */
export async function assertPublicHttpsUrl(rawUrl: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError(rawUrl, 'URL inválida');
  }
  if (parsed.protocol !== 'https:') {
    throw new UnsafeUrlError(rawUrl, 'apenas https é permitido');
  }
  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new UnsafeUrlError(rawUrl, 'host bloqueado');
  }
  // Hostname já é um literal IP?
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    if (isPrivateOrReservedIPv4(hostname)) throw new UnsafeUrlError(rawUrl, 'IP privado/reservado');
    return;
  }
  if (hostname.includes(':')) {
    if (isPrivateOrReservedIPv6(hostname)) throw new UnsafeUrlError(rawUrl, 'IP privado/reservado');
    return;
  }

  let resolved: string[] = [];
  try {
    const [v4, v6] = await Promise.allSettled([
      Deno.resolveDns(hostname, 'A'),
      Deno.resolveDns(hostname, 'AAAA'),
    ]);
    if (v4.status === 'fulfilled') resolved = resolved.concat(v4.value);
    if (v6.status === 'fulfilled') resolved = resolved.concat(v6.value);
  } catch {
    throw new UnsafeUrlError(rawUrl, 'falha ao resolver DNS');
  }
  if (resolved.length === 0) {
    throw new UnsafeUrlError(rawUrl, 'DNS não resolveu para nenhum IP');
  }
  for (const ip of resolved) {
    const unsafe = ip.includes(':') ? isPrivateOrReservedIPv6(ip) : isPrivateOrReservedIPv4(ip);
    if (unsafe) throw new UnsafeUrlError(rawUrl, `resolve para IP privado/reservado (${ip})`);
  }
}

