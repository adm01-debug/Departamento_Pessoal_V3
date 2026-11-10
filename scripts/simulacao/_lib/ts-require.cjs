// Carrega um módulo .ts do PRODUTO (Deno-style, import relativo com extensão
// .ts) dentro do Node, via @swc/core, para que os simuladores comparem contra
// o código real em vez de uma cópia reimplementada que pode ter divergido.
// Zero dependência nova: @swc/core já está em node_modules (devDependency
// transitiva do toolchain). Não usar fora de scripts/simulacao/.
'use strict';
const { transformSync } = require('@swc/core');
const Module = require('module');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

function tsRequire(absPath, stubs = {}) {
  // Exige caminho absoluto: um relativo resolveria contra process.cwd(), não
  // contra o diretório do script chamador, e quebraria dependendo de onde o
  // comando é rodado (ex.: `node scripts/simulacao/x.cjs` da raiz do repo vs.
  // de dentro de scripts/simulacao/). Quem chama monta o caminho com __dirname.
  if (!path.isAbsolute(absPath)) {
    throw new Error(`tsRequire: caminho deve ser absoluto (recebido: '${absPath}'); monte com path.join(__dirname, ...)`);
  }
  const resolved = path.resolve(absPath);
  // `stubs`: { caminhoAbsoluto: exportsFalso } — substitui um módulo real por
  // um objeto fixo sem carregá-lo, para dependências que arrastam efeitos
  // colaterais inúteis na simulação (ex.: cliente Supabase exigindo env vars
  // do Vite). Nunca usar para alterar a LÓGICA sob teste — só dependências
  // periféricas (ex.: assinatura de auditoria).
  if (stubs[resolved]) return stubs[resolved];
  const cached = Module._cache[resolved];
  if (cached) return cached.exports;

  const src = fs.readFileSync(resolved, 'utf8');
  const { code } = transformSync(src, {
    filename: resolved,
    module: { type: 'commonjs' },
    jsc: { target: 'es2022', parser: { syntax: 'typescript' } },
  });

  const mod = new Module(resolved, module.parent || module);
  mod.filename = resolved;
  mod.paths = Module._nodeModulePaths(path.dirname(resolved));
  Module._cache[resolved] = mod;

  // Dois estilos de import relativo no produto: Deno-style com extensão
  // explícita ('./inss.ts', nas edge functions) e TS-style sem extensão
  // ('./tabelas', no front). Resolve ambos contra .ts/.tsx antes de cair
  // no require normal do Node (pacotes de node_modules).
  mod.require = function (id) {
    if (id.startsWith('./') || id.startsWith('../') || id.startsWith('@/')) {
      // '@/x' é o alias do tsconfig/vite para 'src/x' (REPO_ROOT abaixo).
      const base = id.startsWith('@/')
        ? path.resolve(REPO_ROOT, 'src', id.slice(2))
        : path.resolve(path.dirname(resolved), id);
      for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) {
        if (candidate.endsWith('.ts') || candidate.endsWith('.tsx')) {
          if (stubs[path.resolve(candidate)] || fs.existsSync(candidate)) return tsRequire(candidate, stubs);
        } else if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          return Module.prototype.require.call(mod, candidate);
        }
      }
    }
    return Module.prototype.require.call(mod, id);
  };

  try {
    mod._compile(code, resolved);
  } catch (err) {
    delete Module._cache[resolved];
    throw err;
  }
  return mod.exports;
}

module.exports = { tsRequire };
