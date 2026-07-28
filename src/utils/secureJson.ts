/**
 * Parser JSON endurecido contra *prototype pollution*.
 *
 * Por que duas camadas?
 * 1. `reviver` do JSON.parse: descarta a chave perigosa já durante a construção
 *    do objeto, antes que ela exista como propriedade própria.
 * 2. Reconstrução com `Object.create(null)`: mesmo que uma chave escape, o objeto
 *    resultante não possui `Object.prototype` na cadeia. Isso torna
 *    `obj.__proto__` de fato `undefined` e `'constructor' in obj` de fato `false`,
 *    em vez de resolverem para membros herdados do protótipo — que era o
 *    comportamento silenciosamente inseguro da implementação anterior.
 *
 * Arrays mantêm `Array.prototype` (necessário para `.map`, `.slice`, etc.);
 * apenas objetos simples recebem protótipo nulo.
 */

const DANGEROUS_KEYS: ReadonlySet<string> = new Set([
  '__proto__',
  'constructor',
  'prototype',
]);

/** Reviver que remove chaves perigosas durante o parse. */
function dangerousKeyReviver(this: unknown, key: string, value: unknown): unknown {
  if (DANGEROUS_KEYS.has(key)) return undefined;
  return value;
}

/**
 * Reconstrói recursivamente o valor, trocando objetos simples por objetos de
 * protótipo nulo e descartando qualquer chave perigosa remanescente.
 */
function harden(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map(harden);
  }

  const clean = Object.create(null) as Record<string, unknown>;
  // `Object.keys` lista apenas propriedades próprias e enumeráveis — exatamente
  // o que JSON.parse produz. Evita herdar qualquer coisa da cadeia.
  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (DANGEROUS_KEYS.has(key)) continue;
    clean[key] = harden((value as Record<string, unknown>)[key]);
  }
  return clean;
}

/**
 * Faz o parse de JSON não confiável (localStorage, respostas de rede, postMessage)
 * removendo vetores de prototype pollution.
 *
 * @throws SyntaxError quando `text` não é JSON válido.
 */
export function secureJsonParse<T = unknown>(text: string): T {
  const parsed = JSON.parse(text, dangerousKeyReviver);
  return harden(parsed) as T;
}
