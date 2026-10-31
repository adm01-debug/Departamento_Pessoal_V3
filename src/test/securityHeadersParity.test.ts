import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// nginx.conf (imagem Docker) precisa servir os MESMOS security headers que o
// vercel.json (deploy de produção). Divergência = CSP diferente por ambiente.
const root = process.cwd();

function vercelHeaders(): Record<string, string> {
  const v = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8')) as {
    headers: { source: string; headers: { key: string; value: string }[] }[];
  };
  const global = v.headers.find((h) => h.source === '/(.*)');
  return Object.fromEntries((global?.headers ?? []).map((h) => [h.key, h.value]));
}

function nginxHeaders(): Record<string, string> {
  const conf = readFileSync(join(root, 'nginx.conf'), 'utf8');
  const out: Record<string, string> = {};
  for (const m of conf.matchAll(/add_header\s+([\w-]+)\s+"([^"]*)"\s+always;/g)) out[m[1]] = m[2];
  return out;
}

describe('paridade de security headers vercel.json x nginx.conf', () => {
  it('nginx.conf serve exatamente os headers globais do vercel.json', () => {
    const v = vercelHeaders();
    expect(Object.keys(v).length).toBeGreaterThan(0);
    expect(nginxHeaders()).toEqual(v);
  });
});
