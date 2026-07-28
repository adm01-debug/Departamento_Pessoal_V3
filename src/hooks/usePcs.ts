/**
 * @fileoverview Hooks React Query do módulo PCS.
 *
 * Toda queryKey é escopada por empresa (multi-tenant) ou por plano — que já é
 * de uma única empresa —, evitando vazamento de cache entre tenants.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { pcsService } from '@/services/pcsService';
import { useAuth } from './useAuth';
import { useEmpresas } from './useEmpresas';
import {
  PCS_FATORES_PADRAO,
  grausToJson,
  type PcsFatorInsert,
  type PcsPesquisaSalarialInsert,
  type PcsPlanoUpdate,
  type PcsPontuacoes,
} from '@/types/pcs';

function erro(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

export function usePcsPlanos() {
  const { empresaAtual } = useEmpresas();
  const { user } = useAuth();
  const empresaId = empresaAtual?.id;
  const qc = useQueryClient();

  const planos = useQuery({
    queryKey: ['pcs', 'planos', empresaId],
    queryFn: () => pcsService.listarPlanos(empresaId!),
    enabled: !!empresaId,
  });

  const criar = useMutation({
    mutationFn: async (input: { nome: string; amplitude_pct: number; overlap_pct: number; num_steps: number }) => {
      if (!empresaId) throw new Error('Selecione uma empresa antes de criar o plano');
      const plano = await pcsService.criarPlano({
        empresa_id: empresaId,
        nome: input.nome,
        amplitude_pct: input.amplitude_pct,
        overlap_pct: input.overlap_pct,
        num_steps: input.num_steps,
        created_by: user?.id ?? null,
      });
      // Semeia a metodologia padrão para o plano nascer utilizável.
      const fatores: PcsFatorInsert[] = PCS_FATORES_PADRAO.map((f, i) => ({
        plano_id: plano.id,
        nome: f.nome,
        descricao: f.descricao,
        peso: f.peso,
        ordem: i,
        graus: grausToJson(f.graus),
      }));
      await pcsService.criarFatores(fatores);
      return plano;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pcs', 'planos', empresaId] });
      toast.success('Plano criado com os fatores da metodologia padrão');
    },
    onError: (e) => toast.error(erro(e, 'Não foi possível criar o plano')),
  });

  const atualizar = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: PcsPlanoUpdate }) => pcsService.atualizarPlano(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pcs', 'planos', empresaId] });
      toast.success('Plano atualizado');
    },
    onError: (e) => toast.error(erro(e, 'Não foi possível atualizar o plano')),
  });

  return { planos: planos.data ?? [], isLoading: planos.isLoading, criar, atualizar, empresaId };
}

export function usePcsFatores(planoId: string | null) {
  const qc = useQueryClient();
  const fatores = useQuery({
    queryKey: ['pcs', 'fatores', planoId],
    queryFn: () => pcsService.listarFatores(planoId!),
    enabled: !!planoId,
  });

  const excluir = useMutation({
    mutationFn: (id: string) => pcsService.excluirFator(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pcs', 'fatores', planoId] });
      qc.invalidateQueries({ queryKey: ['pcs', 'avaliacoes', planoId] });
      toast.success('Fator removido — reavalie os cargos afetados');
    },
    onError: (e) => toast.error(erro(e, 'Não foi possível remover o fator')),
  });

  return { fatores: fatores.data ?? [], isLoading: fatores.isLoading, excluir };
}

export function usePcsAvaliacoes(planoId: string | null) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const avaliacoes = useQuery({
    queryKey: ['pcs', 'avaliacoes', planoId],
    queryFn: () => pcsService.listarAvaliacoes(planoId!),
    enabled: !!planoId,
  });

  const salvar = useMutation({
    mutationFn: ({ cargoId, pontuacoes }: { cargoId: string; pontuacoes: PcsPontuacoes }) => {
      if (!planoId) throw new Error('Nenhum plano selecionado');
      return pcsService.salvarAvaliacao({ planoId, cargoId, pontuacoes, avaliadoPor: user?.id ?? null });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pcs', 'avaliacoes', planoId] });
      toast.success('Avaliação salva');
    },
    onError: (e) => toast.error(erro(e, 'Não foi possível salvar a avaliação')),
  });

  return { avaliacoes: avaliacoes.data ?? [], isLoading: avaliacoes.isLoading, salvar };
}

export function usePcsGrades(planoId: string | null) {
  const qc = useQueryClient();

  const grades = useQuery({
    queryKey: ['pcs', 'grades', planoId],
    queryFn: () => pcsService.listarGrades(planoId!),
    enabled: !!planoId,
  });

  // Confronto da faixa interna com o P50 de mercado — depende das pesquisas
  // salariais cadastradas, por isso vive numa query própria.
  const mercado = useQuery({
    queryKey: ['pcs', 'grades-mercado', planoId],
    queryFn: () => pcsService.gradesMercado(planoId!),
    enabled: !!planoId,
  });

  const gerar = useMutation({
    mutationFn: ({ numGrades, salarioBase }: { numGrades: number; salarioBase?: number | null }) => {
      if (!planoId) throw new Error('Nenhum plano selecionado');
      return pcsService.gerarGrades(planoId, numGrades, salarioBase);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pcs', 'grades', planoId] });
      qc.invalidateQueries({ queryKey: ['pcs', 'grades-mercado', planoId] });
      qc.invalidateQueries({ queryKey: ['pcs', 'enquadramento', planoId] });
      qc.invalidateQueries({ queryKey: ['pcs', 'impacto', planoId] });
      toast.success('Matriz salarial gerada');
    },
    onError: (e) => toast.error(erro(e, 'Não foi possível gerar a matriz')),
  });

  return {
    grades: grades.data ?? [],
    mercado: mercado.data ?? [],
    isLoading: grades.isLoading || mercado.isLoading,
    gerar,
  };
}


export function usePcsEquidade(planoId: string | null, encargosPct: number) {
  const enquadramento = useQuery({
    queryKey: ['pcs', 'enquadramento', planoId],
    queryFn: () => pcsService.enquadramento(planoId!),
    enabled: !!planoId,
  });

  const impacto = useQuery({
    queryKey: ['pcs', 'impacto', planoId, encargosPct],
    queryFn: () => pcsService.simularImpacto(planoId!, encargosPct),
    enabled: !!planoId,
  });

  return {
    linhas: enquadramento.data ?? [],
    impacto: impacto.data,
    isLoading: enquadramento.isLoading || impacto.isLoading,
  };
}

export function usePcsBenchmark() {
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id;
  const qc = useQueryClient();

  const pesquisas = useQuery({
    queryKey: ['pcs', 'benchmark', empresaId],
    queryFn: () => pcsService.listarPesquisas(empresaId!),
    enabled: !!empresaId,
  });

  const criar = useMutation({
    mutationFn: (payload: Omit<PcsPesquisaSalarialInsert, 'empresa_id'>) => {
      if (!empresaId) throw new Error('Selecione uma empresa');
      return pcsService.criarPesquisa({ ...payload, empresa_id: empresaId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pcs', 'benchmark', empresaId] });
      toast.success('Referência de mercado registrada');
    },
    onError: (e) => toast.error(erro(e, 'Não foi possível registrar a referência')),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => {
      if (!empresaId) throw new Error('Selecione uma empresa');
      return pcsService.excluirPesquisa(id, empresaId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pcs', 'benchmark', empresaId] });
      toast.success('Referência removida');
    },
    onError: (e) => toast.error(erro(e, 'Não foi possível remover a referência')),
  });

  return { pesquisas: pesquisas.data ?? [], isLoading: pesquisas.isLoading, criar, excluir };
}
