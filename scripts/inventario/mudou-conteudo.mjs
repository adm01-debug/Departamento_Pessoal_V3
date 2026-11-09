#!/usr/bin/env node
/**
 * O inventario mudou de verdade? Compara cada arquivo de inventario/estado/ com a versao do
 * HEAD depois de tirar so os carimbos de data (`medido_em`, `gerado_em`, em qualquer nivel).
 * Imprime `true` ou `false` (usado pelo inventario-estado-semanal.yml para decidir se abre PR).
 *
 * Uso: node scripts/inventario/mudou-conteudo.mjs [arquivo...]   (padrao: banco, rotas e edges)
 * Os caminhos sao relativos a raiz do repo (a pasta dois niveis acima deste script), nao ao cwd.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const PADRAO = ['inventario/estado/banco.json', 'inventario/estado/rotas.json', 'inventario/estado/edges.json'];
const CARIMBOS = new Set(['medido_em', 'gerado_em']);
// Telemetria viva do cron: muda quase toda semana so pela janela rolante de 7 dias, sem mudanca
// estrutural nenhuma (mesmo achado do Zapp Web V2 em 2026-11-02). No DP tambem entram `linhas`,
// `bytes` e `tamanho_bytes`: o ci_auditor so ve a estimativa do planner (reltuples), que oscila a cada
// ANALYZE — comparar esses numeros abriria PR toda semana sem nada ter mudado. A lista de alertas,
// tabelas_orfas e o resto de `banco.json`/`rotas.json`/`edges.json` continuam comparados normalmente.
const TELEMETRIA = new Set([
  'execucoes_24h', 'falhas_24h', 'execucoes_7d', 'falhas_7d', 'taxa_falha_7d_pct',
  'ultima_falha', 'duracao_max_s_7d', 'horas_paradas_7d', 'mais_de_7_dias',
  'linhas', 'bytes', 'tamanho_bytes',
]);
const IGNORADOS = new Set([...CARIMBOS, ...TELEMETRIA]);
// `historico` do cron: mantido por compatibilidade com o formato do Zapp (linhas/bytes ja sao telemetria).
function limparHistoricoCron(historico) {
  if (!historico || typeof historico !== 'object') return historico;
  const { linhas, bytes, ...resto } = historico;
  return resto;
}

// A telemetria tambem vaza pro TEXTO de alertas[].detalhe, que a lista acima (por nome de campo) nao
// alcanca: `cron_falhando` grava "nome (9.0% em 7d)" e `cron_parado` a lista de horas da janela rolante.
// So normaliza o TEXTO; job entrando/saindo da lista ou o alerta aparecendo/sumindo continua sendo pego.
const PORCENTAGEM_7D = /\s*\([\d.]+%\s*em\s*7d\)\s*$/;
function normalizarAlerta(a) {
  if (!a || typeof a !== 'object' || !('tipo' in a) || !Array.isArray(a.detalhe)) return a;
  if (a.tipo === 'cron_falhando') {
    return { ...a, detalhe: a.detalhe.map((d) => (typeof d === 'string' ? d.replace(PORCENTAGEM_7D, '') : d)) };
  }
  // `mais_de_7_dias` rola todo dia: o numero no texto do alerta tambem e telemetria.
  if (a.tipo === 'cron_parado' || a.tipo === 'historico_cron_sem_limpeza') return { ...a, detalhe: [] };
  return a;
}

/** JSON canonico sem os carimbos de data e sem a telemetria viva. Texto que nao e JSON volta como esta. */
export function semCarimbos(texto) {
  if (texto === null) return null;
  let dado;
  try { dado = JSON.parse(texto); } catch { return texto; }
  const limpar = (v, chave) => {
    if (Array.isArray(v)) return v.map((x) => limpar(chave === 'alertas' ? normalizarAlerta(x) : x));
    if (v && typeof v === 'object') {
      const base = chave === 'historico' ? limparHistoricoCron(v) : v;
      return Object.fromEntries(
        Object.keys(base).filter((k) => !IGNORADOS.has(k)).sort().map((k) => [k, limpar(base[k], k)]),
      );
    }
    return v;
  };
  return JSON.stringify(limpar(dado));
}

/** true se algum arquivo mudou alem dos carimbos (arquivo novo ou apagado conta). */
export function mudou(arquivos, lerAntes, lerDepois) {
  return arquivos.some((f) => semCarimbos(lerAntes(f)) !== semCarimbos(lerDepois(f)));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arquivos = process.argv.length > 2 ? process.argv.slice(2) : PADRAO;
  // `git show HEAD:<f>` e sempre relativo a raiz; ler o "depois" pelo cwd dava `true` fora da raiz.
  const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const lerAntes = (f) => {
    // maxBuffer: o padrao (1 MiB) estoura com arquivo maior, o catch devolve null ("arquivo novo") e sai `true` toda semana.
    try { return execFileSync('git', ['show', `HEAD:${f}`], { cwd: RAIZ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 256 * 1024 * 1024 }); } catch { return null; }
  };
  const lerDepois = (f) => (fs.existsSync(path.join(RAIZ, f)) ? fs.readFileSync(path.join(RAIZ, f), 'utf8') : null);
  console.log(String(mudou(arquivos, lerAntes, lerDepois)));
}
