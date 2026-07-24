import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validadorFolha } from '../validadorFolha';

// ─── shared mock setup ────────────────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

// Helper: build a minimal folha item
function makeItem(overrides: Record<string, any> = {}) {
  return {
    id: 'item-1',
    folha_id: 'folha-1',
    colaborador_id: 'colab-1',
    colaborador: {
      id: 'colab-1',
      nome_completo: 'João Silva',
      salario_base: 5000,
      status: 'ativo',
      empresa_id: 'empresa-1',
    },
    total_proventos: 5000,
    total_descontos: 500,
    total_liquido: 4500,
    irrf_mes: 100,
    detalhes: null,
    ...overrides,
  };
}

// Sets up mocks for folha_itens and rubricas_folha queries
function setupMocks(itens: any[], rubricas: any[] = [], itenError: any = null) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'folha_itens') {
      const eqFn = vi.fn().mockResolvedValue({ data: itens, error: itenError });
      const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
      return { select: selectFn };
    }
    if (table === 'rubricas_folha') {
      const eqFn = vi.fn().mockResolvedValue({ data: rubricas, error: null });
      const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
      return { select: selectFn };
    }
    return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }) };
  });
}

// ─── validarFolha ─────────────────────────────────────────────────────────────

describe('validadorFolha.validarFolha', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns empty array when supabase returns null itens', async () => {
    setupMocks(null as any, [], null);
    const result = await validadorFolha.validarFolha('folha-1');
    expect(result).toEqual([]);
  });

  it('returns empty array on DB error', async () => {
    setupMocks(null as any, [], { message: 'error' });
    const result = await validadorFolha.validarFolha('folha-1');
    expect(result).toEqual([]);
  });

  it('returns no alerts for a healthy payroll item', async () => {
    setupMocks([makeItem()]);
    const result = await validadorFolha.validarFolha('folha-1');
    expect(result).toEqual([]);
  });

  it('raises liquido_negativo alert when total_liquido <= 0', async () => {
    setupMocks([makeItem({ total_liquido: 0 })]);
    const result = await validadorFolha.validarFolha('folha-1');
    const tipos = result.map(a => a.tipo);
    expect(tipos).toContain('liquido_negativo');
  });

  it('raises liquido_negativo for negative liquido', async () => {
    setupMocks([makeItem({ total_liquido: -100, total_descontos: 6000 })]);
    const result = await validadorFolha.validarFolha('folha-1');
    const tipos = result.map(a => a.tipo);
    expect(tipos).toContain('liquido_negativo');
  });

  it('raises desconto_excessivo when descontos > 70% of proventos', async () => {
    setupMocks([makeItem({ total_proventos: 5000, total_descontos: 3600, total_liquido: 1400 })]);
    const result = await validadorFolha.validarFolha('folha-1');
    const tipos = result.map(a => a.tipo);
    expect(tipos).toContain('desconto_excessivo');
  });

  it('does NOT raise desconto_excessivo when descontos = 69% of proventos', async () => {
    setupMocks([makeItem({ total_proventos: 5000, total_descontos: 3450, total_liquido: 1550 })]);
    const result = await validadorFolha.validarFolha('folha-1');
    const tipos = result.map(a => a.tipo);
    expect(tipos).not.toContain('desconto_excessivo');
  });

  it('raises variacao_salarial when proventos > 2x salario_base', async () => {
    setupMocks([makeItem({
      colaborador: { id: 'c1', nome_completo: 'Colab', salario_base: 3000, status: 'ativo', empresa_id: 'e1' },
      total_proventos: 7000,
      total_descontos: 500,
      total_liquido: 6500,
    })]);
    const result = await validadorFolha.validarFolha('folha-1');
    const tipos = result.map(a => a.tipo);
    expect(tipos).toContain('variacao_salarial');
  });

  it('does NOT raise variacao_salarial when proventos = 2x salario_base', async () => {
    setupMocks([makeItem({
      colaborador: { id: 'c1', nome_completo: 'Colab', salario_base: 3000, status: 'ativo', empresa_id: 'e1' },
      total_proventos: 6000,
      total_descontos: 500,
      total_liquido: 5500,
    })]);
    const result = await validadorFolha.validarFolha('folha-1');
    const tipos = result.map(a => a.tipo);
    expect(tipos).not.toContain('variacao_salarial');
  });

  it('raises falta_informacao when salario_base = 0', async () => {
    setupMocks([makeItem({
      colaborador: { id: 'c1', nome_completo: 'Colab', salario_base: 0, status: 'ativo', empresa_id: 'e1' },
    })]);
    const result = await validadorFolha.validarFolha('folha-1');
    const tipos = result.map(a => a.tipo);
    expect(tipos).toContain('falta_informacao');
  });

  it('raises falta_informacao (IRRF sem dependente) when irrf > 500 and no dependentes', async () => {
    setupMocks([makeItem({ irrf_mes: 600, detalhes: { dependentes: 0 } })]);
    const result = await validadorFolha.validarFolha('folha-1');
    const tipos = result.map(a => a.tipo);
    expect(tipos).toContain('falta_informacao');
    const irrf = result.find(a => a.mensagem.includes('IRRF'));
    expect(irrf).toBeTruthy();
    expect(irrf?.gravidade).toBe('baixa');
  });

  it('does NOT raise IRRF alert when irrf_mes <= 500', async () => {
    setupMocks([makeItem({ irrf_mes: 400, detalhes: { dependentes: 0 } })]);
    const result = await validadorFolha.validarFolha('folha-1');
    const irrfAlert = result.find(a => a.mensagem.includes('IRRF'));
    expect(irrfAlert).toBeUndefined();
  });

  it('does NOT raise IRRF alert when dependentes > 0', async () => {
    setupMocks([makeItem({ irrf_mes: 800, detalhes: { dependentes: 2 } })]);
    const result = await validadorFolha.validarFolha('folha-1');
    const irrfAlert = result.find(a => a.mensagem.includes('IRRF'));
    expect(irrfAlert).toBeUndefined();
  });

  it('raises falta_informacao (salario abaixo mínimo) for ativo colaborador earning below minimum', async () => {
    setupMocks([makeItem({
      colaborador: { id: 'c1', nome_completo: 'Colab', salario_base: 1000, status: 'ativo', empresa_id: 'e1' },
      total_proventos: 1000,
      total_descontos: 50,
      total_liquido: 950,
    })]);
    const result = await validadorFolha.validarFolha('folha-1');
    const salMinAlert = result.find(a => a.mensagem.includes('salário mínimo'));
    expect(salMinAlert).toBeTruthy();
    expect(salMinAlert?.gravidade).toBe('alta');
  });

  it('does NOT raise salario mínimo alert for non-ativo colaborador', async () => {
    setupMocks([makeItem({
      colaborador: { id: 'c1', nome_completo: 'Colab', salario_base: 800, status: 'desligado', empresa_id: 'e1' },
      total_proventos: 800,
      total_descontos: 0,
      total_liquido: 800,
    })]);
    const result = await validadorFolha.validarFolha('folha-1');
    const salMinAlert = result.find(a => a.mensagem.includes('salário mínimo'));
    expect(salMinAlert).toBeUndefined();
  });

  it('raises divergencia_esocial when evento has no matching rubrica', async () => {
    setupMocks(
      [makeItem({
        detalhes: { detalheEventos: [{ codigo: '9999', valor: 100 }] },
      })],
      [{ codigo: '1000', incide_inss: true }]
    );
    const result = await validadorFolha.validarFolha('folha-1');
    const divAlert = result.find(a => a.tipo === 'divergencia_esocial' && a.mensagem.includes('9999'));
    expect(divAlert).toBeTruthy();
  });

  it('does NOT raise divergencia_esocial when all eventos have matching rubricas', async () => {
    setupMocks(
      [makeItem({
        detalhes: { detalheEventos: [{ codigo: '1000', valor: 100 }] },
      })],
      [{ codigo: '1000', incide_inss: true }]
    );
    const result = await validadorFolha.validarFolha('folha-1');
    const codeAlert = result.find(a => a.tipo === 'divergencia_esocial' && a.mensagem.includes('1000'));
    expect(codeAlert).toBeUndefined();
  });

  it('alert objects have required fields: colaboradorId, nome, tipo, mensagem, gravidade', async () => {
    setupMocks([makeItem({ total_liquido: -50, total_descontos: 6000 })]);
    const result = await validadorFolha.validarFolha('folha-1');
    expect(result.length).toBeGreaterThan(0);
    for (const alerta of result) {
      expect(alerta).toHaveProperty('colaboradorId');
      expect(alerta).toHaveProperty('nome');
      expect(alerta).toHaveProperty('tipo');
      expect(alerta).toHaveProperty('mensagem');
      expect(alerta).toHaveProperty('gravidade');
    }
  });
});
