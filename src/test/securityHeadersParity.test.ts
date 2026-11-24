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

describe('vercel.json aplica os headers em produção', () => {
  const v = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8')) as Record<string, unknown>;

  it('não usa "routes" legado (a Vercel ignora "headers" quando "routes" existe)', () => {
    expect(v).not.toHaveProperty('routes');
  });

  it('mantém o fallback de SPA via "rewrites"', () => {
    const rewrites = v.rewrites as { source: string; destination: string }[];
    const spa = rewrites.find((r) => r.destination === '/index.html');
    expect(spa).toBeDefined();
    // As rotas da SPA continuam caindo na index.html...
    expect(new RegExp(`^${spa!.source}$`).test('/dashboard')).toBe(true);
    expect(new RegExp(`^${spa!.source}$`).test('/colaboradores/123')).toBe(true);
  });

  it('não devolve a index.html para asset inexistente', () => {
    // ...mas /assets/ fica FORA do rewrite: um arquivo com hash de um deploy
    // antigo tem de dar 404. Servido como 200 text/html, o browser recusa o
    // módulo por MIME e o app inteiro deixa de dar boot.
    const rewrites = v.rewrites as { source: string; destination: string }[];
    const spa = rewrites.find((r) => r.destination === '/index.html');
    expect(new RegExp(`^${spa!.source}$`).test('/assets/index-ABC123.js')).toBe(false);
  });

  it('nginx.conf serve /assets/ com a mesma regra', () => {
    const conf = readFileSync(join(root, 'nginx.conf'), 'utf8');
    expect(conf).toMatch(/location\s+\/assets\/\s*\{[^}]*try_files\s+\$uri\s+=404;/);
  });
});
