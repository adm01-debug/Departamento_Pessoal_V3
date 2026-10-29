import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rescisaoService } from '../rescisaoService';
import { supabase } from '@/integrations/supabase/client';

// Mock dependências
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    functions: { invoke: vi.fn() },
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
  },
}));

vi.mock('@/utils/auditLogger', () => ({
  auditLogger: {
    log: vi.fn().mockResolvedValue({}),
  },
}));

const { mockLoggerError } = vi.hoisted(() => ({ mockLoggerError: vi.fn() }));
vi.mock('../loggerService', () => ({
  loggerService: { error: mockLoggerError },
}));

describe('rescisaoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Drena a fila de mockReturnValueOnce que um teste que abortou no meio deixou.
    (supabase.from as unknown as ReturnType<typeof vi.fn>).mockReset();
  });

  // Chain padrão `select(...).eq().eq().single()` usada pelos fetches.
  const fetchChain = (data: unknown, error: unknown = null) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
  });
  // Chain `update(...).eq().eq().select().single()` dos updates finais.
  const updateChain = (updateFn: ReturnType<typeof vi.fn>, row: unknown) => ({
    update: updateFn,
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: row, error: null }),
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
    // Acompanha as colunas que só existem em runtime, não em `any`:
    // `colaboradores.nome` (é `nome_completo`), `colaboradores.dependentes_irrf`
    // (aposentada, virou `dependentes.para_irrf`) e `desligamentos.detalhes_calculo`
    // (criada pela migration 20261018150000 para guardar o resultado do motor).
    // As três juntas faziam esta função falhar sempre — sem nenhum teste que
    // as tivesse pego antes, porque nenhum mock aqui validava nomes reais de
    // coluna. Este teste fixa o payload exato que o serviço envia ao Postgres.
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
      // `detalhes_calculo` recebe o resultado completo do motor (JSON) para o
      // TRCT/PDF; chaves inexistentes (`nome`, `dependentes_irrf`) seguem fora.
      const payload = updateFn.mock.calls[0][0];
      expect(payload).toHaveProperty('detalhes_calculo');
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

  describe('homologar', () => {
    const EMP = 'empresa-uuid-1';
    const desligRow = {
      valor_liquido: 4500,
      etapa: 'homologacao',
      checklist_calculo_rescisao: true,
      status: 'calculado',
    };

    function mockHomologarCalls(updatedRow: unknown) {
      const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>;
      const updateFn = vi.fn().mockReturnThis();
      const upsertFn = vi.fn().mockResolvedValue({ data: null, error: null });
      fromMock
        // 1) fetch do desligamento
        .mockReturnValueOnce(fetchChain(desligRow))
        // 2) upsert em homologacoes_rescisao
        .mockReturnValueOnce({ upsert: upsertFn })
        // 3) update do desligamento
        .mockReturnValueOnce(updateChain(updateFn, updatedRow));
      return { updateFn, upsertFn };
    }

    it('etapa rh avança para financeiro mantendo em_homologacao', async () => {
      const { updateFn, upsertFn } = mockHomologarCalls({ id: 'd1', status: 'em_homologacao' });
      const result = await rescisaoService.homologar('d1', EMP, 'rh', 'ok');
      expect(result.status).toBe('em_homologacao');
      expect(upsertFn).toHaveBeenCalledWith(
        expect.objectContaining({
          desligamento_id: 'd1',
          etapa: 'rh',
          status: 'aprovado',
          parecer: 'ok',
          usuario_id: 'user-1',
        }),
        { onConflict: 'desligamento_id,etapa' }
      );
      expect(updateFn).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'em_homologacao', etapa: 'homologacao', checklist_homologacao: false })
      );
    });

    it('última etapa (colaborador) marca homologado e etapa pagamento', async () => {
      const { updateFn } = mockHomologarCalls({ id: 'd1', status: 'homologado' });
      await rescisaoService.homologar('d1', EMP, 'colaborador');
      expect(updateFn).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'homologado', etapa: 'pagamento', checklist_homologacao: true })
      );
    });

    it('rejeita homologar sem cálculo salvo', async () => {
      const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>;
      fromMock.mockReturnValueOnce(fetchChain({ ...desligRow, valor_liquido: null }));
      await expect(rescisaoService.homologar('d1', EMP, 'rh')).rejects.toThrow(/exige que o cálculo/);
    });

    it('propaga erro do fetch', async () => {
      const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>;
      fromMock.mockReturnValueOnce(fetchChain(null, { message: 'row not found' }));
      // O catch de homologar embrulha erros não-Error na mensagem genérica.
      await expect(rescisaoService.homologar('d1', EMP, 'rh')).rejects.toThrow(/Erro ao processar homologação/);
    });

    it('exige empresa_id', async () => {
      await expect(rescisaoService.homologar('d1', '', 'rh')).rejects.toThrow(/empresa_id/);
    });
  });

  describe('processarPagamento', () => {
    const EMP = 'empresa-uuid-1';
    const desligRow = {
      colaborador_id: 'c1',
      data_desligamento: '2026-06-01',
      valor_liquido: 4500,
      assinado_empresa: true,
      assinado_colaborador: true,
      checklist_homologacao: true,
    };

    function mockPagamentoCalls(opts: { deslig?: unknown; rpcRow?: unknown; rpcError?: unknown } = {}) {
      const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>;
      const rpcMock = supabase.functions.invoke as unknown as ReturnType<typeof vi.fn>;
      // 1) fetch do desligamento (validações client-side: assinaturas + homologação)
      fromMock.mockReturnValueOnce(fetchChain(opts.deslig ?? desligRow));
      // 2) edge pagar-desligamento -> RPC transacional (desligamento pago +
      //    colaborador desativado sob FOR UPDATE — migration 20261028220000).
      //    Não enfileirar quando o teste falha na validação 1): o mockResolvedValueOnce
      //    não consumido vazaria para o rpc() do teste seguinte.
      const deslig = (opts.deslig ?? desligRow) as {
        assinado_empresa?: boolean;
        assinado_colaborador?: boolean;
        checklist_homologacao?: boolean;
      };
      if (deslig.assinado_empresa && deslig.assinado_colaborador && deslig.checklist_homologacao) {
        rpcMock.mockResolvedValueOnce({
          data: opts.rpcError ? null : { ok: true, desligamento: opts.rpcRow ?? { id: 'd1', status: 'pago', etapa: 'finalizado' } },
          error: opts.rpcError ?? null,
        });
      }
      return { rpcMock };
    }

    it('marca pago pela edge pagar-desligamento (RPC transacional só service_role)', async () => {
      const { rpcMock } = mockPagamentoCalls();
      const result = await rescisaoService.processarPagamento('d1', EMP, 'https://x/c.pdf');
      expect(result.status).toBe('pago');
      expect(rpcMock).toHaveBeenCalledWith('pagar-desligamento', {
        body: { empresaId: EMP, desligamentoId: 'd1', comprovanteUrl: 'https://x/c.pdf' },
      });
      // nunca chama a RPC direto do navegador (EXECUTE revogado de authenticated)
      expect(supabase.rpc).not.toHaveBeenCalledWith('pagar_desligamento', expect.anything());
    });

    it('resposta sem desligamento não é tratada como pagamento', async () => {
      const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>;
      fromMock.mockReturnValueOnce(fetchChain(desligRow));
      (supabase.functions.invoke as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: { ok: true }, error: null });
      await expect(rescisaoService.processarPagamento('d1', EMP)).rejects.toThrow(/não confirmado/);
    });

    it('bloqueia sem assinatura das duas partes', async () => {
      mockPagamentoCalls({ deslig: { ...desligRow, assinado_colaborador: false } });
      await expect(rescisaoService.processarPagamento('d1', EMP)).rejects.toThrow(
        /assinada pela empresa e pelo colaborador/
      );
    });

    it('bloqueia sem homologação concluída', async () => {
      mockPagamentoCalls({ deslig: { ...desligRow, checklist_homologacao: false } });
      await expect(rescisaoService.processarPagamento('d1', EMP)).rejects.toThrow(/homologação não foi concluída/);
    });

    it('erro da RPC aborta o pagamento (transação faz rollback no banco)', async () => {
      mockPagamentoCalls({ rpcError: { message: 'check_violation' } });
      await expect(rescisaoService.processarPagamento('d1', EMP)).rejects.toThrow();
    });

    it('exige empresa_id', async () => {
      await expect(rescisaoService.processarPagamento('d1', '')).rejects.toThrow(/empresa_id/);
    });
  });
});
