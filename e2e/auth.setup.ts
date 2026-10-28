import { test as setup, expect, type Page } from '@playwright/test';
import { createHmac } from 'node:crypto';
import path from 'node:path';

const AUTH_FILE = path.resolve('e2e/.auth/user.json');
const AUTH_FILE_MOBILE = path.resolve('e2e/.auth/user-mobile.json');

const EMAIL = process.env.E2E_USER_EMAIL ?? 'admin@teste.local';
const PASSWORD = process.env.E2E_USER_PASSWORD;
if (!PASSWORD) throw new Error('E2E_USER_PASSWORD não definido — configure o secret (senha não fica no repo).');
const TOTP_SECRET = process.env.E2E_TOTP_SECRET;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/** TOTP RFC 6238 (SHA-1, 30s, 6 dígitos) a partir de seed base32. */
function totpCode(seed: string): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const c of seed.replace(/=+$/, '').toUpperCase()) {
    const idx = alphabet.indexOf(c);
    if (idx === -1) throw new Error('E2E_TOTP_SECRET não é base32 válido');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const hmac = createHmac('sha1', Buffer.from(bytes)).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  return String((hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, '0');
}

/**
 * Eleva a sessão do browser para aal2 quando a conta de teste tem TOTP
 * verificado. Rotas /admin/* exigem MFA (AdminRoute →
 * getAuthenticatorAssuranceLevel): com aal1 e fator verificado o app desvia
 * para a tela de challenge e nenhum heading de admin renderiza. Completa
 * challenge+verify no GoTrue com o token DA SESSÃO DO BROWSER e grava os
 * novos tokens (aal2) de volta no localStorage antes do storageState.
 * No-op sem E2E_TOTP_SECRET ou se a sessão já estiver em aal2.
 */
async function elevateToAal2IfNeeded(page: Page): Promise<void> {
  if (!TOTP_SECRET || !SUPABASE_URL || !SUPABASE_KEY) return;

  const stored = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.startsWith('sb-') && k.endsWith('-auth-token'));
    return key ? { key, raw: localStorage.getItem(key) ?? '' } : null;
  });
  if (!stored) return;

  const session = JSON.parse(stored.raw) as {
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
    expires_in?: number;
  };
  if (!session.access_token) return;

  const claims = JSON.parse(Buffer.from(session.access_token.split('.')[1] ?? '', 'base64url').toString()) as {
    aal?: string;
  };
  if (claims.aal === 'aal2') return;

  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
  const base = `${SUPABASE_URL}/auth/v1`;

  const me = (await (await fetch(`${base}/user`, { headers })).json()) as {
    factors?: Array<{ id: string; factor_type: string; status: string }>;
  };
  const factor = me.factors?.find((f) => f.factor_type === 'totp' && f.status === 'verified');
  if (!factor) return; // conta sem TOTP verificado — permanece aal1

  const challenge = (await (
    await fetch(`${base}/factors/${factor.id}/challenge`, { method: 'POST', headers, body: '{}' })
  ).json()) as { id: string };

  const verified = (await (
    await fetch(`${base}/factors/${factor.id}/verify`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ challenge_id: challenge.id, code: totpCode(TOTP_SECRET) }),
    })
  ).json()) as Partial<typeof session>;

  if (!verified.access_token) {
    throw new Error(`MFA verify do E2E falhou: ${JSON.stringify(verified)}`);
  }

  Object.assign(session, {
    access_token: verified.access_token,
    refresh_token: verified.refresh_token ?? session.refresh_token,
    expires_at: verified.expires_at ?? session.expires_at,
    expires_in: verified.expires_in ?? session.expires_in,
  });
  await page.evaluate(
    ([k, v]) => localStorage.setItem(k as string, v as string),
    [stored.key, JSON.stringify(session)]
  );
}

/**
 * Aguarda o store Zustand (empresa-storage) persistir um empresaAtualId
 * válido no localStorage. Sem isso, cada spec autenticado começa "frio" —
 * dispara user-empresas + todas-empresas antes de habilitar dados, o que
 * pode ultrapassar os timeouts de heading (15s) nos testes de módulo.
 *
 * Navega para /colaboradores para forçar a montagem de useEmpresas e o
 * useEffect de auto-seleção, depois aguarda até 25s pelo ID.
 */
async function waitForEmpresaStorage(page: Page): Promise<void> {
  const hasEmpresaId = () =>
    page.waitForFunction(
      () => {
        try {
          const raw = localStorage.getItem('empresa-storage');
          if (!raw) return false;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          return !!JSON.parse(raw)?.state?.empresaAtualId;
        } catch {
          return false;
        }
      },
      undefined,
      { timeout: 25_000 }
    );

  const alreadySelected = await page.evaluate(() => {
    try {
      const raw = localStorage.getItem('empresa-storage');
      if (!raw) return false;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      return !!JSON.parse(raw)?.state?.empresaAtualId;
    } catch {
      return false;
    }
  });

  if (!alreadySelected) {
    await page.goto('/colaboradores', { waitUntil: 'domcontentloaded' });
    await hasEmpresaId();
  }
}

/**
 * Autentica e persiste a sessão (cookies + localStorage).
 * Os specs autenticados reusam esse arquivo, evitando múltiplos logins.
 *
 * Cada família de projetos recebe um storageState PRÓPRIO (login separado):
 * refresh tokens do Supabase são single-use; se dois projetos partilham a
 * mesma sessão e um deles a rotaciona, o GoTrue revoga a família inteira e
 * o projeto que rodar depois é expulso para /login.
 *
 * Usar { page } em ambos os setups é suficiente: Playwright cria um contexto
 * de browser SEPARADO por teste, gerando sessões Supabase independentes.
 */
async function login(page: Page, file: string) {
  await page.goto('/login');

  // Marca o GuidedTour como concluído ANTES de salvar o storageState:
  // sem isso, o tour auto-abre 2s após o load e seu backdrop (z-[200])
  // intercepta todos os cliques dos testes autenticados.
  await page.evaluate(() => localStorage.setItem('dp-tour-completed', 'true'));

  // Caso a sessão já esteja persistida pelo dev, o app redireciona para /dashboard.
  if (page.url().includes('/dashboard')) {
    await elevateToAal2IfNeeded(page);
    await waitForEmpresaStorage(page);
    await page.context().storageState({ path: file });
    return;
  }

  const emailInput = page.getByLabel(/e-?mail/i).first();
  await expect(emailInput, 'tela de login deve estar visível').toBeVisible({ timeout: 15_000 });

  await emailInput.fill(EMAIL);
  await page
    .getByLabel(/senha|password/i)
    .first()
    .fill(PASSWORD);
  await page
    .getByRole('button', { name: /entrar|login|acessar/i })
    .first()
    .click();

  // Com fator TOTP verificado, o signIn lança `mfa_required` e a LoginPage
  // mostra o formulário de código SEM sair de /login — esperar só a
  // navegação estouraria o timeout. Corremos as duas possibilidades e, se
  // o desafio aparecer, completamos pela UI (fluxo real do usuário).
  const totpInput = page.locator('#totp');
  const leftLogin = page
    .waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20_000 })
    .then(() => 'navigated')
    .catch(() => 'nav-failed');
  const mfaShown = totpInput
    .waitFor({ state: 'visible', timeout: 20_000 })
    .then(() => 'mfa')
    .catch(() => 'mfa-timeout');

  if ((await Promise.race([leftLogin, mfaShown])) === 'mfa') {
    if (!TOTP_SECRET) {
      throw new Error('Login caiu no desafio TOTP mas E2E_TOTP_SECRET não está configurado.');
    }
    await totpInput.fill(totpCode(TOTP_SECRET));
    await page.getByRole('button', { name: /verificar/i }).click();
    // Não esperamos o timeout de navegação para decidir retry: em código
    // inválido o formulário mostra alerta "Código inválido" na hora —
    // regenere imediatamente para não consumir o budget do setup.
    const mfaError = page
      .locator('form [role="alert"]')
      .waitFor({ state: 'visible', timeout: 20_000 })
      .then(() => 'error')
      .catch(() => 'no-error');
    if ((await Promise.race([leftLogin, mfaError])) === 'error') {
      await totpInput.fill(totpCode(TOTP_SECRET));
      await page.getByRole('button', { name: /verificar/i }).click();
    }
    if ((await leftLogin) !== 'navigated') {
      throw new Error('Desafio TOTP não completou — a página não saiu de /login.');
    }
  } else if ((await leftLogin) !== 'navigated') {
    throw new Error('Login não saiu de /login e o desafio TOTP não apareceu.');
  }

  // Aguarda a sessão Supabase ser gravada no localStorage antes de persisti-la
  await page.waitForFunction(() => Object.keys(localStorage).some((k) => k.startsWith('sb-')), undefined, {
    timeout: 10_000,
  });

  // Eleva a sessão para aal2 antes de navegar — rotas /admin/* exigem MFA.
  await elevateToAal2IfNeeded(page);

  // Aguarda empresa ser selecionada e persistida (empresa-storage.empresaAtualId)
  // antes de salvar o storageState — sem isso cada spec começa sem empresa e
  // precisa de 2 roundtrips extras ao Supabase antes de renderizar dados.
  await waitForEmpresaStorage(page);

  await page.context().storageState({ path: file });
}

setup('autentica usuário de teste', async ({ page }) => {
  await login(page, AUTH_FILE);
});

setup('autentica usuário de teste (mobile)', async ({ page }) => {
  await login(page, AUTH_FILE_MOBILE);
});
