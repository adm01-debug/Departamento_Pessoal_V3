import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEmpresas } from './useEmpresas';
import * as service from '@/services/colaboradorDetalhesService';

// Dependentes
export function useDependentes(colaboradorId: string) {
  const { empresaAtual } = useEmpresas();
  return useQuery({
    queryKey: ['dependentes', colaboradorId, empresaAtual?.id],
    queryFn: () => service.listarDependentes(colaboradorId, empresaAtual!.id),
    enabled: !!colaboradorId && !!empresaAtual?.id,
  });
}

export function useCriarDependente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: service.criarDependente,
    onSuccess: (_, vars: any) => qc.invalidateQueries({ queryKey: ['dependentes', vars.colaborador_id] }),
  });
}

export function useAtualizarDependente() {
  const qc = useQueryClient();
  const { empresaAtual } = useEmpresas();
  return useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: Record<string, unknown> }) =>
      service.atualizarDependente(id, dados, empresaAtual!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dependentes'] }),
  });
}

export function useExcluirDependente(colaboradorId: string) {
  const qc = useQueryClient();
  const { empresaAtual } = useEmpresas();
  return useMutation({
    mutationFn: (id: string) => service.excluirDependente(id, empresaAtual!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dependentes', colaboradorId] }),
  });
}

// Contatos de Emergência
export function useContatosEmergencia(colaboradorId: string) {
  return useQuery({
    queryKey: ['contatos-emergencia', colaboradorId],
    queryFn: () => service.listarContatosEmergencia(colaboradorId),
    enabled: !!colaboradorId,
  });
}

export function useCriarContatoEmergencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: service.criarContatoEmergencia,
    onSuccess: (_, vars: any) => qc.invalidateQueries({ queryKey: ['contatos-emergencia', vars.colaborador_id] }),
  });
}

export function useExcluirContatoEmergencia(colaboradorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => service.excluirContatoEmergencia(colaboradorId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contatos-emergencia', colaboradorId] }),
  });
}

// Histórico Salarial
export function useHistoricoSalarial(colaboradorId: string) {
  const { empresaAtual } = useEmpresas();
  return useQuery({
    queryKey: ['historico-salarial', colaboradorId, empresaAtual?.id],
    queryFn: () => service.listarHistoricoSalarial(colaboradorId, empresaAtual!.id),
    enabled: !!colaboradorId && !!empresaAtual?.id,
  });
}

export function useCriarRegistroSalarial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: service.criarRegistroSalarial,
    onSuccess: (_, vars: any) => qc.invalidateQueries({ queryKey: ['historico-salarial', vars.colaborador_id] }),
  });
}

// ASOs
export function useASOs(colaboradorId: string) {
  const { empresaAtual } = useEmpresas();
  return useQuery({
    queryKey: ['asos', colaboradorId, empresaAtual?.id],
    queryFn: () => service.listarASOs(colaboradorId, empresaAtual!.id),
    enabled: !!colaboradorId && !!empresaAtual?.id,
  });
}

export function useCriarASO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: service.criarASO,
    onSuccess: (_, vars: any) => qc.invalidateQueries({ queryKey: ['asos', vars.colaborador_id] }),
  });
}

// Formações Acadêmicas
export function useFormacoes(colaboradorId: string) {
  return useQuery({
    queryKey: ['formacoes', colaboradorId],
    queryFn: () => service.listarFormacoes(colaboradorId),
    enabled: !!colaboradorId,
  });
}

export function useCriarFormacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: service.criarFormacao,
    onSuccess: (_, vars: any) => qc.invalidateQueries({ queryKey: ['formacoes', vars.colaborador_id] }),
  });
}

export function useExcluirFormacao(colaboradorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => service.excluirFormacao(colaboradorId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['formacoes', colaboradorId] }),
  });
}

// Dados Estrangeiro
export function useDadosEstrangeiro(colaboradorId: string) {
  return useQuery({
    queryKey: ['dados-estrangeiro', colaboradorId],
    queryFn: () => service.obterDadosEstrangeiro(colaboradorId),
    enabled: !!colaboradorId,
  });
}

export function useSalvarDadosEstrangeiro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ colaboradorId, dados }: { colaboradorId: string; dados: Record<string, unknown> }) =>
      service.salvarDadosEstrangeiro(colaboradorId, dados),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['dados-estrangeiro', vars.colaboradorId] }),
  });
}

// Deficiência (PCD)
export function useDeficiencia(colaboradorId: string) {
  return useQuery({
    queryKey: ['deficiencia', colaboradorId],
    queryFn: () => service.obterDeficiencia(colaboradorId),
    enabled: !!colaboradorId,
  });
}

export function useSalvarDeficiencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ colaboradorId, dados }: { colaboradorId: string; dados: Record<string, unknown> }) =>
      service.salvarDeficiencia(colaboradorId, dados),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['deficiencia', vars.colaboradorId] }),
  });
}

// Período de Experiência
export function usePeriodoExperiencia(colaboradorId: string) {
  return useQuery({
    queryKey: ['periodo-experiencia', colaboradorId],
    queryFn: () => service.obterPeriodoExperiencia(colaboradorId),
    enabled: !!colaboradorId,
  });
}

export function useSalvarPeriodoExperiencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ colaboradorId, dados }: { colaboradorId: string; dados: Record<string, unknown> }) =>
      service.salvarPeriodoExperiencia(colaboradorId, dados),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['periodo-experiencia', vars.colaboradorId] }),
  });
}

// Anotações
export function useAnotacoes(colaboradorId: string) {
  return useQuery({
    queryKey: ['anotacoes', colaboradorId],
    queryFn: () => service.listarAnotacoes(colaboradorId),
    enabled: !!colaboradorId,
  });
}

export function useCriarAnotacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: service.criarAnotacao,
    onSuccess: (_, vars: any) => qc.invalidateQueries({ queryKey: ['anotacoes', vars.colaborador_id] }),
  });
}

export function useExcluirAnotacao(colaboradorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => service.excluirAnotacao(colaboradorId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['anotacoes', colaboradorId] }),
  });
}

// Períodos Aquisitivos
export function usePeriodosAquisitivos(colaboradorId: string) {
  const { empresaAtual } = useEmpresas();
  return useQuery({
    queryKey: ['periodos-aquisitivos', colaboradorId, empresaAtual?.id],
    queryFn: () => service.listarPeriodosAquisitivos(colaboradorId, empresaAtual!.id),
    enabled: !!colaboradorId && !!empresaAtual?.id,
  });
}

// Tabelas de Referência
export function useEtnias() {
  return useQuery({ queryKey: ['etnias'], queryFn: service.listarEtnias });
}

export function useIdentidadesGenero() {
  return useQuery({ queryKey: ['identidades-genero'], queryFn: service.listarIdentidadesGenero });
}

export function useTiposAdmissao() {
  return useQuery({ queryKey: ['tipos-admissao'], queryFn: service.listarTiposAdmissao });
}

export function useTiposEstabilidade() {
  return useQuery({ queryKey: ['tipos-estabilidade'], queryFn: service.listarTiposEstabilidade });
}

// Times
export function useTimes(empresaId?: string) {
  return useQuery({
    queryKey: ['times', empresaId],
    queryFn: () => service.listarTimes(empresaId!),
    enabled: !!empresaId,
  });
}

// Webhooks
export function useWebhooks(empresaId?: string) {
  return useQuery({
    queryKey: ['webhooks', empresaId],
    queryFn: () => service.listarWebhooks(empresaId!),
    enabled: !!empresaId,
  });
}

export function useCriarWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: service.criarWebhook,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webhooks'] }),
  });
}

// Férias Coletivas
export function useFeriasColetivas(empresaId: string) {
  return useQuery({
    queryKey: ['ferias-coletivas', empresaId],
    queryFn: () => service.listarFeriasColetivas(empresaId),
    enabled: !!empresaId,
  });
}

export function useCriarFeriasColetivas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: service.criarFeriasColetivas,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ferias-coletivas'] }),
  });
}

// Campos Customizados
export function useCamposCustomizados(empresaId?: string) {
  return useQuery({
    queryKey: ['campos-customizados', empresaId],
    queryFn: () => service.listarCamposCustomizados(empresaId!),
    enabled: !!empresaId,
  });
}
