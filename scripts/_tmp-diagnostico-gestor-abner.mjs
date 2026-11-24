/**
 * TEMPORÁRIO — DIAGNÓSTICO (SOMENTE LEITURA) DO ACESSO DE GESTOR DA CONTA ABNER.
 *
 * Responde, com a sessão E2E autenticada (admin), SEM escrita:
 *  1. papéis que o RPC `get_user_roles` devolve para a conta alvo (bruto);
 *  2. vínculo `colaboradores.user_id` da conta alvo (o que prova o gestor);
 *  3. o descartável de homologação (CPF sentinela 00000000000);
 *  4. avaliações reais existentes (feedbacks_360 com tipo gestor);
 *  5. cadeia de supervisão (supervisor_id) dos candidatos.
 *
 * Uso: node scripts/_tmp-diagnostico-gestor-abner.mjs
 */
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';

const ALVO = '2a1f0c4f-7587-49a7-81aa-e7e35cf0848d';
const EMPRESA = '66104399-aba8-4105-bbd3-9bf67820c1d0';

const env = readFileSync('.env', 'utf8');
const ANON = (env.match(/VITE_SUPABASE_ANON_KEY=(\S+)/) ?? [])[1] ?? '';
const BASE = (env.match(/VITE_SUPABASE_URL=(\S+)/) ?? [])[1] ?? '';

const browser = await chromium.launch();
let relatorio = {};
try {
  const context = await browser.newContext({ storageState: 'e2e/.auth/user.json' });
  const page = await context.newPage();
  await page.goto('http://localhost:8080/avaliacao', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  relatorio = await page.evaluate(
    async ({ url, anon, alvo, empresa }) => {
      const chave = Object.keys(localStorage).find((k) => k.startsWith('sb-') && k.includes('auth-token'));
      const sessao = chave ? JSON.parse(localStorage.getItem(chave) ?? '{}') : {};
      const token = sessao?.access_token ?? null;
      const uidSessao = sessao?.user?.id ?? null;
      const cab = { apikey: anon, Authorization: `Bearer ${token}` };

      const get = async (caminho) => {
        const r = await fetch(`${url}/rest/v1/${caminho}`, { headers: cab });
        return { status: r.status, corpo: (await r.text()).slice(0, 600) };
      };
      const rpc = async (nome, corpo) => {
        const r = await fetch(`${url}/rest/v1/rpc/${nome}`, {
          method: 'POST',
          headers: { ...cab, 'Content-Type': 'application/json' },
          body: JSON.stringify(corpo),
        });
        return { status: r.status, corpo: (await r.text()).slice(0, 400) };
      };

      return {
        sessaoE2E: { email: sessao?.user?.email ?? null, uid: uidSessao },
        papeisDoSessao: await rpc('get_user_roles', { _user_id: uidSessao }),
        papeisDaContaAlvo: await rpc('get_user_roles', { _user_id: alvo }),
        vinculoDaContaAlvo: await get(
          `colaboradores?select=id,nome_completo,empresa_id,user_id,supervisor_id,cpf&user_id=eq.${alvo}`
        ),
        descartavelHomologacao: await get(
          'colaboradores?select=id,nome_completo,empresa_id,user_id,supervisor_id,cpf&cpf=eq.00000000000'
        ),
        colaboradoresDaEmpresa: await get(
          `colaboradores?select=id,nome_completo,empresa_id,user_id,supervisor_id&empresa_id=eq.${empresa}&limit=40`
        ),
        avaliacoesGestorConcluidas: await get(
          'feedbacks_360?select=id,empresa_id,ciclo_id,avaliado_id,avaliador_id,tipo,status,updated_at&tipo=eq.gestor&status=eq.concluido&order=updated_at.desc&limit=15'
        ),
        colaboradorDoVinculoDaContaAlvo: await rpc('pode_aprovar_colaborador', { _colaborador_id: alvo }),
      };
    },
    { url: BASE, anon: ANON, alvo: ALVO, empresa: EMPRESA }
  );
} catch (erro) {
  relatorio.erro = String(erro?.message ?? erro).slice(0, 300);
} finally {
  await browser.close();
  writeFileSync('tmp-diagnostico-gestor-abner.json', JSON.stringify(relatorio, null, 2));
  console.log(JSON.stringify(relatorio, null, 2));
}
