import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { assistenteIAService } from '../assistenteIAService';

vi.mock('../loggerService', () => ({
  loggerService: { debug: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'anon-key');

const getSession = supabase.auth.getSession as ReturnType<typeof vi.fn>;

function sessionWith(token = 'jwt-1') {
  getSession.mockResolvedValue({
    data: { session: { access_token: token } },
    error: null,
  });
}

const okRes = (body: string) => new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } });

const req = { message: 'Como calcular férias?', empresaRegime: 'clt' as const };

describe('assistenteIAService', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    sessionWith();
  });

  it('envia message+history+regime com Bearer do JWT e parseia resposta', async () => {
    fetchMock.mockResolvedValue(okRes(JSON.stringify({ response: 'resposta IA', tokens: { in: 1 } })));
    const res = await assistenteIAService.sendMessage({
      ...req,
      history: Array.from({ length: 15 }, (_, i) => ({ role: 'user' as const, content: `h${i}` })),
    });
    expect(res.response).toBe('resposta IA');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://test.supabase.co/functions/v1/assistente-ia');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt-1');
    const body = JSON.parse(init.body as string);
    expect(body.message).toBe('Como calcular férias?');
    expect(body.regime).toBe('clt');
    expect(body.history).toHaveLength(10); // MAX_HISTORY
  });

  it('sem sessão → UNAUTHORIZED recoverable sem chamar fetch', async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null });
    await expect(assistenteIAService.sendMessage(req)).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      recoverable: true,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('401 → UNAUTHORIZED; 5xx → SERVER recoverable; 4xx → SERVER não-recoverable', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 401 }));
    await expect(assistenteIAService.sendMessage(req)).rejects.toMatchObject({ code: 'UNAUTHORIZED' });

    fetchMock.mockResolvedValue(new Response('', { status: 503 }));
    await expect(assistenteIAService.sendMessage(req)).rejects.toMatchObject({ code: 'SERVER', recoverable: true });

    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: 'payload inválido' }), { status: 400 }));
    await expect(assistenteIAService.sendMessage(req)).rejects.toMatchObject({
      code: 'SERVER',
      recoverable: false,
      message: 'payload inválido',
    });
  });

  it('resposta não-JSON vira {response: texto}; vazia cai no fallback', async () => {
    fetchMock.mockResolvedValue(okRes('texto puro da edge'));
    const res = await assistenteIAService.sendMessage(req);
    expect(res.response).toBe('texto puro da edge');

    fetchMock.mockResolvedValue(okRes(JSON.stringify({ tokens: {} })));
    const res2 = await assistenteIAService.sendMessage(req);
    expect(res2.response).toContain('Entendi sua dúvida');
  });

  it('abort/timeout → TIMEOUT recoverable', async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    await expect(assistenteIAService.sendMessage(req)).rejects.toMatchObject({
      code: 'TIMEOUT',
      recoverable: true,
    });
  });

  it('erro de rede genérico → NETWORK', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(assistenteIAService.sendMessage(req)).rejects.toMatchObject({
      code: 'NETWORK',
      recoverable: true,
    });
  });

  it('isAuthenticated reflete a sessão; validateMessage aplica limites', async () => {
    expect(await assistenteIAService.isAuthenticated()).toBe(true);
    getSession.mockResolvedValue({ data: { session: null }, error: null });
    expect(await assistenteIAService.isAuthenticated()).toBe(false);

    expect(assistenteIAService.validateMessage('  ').ok).toBe(false);
    expect(assistenteIAService.validateMessage('oi').ok).toBe(false);
    expect(assistenteIAService.validateMessage('x'.repeat(2001)).ok).toBe(false);
    expect(assistenteIAService.validateMessage('pergunta válida?').ok).toBe(true);
  });
});
