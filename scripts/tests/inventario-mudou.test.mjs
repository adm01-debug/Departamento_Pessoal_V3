// Contrato de scripts/inventario/mudou-conteudo.mjs: o workflow semanal so abre PR quando o
// inventario mudou alem das datas e da telemetria viva (inclusive no edges.json, gravado numa linha so).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mudou, semCarimbos } from '../inventario/mudou-conteudo.mjs';

const ler = (mapa) => (f) => (f in mapa ? mapa[f] : null);
const um = (antes, depois) => mudou(['f'], ler({ f: JSON.stringify(antes) }), ler({ f: JSON.stringify(depois) }));

test('so a data mudou (edges.json numa linha so): nao abre PR', () => {
  assert.equal(um({ gerado_em: '2026-11-01T00:00:00Z', total: 65 }, { gerado_em: '2026-11-08T00:00:00Z', total: 65 }), false);
  assert.equal(um({ medido_em: '1', resumo: { medido_em: '1' } }, { medido_em: '2', resumo: { medido_em: '2' } }), false);
});

test('mudanca real no mesmo arquivo da data: abre PR', () => {
  assert.equal(um({ gerado_em: '1', total: 65 }, { gerado_em: '2', total: 66 }), true);
});

test('arquivo novo ou apagado conta como mudanca', () => {
  assert.equal(mudou(['f'], ler({}), ler({ f: '{}' })), true);
  assert.equal(mudou(['f'], ler({ f: '{}' }), ler({})), true);
});

test('telemetria do cron e estimativas de linhas/bytes nao abrem PR', () => {
  const base = (n) => ({
    resumo: { tamanho_bytes: 1000 * n },
    tabelas: [{ nome: 'colaboradores', linhas: 10 * n, bytes: 8192 * n, rls: true }],
    cron_execucoes: { por_job: [{ nome: 'x', taxa_falha_7d_pct: n, execucoes_24h: 280 + n }], horas_paradas_7d: [], historico: { linhas: n, bytes: n, mais_de_7_dias: n } },
    alertas: [{ tipo: 'cron_falhando', detalhe: [`x (${n}.5% em 7d)`] }],
  });
  assert.equal(um(base(1), base(2)), false);
});

test('mudanca estrutural (RLS, alerta novo, job saindo da lista) abre PR', () => {
  const a = { tabelas: [{ nome: 't', rls: true }], alertas: [] };
  assert.equal(um(a, { tabelas: [{ nome: 't', rls: false }], alertas: [] }), true);
  assert.equal(um(a, { ...a, alertas: [{ tipo: 'tabela_sem_rls', detalhe: ['t'] }] }), true);
  const c = (jobs) => ({ alertas: [{ tipo: 'cron_falhando', detalhe: jobs }] });
  assert.equal(um(c(['a (9% em 7d)', 'b (6% em 7d)']), c(['a (12% em 7d)'])), true);
});

test('texto que nao e JSON volta como esta', () => {
  assert.equal(semCarimbos('nao json'), 'nao json');
  assert.equal(semCarimbos(null), null);
});
