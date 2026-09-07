import { afterEach, describe, expect, it, vi } from 'vitest';
import { brokeredPreviewStorage } from '../previewAuthStorage';

const PROJECT_ID = '11111111-1111-4111-8111-111111111111';
const EDITOR_ORIGIN = 'https://editor.lovable.dev';

type BrokerMessage = {
  type: string;
  requestId: string;
  projectId: string;
  key: string;
  value?: string;
};

function installPreviewFrame(replyValue: string | null = 'brokered-session') {
  const frame = new EventTarget();
  const postMessage = vi.fn((message: BrokerMessage, targetOrigin: string) => {
    queueMicrotask(() => {
      frame.dispatchEvent(
        new MessageEvent('message', {
          origin: targetOrigin,
          data: {
            type: 'lovable-preview-auth:result',
            requestId: message.requestId,
            ok: true,
            value: replyValue,
          },
        })
      );
    });
  });

  Object.defineProperty(frame, 'parent', {
    configurable: true,
    value: { postMessage },
  });

  vi.stubGlobal('window', frame);
  vi.stubGlobal('location', {
    hostname: `project--${PROJECT_ID}.lovableproject.com`,
    ancestorOrigins: [EDITOR_ORIGIN],
  });

  return postMessage;
}

describe('brokeredPreviewStorage', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('usa localStorage fora de uma zona de preview confiável', () => {
    vi.stubGlobal('location', { hostname: 'app.example.com' });

    expect(brokeredPreviewStorage()).toBe(localStorage);
  });

  it('lê a sessão do editor confiável e envia apenas para sua origem', async () => {
    const postMessage = installPreviewFrame();
    const storage = brokeredPreviewStorage();

    await expect(storage?.getItem('sb-auth-token')).resolves.toBe('brokered-session');
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'lovable-preview-auth:get',
        projectId: PROJECT_ID,
        key: 'sb-auth-token',
      }),
      EDITOR_ORIGIN
    );
  });

  it('persiste localmente antes de sincronizar set e remove com o broker', async () => {
    const postMessage = installPreviewFrame(null);
    const storage = brokeredPreviewStorage();

    await storage?.setItem('session', 'value');
    expect(localStorage.getItem('session')).toBe('value');
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'lovable-preview-auth:set', value: 'value' }),
      EDITOR_ORIGIN
    );

    await storage?.removeItem('session');
    expect(localStorage.getItem('session')).toBeNull();
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'lovable-preview-auth:remove' }),
      EDITOR_ORIGIN
    );
  });

  it('trata tombstone do broker como logout e apaga a cópia local', async () => {
    localStorage.setItem('session', 'stale');
    installPreviewFrame('');
    const storage = brokeredPreviewStorage();

    await expect(storage?.getItem('session')).resolves.toBeNull();
    expect(localStorage.getItem('session')).toBeNull();
  });

  it('faz fallback para a cópia local quando o broker não responde', async () => {
    vi.useFakeTimers();
    localStorage.setItem('session', 'local-session');
    const frame = new EventTarget();
    Object.defineProperty(frame, 'parent', {
      configurable: true,
      value: { postMessage: vi.fn() },
    });
    vi.stubGlobal('window', frame);
    vi.stubGlobal('location', {
      hostname: `project--${PROJECT_ID}.lovableproject.com`,
      ancestorOrigins: [EDITOR_ORIGIN],
    });

    const result = brokeredPreviewStorage()?.getItem('session');
    await vi.runAllTimersAsync();

    await expect(result).resolves.toBe('local-session');
  });
});
