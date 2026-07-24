import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFrom, mockCriarNotificacao, mockSendMessage } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockCriarNotificacao: vi.fn(),
  mockSendMessage: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

vi.mock('../notificacoesService', () => ({
  criarNotificacao: mockCriarNotificacao,
}));

vi.mock('../whatsappService', () => ({
  whatsappService: { sendMessage: mockSendMessage },
}));

vi.mock('@/utils/dateLocal', () => ({
  formatDateLocalISO: (d: Date) => d.toISOString().slice(0, 10),
}));

import { automacaoService } from '../automacaoService';

// ─── helpers ─────────────────────────────────────────────────────────────────

// select → eq → eq → filter → resolvedValue (for notificarAniversariantes)
function setupAniversariantesChain(data: any[] | null) {
  const response = { data };
  const chain: any = {};
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.filter = vi.fn().mockResolvedValue(response);
  const selectFn = vi.fn().mockReturnValue(chain);
  mockFrom.mockReturnValue({ select: selectFn });
  return { chain };
}

// select → eq → eq → resolvedValue (for notificarASOVencendo)
function setupASOChain(data: any[] | null) {
  const response = { data };
  const eqFn2 = vi.fn().mockResolvedValue(response);
  const eqFn1 = vi.fn().mockReturnValue({ eq: eqFn2 });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn1 });
  mockFrom.mockReturnValue({ select: selectFn });
  return { eqFn2 };
}

// select → or → resolvedValue (for notificarTerminoExperiencia)
function setupTerminoChain(data: any[] | null) {
  const response = { data };
  const orFn = vi.fn().mockResolvedValue(response);
  const selectFn = vi.fn().mockReturnValue({ or: orFn });
  mockFrom.mockReturnValue({ select: selectFn });
  return { orFn };
}

// ─── notificarAniversariantes ─────────────────────────────────────────────────

describe('automacaoService.notificarAniversariantes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCriarNotificacao.mockResolvedValue(undefined);
    mockSendMessage.mockResolvedValue({ success: true });
  });

  it('does nothing when no aniversariantes found', async () => {
    setupAniversariantesChain(null);
    await automacaoService.notificarAniversariantes('emp-1');
    expect(mockCriarNotificacao).not.toHaveBeenCalled();
  });

  it('creates notification for each aniversariante', async () => {
    const colabs = [
      { id: 'c1', nome_completo: 'João', telefone: null, empresa_id: 'emp-1' },
      { id: 'c2', nome_completo: 'Maria', telefone: null, empresa_id: 'emp-1' },
    ];
    setupAniversariantesChain(colabs);
    await automacaoService.notificarAniversariantes('emp-1');
    expect(mockCriarNotificacao).toHaveBeenCalledTimes(2);
    expect(mockCriarNotificacao).toHaveBeenCalledWith(expect.objectContaining({
      titulo: 'Aniversariante do Dia',
      empresa_id: 'emp-1',
      entidade_id: 'c1',
    }));
  });

  it('sends WhatsApp message when colaborador has telefone', async () => {
    const colabs = [{ id: 'c1', nome_completo: 'Ana', telefone: '11999999999', empresa_id: 'emp-1' }];
    setupAniversariantesChain(colabs);
    await automacaoService.notificarAniversariantes('emp-1');
    expect(mockSendMessage).toHaveBeenCalledWith(expect.objectContaining({
      empresaId: 'emp-1',
      colaboradorId: 'c1',
      phone: '11999999999',
    }));
  });

  it('does not send WhatsApp when telefone is null', async () => {
    const colabs = [{ id: 'c1', nome_completo: 'Bob', telefone: null, empresa_id: 'emp-1' }];
    setupAniversariantesChain(colabs);
    await automacaoService.notificarAniversariantes('emp-1');
    expect(mockSendMessage).not.toHaveBeenCalled();
  });
});

// ─── notificarASOVencendo ─────────────────────────────────────────────────────

describe('automacaoService.notificarASOVencendo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCriarNotificacao.mockResolvedValue(undefined);
    mockSendMessage.mockResolvedValue({ success: true });
  });

  it('does nothing when no ASOs found', async () => {
    setupASOChain(null);
    await automacaoService.notificarASOVencendo('emp-1');
    expect(mockCriarNotificacao).not.toHaveBeenCalled();
  });

  it('creates notification for each ASO with colaborador', async () => {
    const asos = [
      { id: 'aso1', colaborador: { id: 'c1', nome_completo: 'João', telefone: null } },
    ];
    setupASOChain(asos);
    await automacaoService.notificarASOVencendo('emp-1');
    expect(mockCriarNotificacao).toHaveBeenCalledWith(expect.objectContaining({
      titulo: 'ASO Vencendo',
      empresa_id: 'emp-1',
      entidade_id: 'c1',
    }));
  });

  it('skips ASO entries where colaborador is null', async () => {
    const asos = [{ id: 'aso1', colaborador: null }];
    setupASOChain(asos);
    await automacaoService.notificarASOVencendo('emp-1');
    expect(mockCriarNotificacao).not.toHaveBeenCalled();
  });

  it('sends WhatsApp when colaborador has telefone', async () => {
    const asos = [
      { id: 'aso1', colaborador: { id: 'c1', nome_completo: 'Ana', telefone: '11988887777' } },
    ];
    setupASOChain(asos);
    await automacaoService.notificarASOVencendo('emp-1');
    expect(mockSendMessage).toHaveBeenCalledWith(expect.objectContaining({
      phone: '11988887777',
    }));
  });
});

// ─── notificarTerminoExperiencia ──────────────────────────────────────────────

describe('automacaoService.notificarTerminoExperiencia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCriarNotificacao.mockResolvedValue(undefined);
  });

  it('does nothing when no periodos found', async () => {
    setupTerminoChain(null);
    await automacaoService.notificarTerminoExperiencia('emp-1');
    expect(mockCriarNotificacao).not.toHaveBeenCalled();
  });

  it('creates notification for periodos matching empresa_id', async () => {
    const periodos = [
      { colaborador: { id: 'c1', nome_completo: 'João', empresa_id: 'emp-1' } },
    ];
    setupTerminoChain(periodos);
    await automacaoService.notificarTerminoExperiencia('emp-1');
    expect(mockCriarNotificacao).toHaveBeenCalledWith(expect.objectContaining({
      titulo: 'Término de Experiência Próximo',
      empresa_id: 'emp-1',
      entidade_id: 'c1',
    }));
  });

  it('skips periodos from a different empresa_id', async () => {
    const periodos = [
      { colaborador: { id: 'c1', nome_completo: 'João', empresa_id: 'emp-OUTRO' } },
    ];
    setupTerminoChain(periodos);
    await automacaoService.notificarTerminoExperiencia('emp-1');
    expect(mockCriarNotificacao).not.toHaveBeenCalled();
  });

  it('skips periodos where colaborador is null', async () => {
    setupTerminoChain([{ colaborador: null }]);
    await automacaoService.notificarTerminoExperiencia('emp-1');
    expect(mockCriarNotificacao).not.toHaveBeenCalled();
  });
});

// ─── processarAutomacoes ──────────────────────────────────────────────────────

describe('automacaoService.processarAutomacoes', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('calls all three notification methods', async () => {
    const anivSpy = vi.spyOn(automacaoService, 'notificarAniversariantes').mockResolvedValue();
    const asoSpy = vi.spyOn(automacaoService, 'notificarASOVencendo').mockResolvedValue();
    const termSpy = vi.spyOn(automacaoService, 'notificarTerminoExperiencia').mockResolvedValue();

    await automacaoService.processarAutomacoes('emp-1');

    expect(anivSpy).toHaveBeenCalledWith('emp-1');
    expect(asoSpy).toHaveBeenCalledWith('emp-1');
    expect(termSpy).toHaveBeenCalledWith('emp-1');

    anivSpy.mockRestore();
    asoSpy.mockRestore();
    termSpy.mockRestore();
  });
});
