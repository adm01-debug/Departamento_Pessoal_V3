/**
 * Web Push real sobre WebCrypto â€” sem dependencia externa.
 *
 *   RFC 8291 (aes128gcm): cifra do payload para as chaves da assinatura
 *   RFC 8292 (VAPID):     JWT ES256 que autoriza a entrega no push service
 *
 * Sem par VAPID configurado o chamador registra a falha honesta
 * (`push_sem_vapid`) em vez de fingir entrega.
 *
 * A chave privada vive SOMENTE em variavel de ambiente do runtime das Edge
 * Functions (`VAPID_PRIVATE_KEY`). Nao usar `configuracoes.vapid_private_key`:
 * essa coluna e selecionavel pelo papel `anon`, entao quem tem a chave
 * publicavel (que vai no bundle do front) leria a chave privada e poderia
 * enviar push em nome do sistema.
 */

import { safeFetch } from './safe-fetch.ts';
import { sanitizarErro } from './outboundDelivery.ts';

const te = new TextEncoder();

// Uint8Array sem parametro generico cai em ArrayBufferLike, que o lib de
// WebCrypto nao aceita como BufferSource. Fixar em ArrayBuffer resolve.
type Bytes = Uint8Array<ArrayBuffer>;

/** Tamanho maximo de registro do RFC 8188 (os navegadores usam 4096). */
export const RS_RECORD = 4096;

export function b64uParaBytes(valor: string): Bytes {
  const base64 = valor.trim().replace(/-/g, '+').replace(/_/g, '/');
  const comPadding = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binario = atob(comPadding);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

export function bytesParaB64u(bytes: Bytes): string {
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function concat(...partes: Bytes[]): Bytes {
  const total = partes.reduce((soma, parte) => soma + parte.length, 0);
  const saida = new Uint8Array(total);
  let offset = 0;
  for (const parte of partes) {
    saida.set(parte, offset);
    offset += parte.length;
  }
  return saida;
}

async function hkdf(ikm: Bytes, salt: Bytes, info: Bytes, bytes: number): Promise<Bytes> {
  const chave = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    chave,
    bytes * 8,
  );
  return new Uint8Array(bits);
}

export interface VapidConfig {
  /** base64url do ponto nao comprimido da chave publica (65 bytes, prefixo 0x04). */
  publicKey: string;
  /** base64url do escalar privado `d` (32 bytes). */
  privateKey: string;
  /** `sub` do JWT: `mailto:` ou uma URL https da aplicacao. */
  subject: string;
}

const VAPID_SUBJECT_PADRAO = 'https://departamento-pessoal-v3.vercel.app';

/** Le o par VAPID do ambiente. `null` quando nao configurado. */
export function vapidDoAmbiente(
  env: (nome: string) => string | undefined = (nome) => Deno.env.get(nome),
): VapidConfig | null {
  const publicKey = env('VAPID_PUBLIC_KEY');
  const privateKey = env('VAPID_PRIVATE_KEY');
  if (!publicKey || !privateKey) return null;
  return {
    publicKey,
    privateKey,
    subject: env('VAPID_SUBJECT') || VAPID_SUBJECT_PADRAO,
  };
}

/** Gera um par VAPID novo â€” uso operacional, para provisionar as chaves uma vez. */
export async function gerarParVapid(): Promise<{ publicKey: string; privateKey: string }> {
  const par = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', par.privateKey);
  const publica = new Uint8Array(await crypto.subtle.exportKey('raw', par.publicKey));
  if (!jwk.d) throw new Error('WebCrypto nao devolveu o componente privado `d`');
  return { publicKey: bytesParaB64u(publica), privateKey: jwk.d };
}

async function importarVapid(vapid: VapidConfig): Promise<CryptoKey> {
  const publica = b64uParaBytes(vapid.publicKey);
  if (publica.length !== 65 || publica[0] !== 0x04) {
    throw new Error('VAPID_PUBLIC_KEY invalida: esperado ponto nao comprimido P-256 de 65 bytes');
  }
  const privada = b64uParaBytes(vapid.privateKey);
  if (privada.length !== 32) {
    throw new Error('VAPID_PRIVATE_KEY invalida: esperado escalar P-256 de 32 bytes');
  }
  return await crypto.subtle.importKey('jwk', {
    kty: 'EC',
    crv: 'P-256',
    d: bytesParaB64u(privada),
    x: bytesParaB64u(publica.slice(1, 33)),
    y: bytesParaB64u(publica.slice(33, 65)),
  }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

/** JWT VAPID (RFC 8292). O `aud` e a origem do endpoint do push service. */
export async function criarVapidJwt(
  endpoint: string,
  vapid: VapidConfig,
  validadeSegundos = 12 * 3600,
): Promise<string> {
  const chave = await importarVapid(vapid);
  const b64u = (valor: unknown) => bytesParaB64u(te.encode(JSON.stringify(valor)));
  const cabecalho = b64u({ typ: 'JWT', alg: 'ES256' });
  const corpo = b64u({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + validadeSegundos,
    sub: vapid.subject,
  });
  const entrada = `${cabecalho}.${corpo}`;
  // WebCrypto devolve a assinatura ECDSA como r||s (64 bytes) â€” exatamente o
  // formato do ES256 em JWT. Nao converter para DER.
  const assinatura = new Uint8Array(
    await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, chave, te.encode(entrada)),
  );
  return `${entrada}.${bytesParaB64u(assinatura)}`;
}

/** Corpo `aes128gcm` (RFC 8188 + RFC 8291) para as chaves da assinatura. */
export async function cifrarPush(p256dh: string, auth: string, payload: Bytes): Promise<Bytes> {
  const uaPublica = b64uParaBytes(p256dh);
  const authSecret = b64uParaBytes(auth);
  if (uaPublica.length !== 65) throw new Error('p256dh invalido: esperado ponto nao comprimido de 65 bytes');
  if (authSecret.length !== 16) throw new Error('auth invalido: esperado segredo de 16 bytes');

  const efemero = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const uaChave = await crypto.subtle.importKey('raw', uaPublica, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const segredo = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: uaChave }, efemero.privateKey, 256),
  );
  const asPublica = new Uint8Array(await crypto.subtle.exportKey('raw', efemero.publicKey));

  const info = concat(te.encode('WebPush: info'), new Uint8Array([0]), uaPublica, asPublica);
  const ikm = await hkdf(segredo, authSecret, info, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(ikm, salt, te.encode('Content-Encoding: aes128gcm'), 16);
  const nonce = await hkdf(ikm, salt, te.encode('Content-Encoding: nonce'), 12);

  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  // 0x02 = delimitador do ultimo registro (RFC 8188).
  const cifrado = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce, tagLength: 128 },
      aes,
      concat(payload, new Uint8Array([0x02])),
    ),
  );

  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, RS_RECORD);
  return concat(salt, rs, new Uint8Array([asPublica.length]), asPublica, cifrado);
}

export interface ResultadoPush {
  ok: boolean;
  /** true quando o push service informa que a assinatura nao existe mais (404/410). */
  expirada: boolean;
  status: number | null;
  error: string | null;
}

/** Envia um Web Push real. `assinatura` e o JSONB de `push_subscriptions.subscription`. */
export async function enviarWebPush(
  assinatura: unknown,
  payload: Record<string, unknown>,
  vapid: VapidConfig,
): Promise<ResultadoPush> {
  const sub = (assinatura ?? {}) as {
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown };
  };
  const endpoint = typeof sub.endpoint === 'string' ? sub.endpoint : null;
  const p256dh = typeof sub.keys?.p256dh === 'string' ? sub.keys.p256dh : null;
  const auth = typeof sub.keys?.auth === 'string' ? sub.keys.auth : null;
  if (!endpoint || !p256dh || !auth) {
    return { ok: false, expirada: false, status: null, error: 'assinatura_incompleta' };
  }

  try {
    const jwt = await criarVapidJwt(endpoint, vapid);
    const corpo = await cifrarPush(p256dh, auth, te.encode(JSON.stringify(payload)));
    const res = await safeFetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `vapid t=${jwt}, k=${vapid.publicKey}`,
        'TTL': '60',
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
      },
      body: corpo,
      timeoutMs: 8_000,
      tag: 'webhook',
    });
    if (res.ok) return { ok: true, expirada: false, status: res.status, error: null };
    const expirada = res.status === 404 || res.status === 410;
    return {
      ok: false,
      expirada,
      status: res.status,
      error: expirada ? 'assinatura_expirada' : `push_service_respondeu_${res.status}`,
    };
  } catch (e) {
    return {
      ok: false,
      expirada: false,
      status: null,
      error: e instanceof Error ? sanitizarErro(e.message) : 'falha_de_rede_no_push',
    };
  }
}