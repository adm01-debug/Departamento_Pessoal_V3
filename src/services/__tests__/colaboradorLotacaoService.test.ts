import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

import { colaboradorLotacaoService } from '../colaboradorLotacaoService';

// A real garantia de tenant (colaborador/lotação/vínculo na mesma empresa,
// no máximo 1 principal por colaborador) vem do banco — trigger
// `colaborador_lotacoes_valida_tenant` + índice único parcial
// `colaborador_lotacoes_principal_unica` (ver migration
// 20260929120000_colaborador_lotacoes.sql), não testáveis aqui sem Postgres
// real. Estes testes cobrem a contribuição do frontend: que o service monta
// as queries certas, na ordem certa, sempre escopadas por empresa_id.
describe('colaboradorLotacaoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listarCatalogo', () => {
    it('busca lotações ativas da empresa em /lotacoes, ordenadas por nome', async () => {
      const order = vi.fn().mockResolvedValue({
        data: [{ id: 'lo-a', nome: 'Unidade São Paulo/SP', codigo: null, ativa: true }],
        error: null,
      });
      const eqAtiva = vi.fn().mockReturnValue({ order });
      const eqEmpresa = vi.fn().mockReturnValue({ eq: eqAtiva });
      const select = vi.fn().mockReturnValue({ eq: eqEmpresa });
      mockFrom.mockReturnValue({ select });

      const result = await colaboradorLotacaoService.listarCatalogo('emp-1');

      expect(mockFrom).toHaveBeenCalledWith('lotacoes');
      expect(select).toHaveBeenCalledWith('id, nome, codigo, ativa');
      expect(eqEmpresa).toHaveBeenCalledWith('empresa_id', 'emp-1');
      expect(eqAtiva).toHaveBeenCalledWith('ativa', true);
      expect(result).toEqual([{ id: 'lo-a', nome: 'Unidade São Paulo/SP', codigo: null, ativa: true }]);
    });
  });

  describe('buscarPrincipal', () => {
    it('resolve a lotação principal via colaborador_lotacoes.principal = true (join com lotacoes)', async () => {
      const maybeSingle = vi.fn().mockResolvedValue({
        data: { lotacao: { id: 'lo-a', nome: 'Unidade São Paulo/SP', codigo: null, ativa: true } },
        error: null,
      });
      const eqPrincipal = vi.fn().mockReturnValue({ maybeSingle });
      const eqEmpresa = vi.fn().mockReturnValue({ eq: eqPrincipal });
      const eqColaborador = vi.fn().mockReturnValue({ eq: eqEmpresa });
      const select = vi.fn().mockReturnValue({ eq: eqColaborador });
      mockFrom.mockReturnValue({ select });

      const result = await colaboradorLotacaoService.buscarPrincipal('col-ana', 'emp-1');

      expect(mockFrom).toHaveBeenCalledWith('colaborador_lotacoes');
      expect(eqColaborador).toHaveBeenCalledWith('colaborador_id', 'col-ana');
      expect(eqEmpresa).toHaveBeenCalledWith('empresa_id', 'emp-1');
      expect(eqPrincipal).toHaveBeenCalledWith('principal', true);
      expect(result).toEqual({ id: 'lo-a', nome: 'Unidade São Paulo/SP', codigo: null, ativa: true });
    });

    it('retorna null quando o colaborador não tem lotação principal definida', async () => {
      const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle }) }) }) }),
      });

      const result = await colaboradorLotacaoService.buscarPrincipal('col-sem-lotacao', 'emp-1');

      expect(result).toBeNull();
    });
  });

  describe('definirPrincipal', () => {
    it('desmarca a principal atual ANTES de marcar a nova (nunca duas principais ao mesmo tempo)', async () => {
      const chamadas: string[] = [];

      const unsetEqPrincipal = vi.fn().mockImplementation(() => {
        chamadas.push('unset');
        return Promise.resolve({ data: null, error: null });
      });
      const unsetEqEmpresa = vi.fn().mockReturnValue({ eq: unsetEqPrincipal });
      const unsetEqColaborador = vi.fn().mockReturnValue({ eq: unsetEqEmpresa });
      const updateFn = vi.fn().mockReturnValue({ eq: unsetEqColaborador });

      const upsertFn = vi.fn().mockImplementation(() => {
        chamadas.push('upsert');
        return Promise.resolve({ data: null, error: null });
      });

      mockFrom.mockReturnValue({ update: updateFn, upsert: upsertFn });

      await colaboradorLotacaoService.definirPrincipal('col-ana', 'lo-b', 'emp-1');

      // A promise do "unset" só resolve quando .eq('principal', true) é
      // chamado (fim da cadeia) — como o service usa `await` nesse passo
      // antes do upsert, a ordem em `chamadas` prova que não há sobreposição.
      expect(chamadas).toEqual(['unset', 'upsert']);
      expect(updateFn).toHaveBeenCalledWith({ principal: false });
      expect(unsetEqColaborador).toHaveBeenCalledWith('colaborador_id', 'col-ana');
      expect(unsetEqEmpresa).toHaveBeenCalledWith('empresa_id', 'emp-1');
      expect(unsetEqPrincipal).toHaveBeenCalledWith('principal', true);
      expect(upsertFn).toHaveBeenCalledWith(
        { empresa_id: 'emp-1', colaborador_id: 'col-ana', lotacao_id: 'lo-b', principal: true },
        { onConflict: 'colaborador_id,lotacao_id' }
      );
    });

    it('nunca cria uma nova linha em lotacoes — só referencia lotacao_id do catálogo existente', async () => {
      const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }) }) });
      const upsertFn = vi.fn().mockResolvedValue({ data: null, error: null });
      mockFrom.mockReturnValue({ update: updateFn, upsert: upsertFn });

      await colaboradorLotacaoService.definirPrincipal('col-ana', 'lo-a', 'emp-1');

      expect(mockFrom).not.toHaveBeenCalledWith('lotacoes');
      expect(mockFrom).toHaveBeenCalledWith('colaborador_lotacoes');
    });

    it('dois colaboradores diferentes podem apontar para a MESMA lotação (unicidade é por colaborador_id, não por lotacao_id)', async () => {
      const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }) }) });
      const upsertFn = vi.fn().mockResolvedValue({ data: null, error: null });
      mockFrom.mockReturnValue({ update: updateFn, upsert: upsertFn });

      await colaboradorLotacaoService.definirPrincipal('col-ana', 'lo-a', 'emp-1');
      await colaboradorLotacaoService.definirPrincipal('col-carlos', 'lo-a', 'emp-1');

      expect(upsertFn).toHaveBeenNthCalledWith(1, { empresa_id: 'emp-1', colaborador_id: 'col-ana', lotacao_id: 'lo-a', principal: true }, { onConflict: 'colaborador_id,lotacao_id' });
      expect(upsertFn).toHaveBeenNthCalledWith(2, { empresa_id: 'emp-1', colaborador_id: 'col-carlos', lotacao_id: 'lo-a', principal: true }, { onConflict: 'colaborador_id,lotacao_id' });
    });

    it('propaga o erro do banco sem mascarar (ex.: trigger de tenant cruzado rejeitando o INSERT)', async () => {
      const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }) }) });
      const upsertFn = vi.fn().mockResolvedValue({ data: null, error: { message: 'colaborador_lotacoes: lotacao_id pertence a outra empresa' } });
      mockFrom.mockReturnValue({ update: updateFn, upsert: upsertFn });

      await expect(colaboradorLotacaoService.definirPrincipal('col-ana', 'lo-empresa-b', 'emp-1')).rejects.toMatchObject({
        message: expect.stringContaining('outra empresa'),
      });
    });
  });
});
