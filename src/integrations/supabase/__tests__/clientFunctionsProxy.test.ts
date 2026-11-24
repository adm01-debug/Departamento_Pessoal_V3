import { beforeEach, describe, expect, it, vi } from 'vitest';

// Base RELATIVA: em dev/E2E o client deve reescrever a URL absoluta de
// functions.invoke para o caminho local que o proxy do Vite encaminha
// (vite.config.ts → '/functions/v1'). Ver clientBridge.test.ts para o caso
// com base absoluta.
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-key');
vi.stubEnv('VITE_SUPABASE_FUNCTIONS_BASE', '/functions/v1');

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
vi.mock('@/services/loggerService', () => ({
  loggerService: { error: vi.fn(), warn: vi.fn() },
}));

const { supabaseBase } = await vi.importActual<typeof import('../client')>('../client');

function okJson(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

describe('client.ts — functions.invoke via proxy do Vite (base relativa)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    fetchMock = vi.fn(async () => okJson({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
  });

  it('reescreve a URL absoluta de functions para o caminho local', async () => {
    await supabaseBase.functions.invoke('minha-fn', { body: { a: 1 } });
    expect(fetchMock).toHaveBeenCalled();
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toBe('/functions/v1/minha-fn');
  });

  it('não reescreve chamadas fora do prefixo de functions (auth segue absoluta)', async () => {
    await supabaseBase.auth.signInWithPassword({ email: 'a@b.c', password: 'x' }).catch(() => null);
    expect(fetchMock).toHaveBeenCalled();
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toMatch(/^https:\/\/test\.supabase\.co\/auth\/v1\//);
    expect(url).not.toContain('/functions/v1/');
  });
});
