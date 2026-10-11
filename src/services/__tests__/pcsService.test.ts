import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deepChain } from '@/test/deepChain';
import { makeChain, type Chain } from '@/test/chain';
import { pcsService } from '../pcsService';

const { mockFrom, mockRpc } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...a: unknown[]) => deepChain(mockFrom(...a)),
    rpc: mockRpc,
  },
}));

const chain = (data: unknown = [], error: unknown = null): Chain =>
  makeChain({ data, error } as Parameters<typeof makeChain>[0]);

describe('pcsService', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockRpc.mockReset();
    mockFrom.mockReturnValue(chain());
    mockRpc.mockResolvedValue({ data: [], error: null });
  });

  it('listarPlanos filtra por empresa + soft-delete e ordena por created_at desc', async () => {
    const planos = [{ id: 'p1' }, { id: 'p2' }];
    const c = chain(planos);
    mockFrom.mockReturnValue(c);
    const res = await pcsService.listarPlanos('e1');
    expect(res).toEqual(planos);
    expect(mockFrom).toHaveBeenCalledWith('pcs_planos');
    expect(c.eq).toHaveBeenCalledWith('empresa_id', 'e1');
    expect(c.is).toHaveBeenCalledWith('deleted_at', null);
    expect(c.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(c.limit).toHaveBeenCalledWith(500);
  });

  it('criarPlano insere e devolve a linha (single)', async () => {
    const row = { id: 'novo', nome: 'Plano 2026' };
    mockFrom.mockReturnValue(chain(row));
    const res = await pcsService.criarPlano({ empresa_id: 'e1', nome: 'Plano 2026' });
    expect(res).toEqual(row);
  });

  it('criarFatores com array vazio não chama o banco', async () => {
    await pcsService.criarFatores([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('salvarAvaliacao faz upsert em (plano_id,cargo_id) SEM pontos_total', async () => {
    const c = chain(null);
    mockFrom.mockReturnValue(c);
    await pcsService.salvarAvaliacao({
      planoId: 'p1',
      cargoId: 'c1',
      pontuacoes: { conhecimento: 100 } as never,
      justificativa: 'just',
    });
    expect(c.upsert).toHaveBeenCalled();
    const [payload, opts] = c.upsert.mock.calls[0] as [Record<string, unknown>, { onConflict: string }];
    expect(opts.onConflict).toBe('plano_id,cargo_id');
    expect(payload.pontos_total).toBeUndefined();
    expect(payload.plano_id).toBe('p1');
    expect(payload.cargo_id).toBe('c1');
  });

  it('gerarGrades chama a RPC pcs_gerar_grades com salário mínimo opcional', async () => {
    mockRpc.mockResolvedValue({ data: [{ id: 'g1' }], error: null });
    const res = await pcsService.gerarGrades('p1', 10, 2000);
    expect(mockRpc).toHaveBeenCalledWith('pcs_gerar_grades', {
      p_plano_id: 'p1',
      p_num_grades: 10,
      p_salario_base_menor: 2000,
    });
    expect(res).toEqual([{ id: 'g1' }]);
  });

  it('simularImpacto chama rpc e devolve impacto parseado', async () => {
    mockRpc.mockResolvedValue({
      data: {
        total_colaboradores: 5,
        custo_mensal_atual: 100,
        custo_mensal_projetado: 110,
        custo_anual_projetado: 1320,
        variacao_pct: 10,
      },
      error: null,
    });
    const res = await pcsService.simularImpacto('p1', 30);
    expect(mockRpc).toHaveBeenCalledWith('pcs_simular_impacto', {
      p_plano_id: 'p1',
      p_encargos_pct: 30,
    });
    expect(res).toBeTruthy();
  });

  it('excluirPesquisa aplica tenant filter (id + empresa_id)', async () => {
    const c = chain(null);
    mockFrom.mockReturnValue(c);
    await pcsService.excluirPesquisa('x1', 'e1');
    expect(mockFrom).toHaveBeenCalledWith('pcs_pesquisa_salarial');
    expect(c.eq).toHaveBeenCalledWith('id', 'x1');
    expect(c.eq).toHaveBeenCalledWith('empresa_id', 'e1');
  });

  it('propaga erros do banco', async () => {
    mockFrom.mockReturnValue(chain(null, { message: 'rls' }));
    await expect(pcsService.listarPlanos('e1')).rejects.toMatchObject({ message: 'rls' });
  });
});
