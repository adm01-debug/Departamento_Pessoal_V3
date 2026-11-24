/**
 * TEMPORÁRIO — DIAGNÓSTICO (SOMENTE LEITURA) DA HOMOLOGAÇÃO REAL.
 *
 * Responde, com a sessão autenticada, SEM escrever nada:
 *  1. papéis de gestor/RH/admin existentes (tabela `user_roles` via RPC);
 *  2. vínculo `colaboradores.user_id`/`supervisor_id` de Abner e do RH;
 *  3. registros de homologação (descartável + avaliações existentes);
 *  4. existência dos objetos da migration de aprovação.
 *
 * Uso: node scripts/_tmp-diagnostico-homologacao-real.mjs
 */
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';

const ABNER = '2a1f0c4f-7587-49a7-81aa-e7e35cf0848d';
const RH_EMAIL = 'rh.ninebox.teste@promobrindes.com.br';
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
  await page.waitForTimeout(2500);

  relatorio = await page.evaluate(
    async ({ url, anon, abner, rhEmail, empresa }) => {
      const chave = Object.keys(localStorage).find((k) => k.startsWith('sb-') && k.includes('auth-token'));
      const sessao = chave ? JSON.parse(localStorage.getItem(chave) ?? '{}') : {};
      const cab = { apikey: anon, Authorization: `Bearer ${sessao?.access_token ?? ''}` };
      const get = async (caminho) => {
        const r = await fetch(`${url}/rest/v1/${caminho}`, { headers: cab });
        return { status: r.status, corpo: (await r.text()).slice(0, 700) };
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
        papeisAbner: await rpc('get_user_roles', { _user_id: abner }),
        papeisSessaoE2E: await rpc('get_user_roles', { _user_id: sessao?.user?.id ?? abner }),
        usuariosComPapelGestorOuRh: await get(
          'user_roles?select=user_id,role&role=in.(gestor,rh)&order=role.asc'
        ),
        vinculoAbner: await get(
          `colaboradores?select=id,nome_completo,email_corporativo,empresa_id,user_id,supervisor_id,cpf&user_id=eq.${abner}`
        ),
        colaboradorDoRh: await get(
          `colaboradores?select=id,nome_completo,email_corporativo,empresa_id,user_id,supervisor_id&email_corporativo=eq.${rhEmail}`
        ),
        descartavelHomolog: await get(
          'colaboradores?select=id,nome_completo,empresa_id,user_id,supervisor_id,cpf&cpf=eq.00000000000'
        ),
        colaboradoresDaEmpresa: await get(
          `colaboradores?select=id,nome_completo,user_id,supervisor_id&empresa_id=eq.${empresa}&limit=30`
        ),
        avaliacoesGestorConcluidas: await get(
          'feedbacks_360?select=id,empresa_id,ciclo_id,avaliado_id,avaliador_id,tipo,status,revisao,updated_at&tipo=eq.gestor&status=eq.concluido&order=updated_at.desc&limit=10'
        ),
        objetosDaMigration: {
          consolidacoes: await get('feedbacks_360_consolidacoes?select=colaborador_id&limit=1'),
          aprovacoes: await get('feedbacks_360_aprovacoes_gestor?select=colaborador_id&limit=1'),
          podeAprovar: await rpc('pode_aprovar_colaborador', { p_colaborador_id: abner }),
          situacao: await rpc('situacao_aprovacao', { p_colaborador_id: abner, p_ciclo_id: abner }),
        },
      };
    },
    { url: BASE, anon: ANON, abner: ABNER, rhEmail: RH_EMAIL, empresa: EMPRESA }
  );
} catch (erro) {
  relatorio.erro = String(erro?.message ?? erro).slice(0, 300);
} finally {
  await browser.close();
  writeFileSync('tmp-homologacao-real/diagnostico.json', JSON.stringify(relatorio, null, 2));
  console.log(JSON.stringify(relatorio, null, 2));
}
