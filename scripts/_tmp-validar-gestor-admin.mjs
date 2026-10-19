/**
 * TEMPORÁRIO — VALIDAÇÃO NO NAVEGADOR: conta com ADMIN + GESTOR (o caso Abner).
 *
 * A sessão E2E é `admin@teste.local` (papel único `admin`). Para reproduzir a
 * conta de homologação (admin + gestor) SEM tocar em permissões remotas, o
 * roteiro intercepta a RESPOSTA de `get_user_roles` (RPC de LEITURA) e devolve
 * `['admin','gestor']`. A autorização real continua no servidor — o que se
 * valida aqui é o FRONT: a capacidade de GESTOR não é anulada pelo `admin`.
 *
 * A/B na mesma sessão:
 *   A) sem o papel gestor  → fila sem Aprovar/Devolver (comportamento antigo);
 *   B) com admin+gestor    → fila e modal com Aprovar/Devolver, sem perder o
 *      acesso administrativo (Enviar ao gestor segue disponível).
 *
 * Uso: node scripts/_tmp-validar-gestor-admin.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'tmp-validacao-gestor-abner';
mkdirSync(OUT, { recursive: true });
const relatorio = {};

const browser = await chromium.launch();

/** Abre a página com a LISTA de papéis que o `get_user_roles` deve devolver. */
async function abrirComPapeis(papeis) {
  const context = await browser.newContext({
    storageState: 'e2e/.auth/user.json',
    viewport: { width: 1456, height: 1000 },
  });
  await context.addInitScript(() => {
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-tour-completed', 'true');
  });
  if (papeis) {
    await context.route('**/rest/v1/rpc/get_user_roles*', (rota) =>
      rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(papeis) })
    );
  }
  const page = await context.newPage();
  await page.goto('http://localhost:8080/avaliacao', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /Gestão de Desempenho/ }).waitFor({ timeout: 30000 });
  await page.getByRole('tab', { name: /Feedbacks/i }).click();
  await page.getByText('Avaliado por').first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(2000);
  await page
    .getByRole('group', { name: 'Segmentar por tipo de feedback' })
    .getByRole('button', { name: /Aguardando gestor/ })
    .first()
    .click();
  await page.getByText('Gestor responsável').first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(1200);
  return { context, page };
}

/** Lê as linhas da fila (nome, selo e ações oferecidas). */
const lerFila = (page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll('[role="status"]')).map((s) => {
      const card = s.closest('div[class*="rounded-xl"]');
      return {
        nome: card?.querySelector('h3')?.textContent?.trim() ?? null,
        selo: (s.textContent ?? '').trim(),
        botoes: Array.from(card?.querySelectorAll('button') ?? []).map((b) =>
          (b.textContent ?? '').replace(/\s+/g, ' ').trim()
        ),
      };
    })
  );

/** O menu administrativo continua acessível? (prova de que o admin não foi perdido). */
const menuAdmin = (page) =>
  page.evaluate(() => {
    const textos = Array.from(document.querySelectorAll('a,span,p')).map((e) => (e.textContent ?? '').trim());
    return {
      temAdministracao: textos.some((t) => /Administra|Configura/i.test(t)),
      temColaboradores: textos.some((t) => t === 'Colaboradores'),
    };
  });

try {
  /* ── A) Sessão como está no banco (papel único `admin`) ─────────────────── */
  {
    const { context, page } = await abrirComPapeis(null);
    relatorio.A_adminSozinho = { fila: (await lerFila(page)).slice(0, 4), menu: await menuAdmin(page) };
    await page.screenshot({ path: `${OUT}/01-fila-admin-sozinho.png` });
    await context.close();
  }

  /* ── B) Mesma sessão, agora com admin + gestor (a conta Abner) ───────────── */
  {
    const { context, page } = await abrirComPapeis(['admin', 'gestor']);
    relatorio.B_adminMaisGestor = { fila: (await lerFila(page)).slice(0, 4), menu: await menuAdmin(page) };
    await page.screenshot({ path: `${OUT}/02-fila-admin-gestor.png` });

    // Modal: a decisão continua no rodapé aprovado (registro fictício da vitrine).
    await page.getByRole('button', { name: 'Ver avaliação' }).first().click();
    const dialogo = page.getByRole('dialog');
    await dialogo.waitFor({ timeout: 15000 });
    await page.waitForTimeout(900);
    relatorio.B_modal = await dialogo.evaluate((el) => {
      const botoes = Array.from(el.querySelectorAll('button')).map((b) =>
        (b.textContent ?? '').replace(/\s+/g, ' ').trim()
      );
      return { colaborador: el.querySelector('h2')?.textContent?.trim() ?? null, botoes };
    });
    await dialogo.screenshot({ path: `${OUT}/03-modal-admin-gestor.png` });
    await context.close();
  }
} catch (erro) {
  relatorio.erroFatal = String(erro?.message ?? erro).slice(0, 400);
  process.exitCode = 1;
} finally {
  await browser.close();
  writeFileSync(`${OUT}/relatorio.json`, JSON.stringify(relatorio, null, 2));
  console.log(JSON.stringify(relatorio, null, 2));
}
