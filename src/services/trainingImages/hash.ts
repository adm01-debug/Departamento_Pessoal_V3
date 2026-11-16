/**
 * ============================================================================
 * SHA-256 — identidade determinística do conteúdo (cliente, backend e banco).
 *
 * POR QUE NÃO FNV-1a: o hash de 32 bits tem risco real de colisão em uma base
 * grande de cursos; duas capas diferentes poderiam ser tratadas como “mesmo
 * conteúdo” e a segunda nunca seria gerada. SHA-256 elimina esse risco na
 * prática (2^256) e é o mesmo algoritmo usado no backend.
 *
 * IMPLEMENTAÇÃO PURA E SÍNCRONA: sem Web Crypto (que é assíncrono e obrigaria a
 * tornar `montarSolicitacaoImagem` async) e sem dependência externa. A cópia do
 * backend (`supabase/functions/_shared/trainingImages/hash.ts`) é idêntica, e um
 * teste de paridade garante que as duas produzem o mesmo resultado.
 *
 * Entrada sempre em UTF-8; saída em hexadecimal minúsculo (64 caracteres).
 * ============================================================================
 */

/* prettier-ignore */
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(valor: number, bits: number): number {
  return (valor >>> bits) | (valor << (32 - bits));
}

/** SHA-256 de uma string (UTF-8) ou de bytes. Retorna 64 caracteres hex. */
export function sha256Hex(entrada: string | Uint8Array): string {
  const dados = typeof entrada === 'string' ? new TextEncoder().encode(entrada) : entrada;
  const tamanho = dados.length;

  // Padding: 0x80 + zeros até 56 bytes do bloco + 8 bytes de comprimento.
  const blocos = Math.ceil((tamanho + 9) / 64);
  const buffer = new Uint8Array(blocos * 64);
  buffer.set(dados);
  buffer[tamanho] = 0x80;

  const view = new DataView(buffer.buffer);
  const bits = tamanho * 8;
  view.setUint32(buffer.length - 8, Math.floor(bits / 0x100000000));
  view.setUint32(buffer.length - 4, bits >>> 0);

  let a = 0x6a09e667;
  let b = 0xbb67ae85;
  let c = 0x3c6ef372;
  let d = 0xa54ff53a;
  let e = 0x510e527f;
  let f = 0x9b05688c;
  let g = 0x1f83d9ab;
  let h = 0x5be0cd19;

  const w = new Uint32Array(64);

  for (let bloco = 0; bloco < blocos; bloco += 1) {
    const offset = bloco * 64;
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(offset + i * 4);

    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let A = a;
    let B = b;
    let C = c;
    let D = d;
    let E = e;
    let F = f;
    let G = g;
    let H = h;

    for (let i = 0; i < 64; i += 1) {
      const S1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
      const ch = (E & F) ^ (~E & G);
      const t1 = (H + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22);
      const maj = (A & B) ^ (A & C) ^ (B & C);
      const t2 = (S0 + maj) >>> 0;

      H = G;
      G = F;
      F = E;
      E = (D + t1) >>> 0;
      D = C;
      C = B;
      B = A;
      A = (t1 + t2) >>> 0;
    }

    a = (a + A) >>> 0;
    b = (b + B) >>> 0;
    c = (c + C) >>> 0;
    d = (d + D) >>> 0;
    e = (e + E) >>> 0;
    f = (f + F) >>> 0;
    g = (g + G) >>> 0;
    h = (h + H) >>> 0;
  }

  return [a, b, c, d, e, f, g, h].map((parte) => parte.toString(16).padStart(8, '0')).join('');
}
