import { assert, assertEquals, assertRejects } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  b64uParaBytes,
  bytesParaB64u,
  cifrarPush,
  criarVapidJwt,
  gerarParVapid,
  RS_RECORD,
  vapidDoAmbiente,
} from "./webPush.ts";

const te = new TextEncoder();

type Bytes = Uint8Array<ArrayBuffer>;

// O receptor abaixo e escrito de forma independente do modulo, seguindo o
// RFC 8291 direto. Sem ele o teste so provaria que o codigo "roda" â€” aqui ele
// prova que o corpo cifrado e decifravel pelas chaves da assinatura.
async function hkdf(ikm: Bytes, salt: Bytes, info: Bytes, bytes: number) {
  const chave = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(
    await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, chave, bytes * 8),
  );
}

function concat(...partes: Bytes[]): Bytes {
  const total = partes.reduce((s, p) => s + p.length, 0);
  const saida = new Uint8Array(total);
  let offset = 0;
  for (const p of partes) {
    saida.set(p, offset);
    offset += p.length;
  }
  return saida;
}

async function gerarAssinaturaDeTeste() {
  const ua = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const p256dh = bytesParaB64u(new Uint8Array(await crypto.subtle.exportKey("raw", ua.publicKey)));
  const auth = bytesParaB64u(crypto.getRandomValues(new Uint8Array(16)));
  return { ua, p256dh, auth };
}

async function decifrarPush(
  corpo: Uint8Array,
  assinatura: { ua: CryptoKeyPair; p256dh: string; auth: string },
) {
  const salt = corpo.slice(0, 16);
  const rs = new DataView(corpo.buffer, corpo.byteOffset + 16, 4).getUint32(0);
  const tamanhoChave = corpo[20];
  const asPublica = corpo.slice(21, 21 + tamanhoChave);
  const cifrado = corpo.slice(21 + tamanhoChave);

  const uaPublica = new Uint8Array(await crypto.subtle.exportKey("raw", assinatura.ua.publicKey));
  const asChave = await crypto.subtle.importKey(
    "raw",
    asPublica,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const segredo = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: asChave }, assinatura.ua.privateKey, 256),
  );

  const info = concat(te.encode("WebPush: info"), new Uint8Array([0]), uaPublica, asPublica);
  const ikm = await hkdf(segredo, b64uParaBytes(assinatura.auth), info, 32);
  const cek = await hkdf(ikm, salt, te.encode("Content-Encoding: aes128gcm"), 16);
  const nonce = await hkdf(ikm, salt, te.encode("Content-Encoding: nonce"), 12);

  const aes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["decrypt"]);
  const claro = new Uint8Array(
    await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce, tagLength: 128 }, aes, cifrado),
  );
  return { texto: new TextDecoder().decode(claro.slice(0, claro.length - 1)), rs };
}

Deno.test("cifrarPush: payload cifrado volta inteiro pelas chaves da assinatura", async () => {
  const assinatura = await gerarAssinaturaDeTeste();
  const payload = te.encode(JSON.stringify({ title: "ASOs vencidos", body: "4 ASO(s) vencidos" }));

  const corpo = await cifrarPush(assinatura.p256dh, assinatura.auth, payload);
  const { texto, rs } = await decifrarPush(corpo, assinatura);

  assertEquals(texto, new TextDecoder().decode(payload));
  assertEquals(rs, RS_RECORD);
  // Layout do cabecalho aes128gcm: salt(16) | rs(4) | idlen(1) | chave(65) | cifra
  assertEquals(corpo.length, 16 + 4 + 1 + 65 + payload.length + 1 + 16);
  assertEquals(corpo[20], 65);
  assertEquals(corpo[21], 0x04);
});

Deno.test("cifrarPush: salt e chave efemera mudam a cada chamada", async () => {
  const assinatura = await gerarAssinaturaDeTeste();
  const payload = te.encode("mesmo payload");
  const a = await cifrarPush(assinatura.p256dh, assinatura.auth, payload);
  const b = await cifrarPush(assinatura.p256dh, assinatura.auth, payload);
  assertEquals(a.slice(0, 16).every((b, i) => b === 0) && b.slice(0, 16).every((b) => b === 0), false);
  assertEquals(bytesParaB64u(a.slice(0, 16)) === bytesParaB64u(b.slice(0, 16)), false);
  assertEquals(bytesParaB64u(a.slice(21, 86)) === bytesParaB64u(b.slice(21, 86)), false);
  // Mesmo com salt diferente, cada corpo continua decifravel so pela sua chave.
  assertEquals((await decifrarPush(a, assinatura)).texto, "mesmo payload");
  assertEquals((await decifrarPush(b, assinatura)).texto, "mesmo payload");
});

Deno.test("cifrarPush: assinatura malformada falha em vez de gerar corpo invalido", async () => {
  await assertRejects(() => cifrarPush(bytesParaB64u(new Uint8Array(32)), bytesParaB64u(new Uint8Array(16)), te.encode("x")));
  await assertRejects(() => cifrarPush(bytesParaB64u(new Uint8Array(65)), bytesParaB64u(new Uint8Array(8)), te.encode("x")));
});

Deno.test("criarVapidJwt: assinatura ES256 verificavel e claims corretos", async () => {
  const par = await gerarParVapid();
  const endpoint = "https://push.example.com/enviar/abc123";
  const jwt = await criarVapidJwt(endpoint, { ...par, subject: "mailto:ti@promobrindes.com.br" });

  const [cabecalhoB64u, corpoB64u, assinaturaB64u] = jwt.split(".");
  assertEquals(JSON.parse(new TextDecoder().decode(b64uParaBytes(cabecalhoB64u))).alg, "ES256");

  const corpo = JSON.parse(new TextDecoder().decode(b64uParaBytes(corpoB64u)));
  assertEquals(corpo.aud, "https://push.example.com");
  assertEquals(corpo.sub, "mailto:ti@promobrindes.com.br");
  assert(corpo.exp > Math.floor(Date.now() / 1000));

  // ES256 em JWT e r||s cru (64 bytes), nunca DER â€” um DER quebraria o push service.
  const assinatura = b64uParaBytes(assinaturaB64u);
  assertEquals(assinatura.length, 64);

  const chavePublica = await crypto.subtle.importKey(
    "raw",
    b64uParaBytes(par.publicKey),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"],
  );
  const valida = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    chavePublica,
    assinatura,
    te.encode(`${cabecalhoB64u}.${corpoB64u}`),
  );
  assertEquals(valida, true);
});

Deno.test("criarVapidJwt: aud segue a origem do endpoint, nao a do app", async () => {
  const par = await gerarParVapid();
  const jwt = await criarVapidJwt("https://fcm.googleapis.com/fcm/send/xyz", {
    ...par,
    subject: "https://departamento-pessoal-v3.vercel.app",
  });
  const corpo = JSON.parse(new TextDecoder().decode(b64uParaBytes(jwt.split(".")[1])));
  assertEquals(corpo.aud, "https://fcm.googleapis.com");
});

Deno.test("vapidDoAmbiente: null sem par completo e sem vazar segredo no retorno parcial", () => {
  assertEquals(vapidDoAmbiente(() => undefined), null);
  assertEquals(vapidDoAmbiente((n) => (n === "VAPID_PUBLIC_KEY" ? "pub" : undefined)), null);
  assertEquals(vapidDoAmbiente((n) => (n === "VAPID_PRIVATE_KEY" ? "priv" : undefined)), null);

  const completo = vapidDoAmbiente((n) => {
    if (n === "VAPID_PUBLIC_KEY") return "pub";
    if (n === "VAPID_PRIVATE_KEY") return "priv";
    return undefined;
  });
  assertEquals(completo, {
    publicKey: "pub",
    privateKey: "priv",
    subject: "https://departamento-pessoal-v3.vercel.app",
  });
});

Deno.test("base64url: ida e volta preserva os bytes", () => {
  const bytes = crypto.getRandomValues(new Uint8Array(65));
  assertEquals(bytesParaB64u(b64uParaBytes(bytesParaB64u(bytes))), bytesParaB64u(bytes));
  assertEquals(b64uParaBytes(bytesParaB64u(bytes)).length, 65);
});