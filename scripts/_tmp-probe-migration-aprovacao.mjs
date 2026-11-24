/**
 * TEMPORÁRIO — PROBE (SOMENTE LEITURA) DO ESTADO REAL DA APROVAÇÃO NO BANCO.
 *
 * Responde, com a sessão autenticada E2E, o que existe de fato no Supabase para
 * o fluxo de aprovação formal do gestor — sem nenhuma escrita/DML:
 *
 *   • tabelas `feedbacks_360_aprovacoes_gestor` / `feedbacks_360_consolidacoes`
 *     (migration `20261017090000_ninebox_aprovacao_gestor.sql`);
 *   • RPC `pode_aprovar_colaborador`.
 *
 * Uso: node scripts/_tmp-probe-migration-aprovacao.mjs
 */
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';

const env = readFileSync('.env', 'utf8');
const ANON = (env.match(/VITE_SUPABASE_ANON_KEY=(\S+)/) ?? [])[1] ?? '';
const BASE = (env.match(/VITE_SUPABASE_URL=(\S+)/) ?? [])[1] ?? '';

const relatorio = {};
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ storageState: 'e2e/.auth/user.json' });
  const page = await context.newPage();
  await page.goto('http://localhost:8080/avaliacao', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  relatorio.resultado = await page.evaluate(
    async ({ url, anon }) => {
      // Token da sessão gravada pelo supabase-js (chave `sb-<ref>-auth-token`).
      const chave = Object.keys(localStorage).find((k) => k.startsWith('sb-') && k.includes('auth-token'));
      const bruto = chave ? localStorage.getItem(chave) : null;
      const token = bruto ? JSON.parse(bruto)?.access_token : null;
      const cabecalho = { apikey: anon, Authorization: `Bearer ${token}` };

      const sondaTabela = async (tabela) => {
        const r = await fetch(`${url}/rest/v1/${tabela}?select=colaborador_id&limit=1`, { headers: cabecalho });
        const texto = await r.text();
        return { tabela, status: r.status, resposta: texto.slice(0, 180) };
      };
      const sondaRpc = async (rpc) => {
        const r = await fetch(`${url}/rest/v1/rpc/${rpc}`, {
          method: 'POST',
          headers: { ...cabecalho, 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const texto = await r.text();
        return { rpc, status: r.status, resposta: texto.slice(0, 180) };
      };

      return {
        temToken: !!token,
        tabelas: [
          await sondaTabela('feedbacks_360_aprovacoes_gestor'),
          await sondaTabela('feedbacks_360_consolidacoes'),
          await sondaTabela('feedbacks_360_validacoes_potencial'),
        ],
        rpcs: [await sondaRpc('pode_aprovar_colaborador')],
      };
    },
    { url: BASE, anon: ANON }
  );
} catch (erro) {
  relatorio.erro = String(erro?.message ?? erro).slice(0, 300);
} finally {
  await browser.close();
  writeFileSync('tmp-probe-migration-aprovacao.json', JSON.stringify(relatorio, null, 2));
  console.log(JSON.stringify(relatorio, null, 2));
}
