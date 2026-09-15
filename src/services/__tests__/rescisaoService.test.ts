import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rescisaoService } from '../rescisaoService';
import { supabase } from '@/integrations/supabase/client';

// Mock dependências
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock('@/utils/auditLogger', () => ({
  auditLogger: {
    log: vi.fn().mockResolvedValue({}),
  },
}));

describe('rescisaoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validarTransicao', () => {
    it('should block jumping more than one stage', async () => {
      (supabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { etapa: 'comunicacao', status: 'pendente' }, error: null }),
      });

      await expect(rescisaoService.validarTransicao('1', 'documentacao', 'empresa-uuid-1')).resolves.toBe(true);

      await expect(rescisaoService.validarTransicao('1', 'homologacao', 'empresa-uuid-1')).rejects.toThrow(
        /Transição bloqueada/
      );
    });

    it('should block homologation if status is not calculado', async () => {
      (supabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { etapa: 'calculo', status: 'pendente' }, error: null }),
      });

      await expect(rescisaoService.validarTransicao('1', 'homologacao', 'empresa-uuid-1')).rejects.toThrow(
        /A rescisão precisa estar com status "calculado"/
      );
    });
  });

  describe('calcularESalvar', () => {
    // Acompanha as três colunas que só existem em runtime, não em `any`:
    // `colaboradores.nome` (é `nome_completo`), `colaboradores.dependentes_irrf`
    // (aposentada, virou `dependentes.para_irrf`) e `desligamentos.detalhes_calculo`
    // (nunca existiu). As três juntas faziam esta função falhar sempre — sem
    // nenhum teste que as tivesse pego antes, porque nenhum mock aqui validava
    // nomes reais de coluna. Este teste fixa o payload exato que o serviço
    // agora envia ao Postgres, para que uma futura regressão de nome de coluna
    // volte a quebrar em CI, não em produção.
    it('busca dependentes reais via para_irrf e persiste apenas colunas existentes', async () => {
      const anterior = {
        id: 'd1',
        colaborador_id: 'c1',
        colaborador: { data_admissao: '2020-01-01' },
        salario_base: 3000,
        data_desligamento: '2026-06-01',
        tipo: 'sem_justa_causa',
        etapa: 'documentacao',
        status: 'pendente',
      };
      const novo = { id: 'd1', etapa: 'homologacao', status: 'calculado', valor_liquido: 4500 };

      const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>;
      const updateFn = vi.fn().mockReturnThis();
      const selectAnteriorFn = vi.fn().mockReturnThis();
      fromMock
        // 1) select do desligamento + colaborador embutido
        .mockReturnValueOnce({
          select: selectAnteriorFn,
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: anterior, error: null }),
        })
        // 2) validarTransicao — select interno de etapa/status
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { etapa: 'documentacao', status: 'pendente' }, error: null }),
        })
        // 3) contagem real de dependentes via `dependentes.para_irrf`
        //    (select('id').eq('colaborador_id', ...).eq('para_irrf', true))
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [{ id: 'dep1' }, { id: 'dep2' }], error: null }),
            }),
          }),
        })
        // 4) update final
        .mockReturnValueOnce({
          update: updateFn,
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: novo, error: null }),
        });

      const result = await rescisaoService.calcularESalvar(
        'd1',
        { salario_base: 3000, data_desligamento: '2026-06-01', tipo: 'sem_justa_causa' },
        'empresa-uuid-1'
      );

      expect(result).toEqual(novo);
      // Nenhuma chave inexistente (`nome`, `dependentes_irrf`, `detalhes_calculo`)
      // deve voltar a aparecer no payload de update.
      const payload = updateFn.mock.calls[0][0];
      expect(payload).not.toHaveProperty('detalhes_calculo');
      expect(payload).toHaveProperty('saldo_salario');
      expect(payload).toHaveProperty('status', 'calculado');
      // O embed de colaborador não pode voltar a pedir `nome` (é
      // `nome_completo`) nem `dependentes_irrf` (é `dependentes.para_irrf`).
      const selectString = selectAnteriorFn.mock.calls[0][0] as string;
      expect(selectString).not.toMatch(/\bnome\b/);
      expect(selectString).not.toContain('dependentes_irrf');
      expect(selectString).toContain('data_admissao');
    });
  });

  describe('assinarDigitalmente', () => {
    // Achado N25: assinatura deixou de ser um hash client-side (btoa
    // reversível, forjável) gravado via UPDATE direto — agora é delegada à
    // RPC assinar_desligamento (SECURITY DEFINER), que calcula o hash
    // server-side e é a única via permitida para gravar essas colunas
    // (escrita direta é bloqueada por trigger).
    it('should call assinar_desligamento RPC with the correct part', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: true, error: null });
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: { id: '1', assinado_empresa: true }, error: null });

      (supabase.rpc as unknown as ReturnType<typeof vi.fn>) = mockRpc;
      (supabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      await rescisaoService.assinarDigitalmente('1', 'empresa', 'empresa-uuid-1');

      expect(mockRpc).toHaveBeenCalledWith('assinar_desligamento', {
        _desligamento_id: '1',
        _parte: 'empresa',
      });
    });

    it('should surface the RPC error (e.g. blocked by server-side rules)', async () => {
      const mockRpc = vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'Esta parte ja assinou esta rescisao' } });
      (supabase.rpc as unknown as ReturnType<typeof vi.fn>) = mockRpc;

      await expect(rescisaoService.assinarDigitalmente('1', 'empresa')).rejects.toThrow(/ja assinou/);
    });
  });
});
