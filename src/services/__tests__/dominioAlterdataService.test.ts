import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  alterdataService,
  dominioService,
  DominioApiError,
  DominioAuthError,
  type AlterdataItemFolha,
  type DominioLancamento,
} from '../dominioAlterdataService';

const DOM = { apiUrl: 'https://dom.api', apiKey: 'key-1', empresaId: 'e1' };
const ALT = { apiUrl: 'https://alt.api', clientId: 'cid', clientSecret: 'sec', empresaId: 'e1' };

const okJson = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
const bad = (status: number, body = '') => new Response(body, { status });

describe('dominioAlterdataService', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    alterdataService.accessToken = null;
    alterdataService.tokenExpiresAt = 0;
  });

  it('dominio.authenticate envia Basic btoa(apiKey:) e devolve access_token', async () => {
    fetchMock.mockResolvedValue(okJson({ access_token: 'tok-d', expires_in: 3600 }));
    const tok = await dominioService.authenticate(DOM);
    expect(tok).toBe('tok-d');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://dom.api/auth/token');
    expect((init.headers as Record<string, string>).Authorization).toBe(`Basic ${btoa('key-1:')}`);
  });

  it('dominio.authenticate 4xx → DominioAuthError', async () => {
    fetchMock.mockResolvedValue(bad(403));
    await expect(dominioService.authenticate(DOM)).rejects.toBeInstanceOf(DominioAuthError);
  });

  it('dominio.criarLancamento envia Bearer + Idempotency-Key; 4xx → DominioApiError', async () => {
    fetchMock.mockResolvedValue(okJson({ id: 'l1', status: 'ok' }));
    const lanc: DominioLancamento = {
      idExterno: 'x1',
      data: '2026-10-01',
      competencia: '2026-10',
      valor: 100,
      natureza: 'D',
      conta: '1.1',
      historico: 'h',
    };
    const res = await dominioService.criarLancamento(DOM, 'tok', lanc);
    expect(res.id).toBe('l1');
    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer tok');
    expect(headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);

    fetchMock.mockResolvedValue(bad(400));
    await expect(dominioService.criarLancamento(DOM, 'tok', lanc)).rejects.toBeInstanceOf(DominioApiError);
  });

  it('dominio.syncLancamentos conta ok/erro por item e lote rejeitado marca todos', async () => {
    // 1ª chamada: sync com 1 ok + 1 erro; 2ª: lote HTTP 400 → 1 falha
    fetchMock
      .mockResolvedValueOnce(
        okJson({
          resultados: [
            { id: 'a', status: 'ok' },
            { id: 'b', status: 'erro', erros: ['conta inválida'] },
          ],
        })
      )
      .mockResolvedValueOnce(bad(400));
    const lancamentos = (ids: string[]): DominioLancamento[] =>
      ids.map((id) => ({
        idExterno: id,
        data: '2026-10-01',
        competencia: '2026-10',
        valor: 1,
        natureza: 'C',
        conta: '1',
        historico: '',
      }));

    // 501 itens → 2 lotes (500 + 1): o segundo é rejeitado
    const itens = lancamentos(Array.from({ length: 501 }, (_, i) => `r${i}`));
    const res = await dominioService.syncLancamentos(DOM, 'tok', itens);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(res.sucesso).toBe(1);
    expect(res.falha).toBe(1 + 1); // item 'b' + item do 2º lote
    expect(res.erros.some((e) => e.mensagem.includes('conta inválida'))).toBe(true);
    expect(res.erros.some((e) => e.mensagem.includes('Lote rejeitado'))).toBe(true);
  });

  it('alterdata.authenticate cacheia token e reautentica após expiração', async () => {
    fetchMock.mockResolvedValue(okJson({ access_token: 'tok-a', expires_in: 120 }));
    const t1 = await alterdataService.authenticate(ALT);
    const t2 = await alterdataService.authenticate(ALT);
    expect(t1).toBe('tok-a');
    expect(t2).toBe('tok-a');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    alterdataService.tokenExpiresAt = Date.now() - 1;
    fetchMock.mockResolvedValue(okJson({ access_token: 'tok-b', expires_in: 120 }));
    expect(await alterdataService.authenticate(ALT)).toBe('tok-b');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('alterdata.syncFolhaComoDespesa conta falha por item e continua', async () => {
    alterdataService.accessToken = 'tok';
    alterdataService.tokenExpiresAt = Date.now() + 60_000;
    fetchMock
      .mockResolvedValueOnce(okJson({ id: 'd1', status: 'ok' }))
      .mockResolvedValueOnce(bad(400)) // falha não-retryable → item falha
      .mockResolvedValueOnce(okJson({ id: 'd3', status: 'ok' }));

    const itens: AlterdataItemFolha[] = [1, 2, 3].map((i) => ({
      folhaItemId: `f${i}`,
      nomeColaborador: `Colab ${i}`,
      cpf: '00000000000',
      valorLiquido: 1000,
      dataVencimento: '2026-10-05',
    }));
    const res = await alterdataService.syncFolhaComoDespesa(ALT, '2026-10', itens);
    expect(res.sucesso).toBe(2);
    expect(res.falha).toBe(1);
    expect(res.erros[0].registroId).toBe('f2');
    expect(res.erros[0].tipo).toBe('alterdata');
    // Cada despesa carrega contexto da folha
    const despesa = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(despesa.descricao).toContain('Salário 2026-10');
    expect(despesa.categoria).toBe('01');
  });
});
