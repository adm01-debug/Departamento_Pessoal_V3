import type { MedidaDisciplinarInsert } from '@/types/medidasDisciplinares';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEmpresas } from './useEmpresas';
import { batidasPontoService } from '@/services/batidasPontoService';
import { faltasService } from '@/services/faltasService';
import { medidasDisciplinaresService } from '@/services/medidasDisciplinaresService';
import { episService, episEntregasService } from '@/services/episService';
import { jornadaHorariosService } from '@/services/jornadaHorariosService';
import { bancoHorasConfigService } from '@/services/bancoHorasConfigService';
import { bancoHorasService } from '@/services/bancoHorasService';
import { pontoService } from '@/services/pontoService';
import { turnoService } from '@/services/turnoService';
import type { EscalaComTurno } from '@/services/turnoService';
import {
  mockOr,
  getMockSaldoBancoHoras,
  getMockRegistrosPontoSemana,
  getMockEscalaAtual,
} from '@/mocks/colaboradoresMock';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';

type DataRecord = Record<string, unknown>;

// === BATIDAS DE PONTO ===
export function useBatidasPonto(colaboradorId: string, dataInicio?: string, dataFim?: string) {
  const { empresaAtual } = useEmpresas();
  return useQuery({
    queryKey: ['batidas-ponto', colaboradorId, dataInicio, dataFim, empresaAtual?.id],
    queryFn: () => batidasPontoService.listar(colaboradorId, dataInicio, dataFim, empresaAtual!.id),
    enabled: !!colaboradorId && !!empresaAtual?.id,
  });
}

export function useBatidasPontoDia(data: string) {
  const { empresaAtual } = useEmpresas();
  return useQuery({
    queryKey: ['batidas-ponto-dia', data, empresaAtual?.id],
    queryFn: () => batidasPontoService.listarPorData(data, empresaAtual!.id),
    enabled: !!data && !!empresaAtual?.id,
  });
}

export function useRegistrarBatida() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: TablesInsert<'batidas_ponto'>) => batidasPontoService.registrar(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['batidas-ponto'] });
      toast.success('Batida registrada');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao processar operação.')),
  });
}

// === FALTAS ===
export function useFaltas() {
  const { empresaAtual } = useEmpresas();
  return useQuery({
    queryKey: ['faltas', empresaAtual?.id],
    queryFn: () => faltasService.listar(empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });
}

export function useFaltasColaborador(colaboradorId: string) {
  const { empresaAtual } = useEmpresas();
  return useQuery({
    // Família ['faltas'], que os writers de falta invalidam. A chave irmã
    // 'faltas-colaborador' NÃO casa por prefixo: o React Query compara
    // segmento a segmento e o primeiro já difere.
    queryKey: ['faltas', 'colaborador', colaboradorId, empresaAtual?.id],
    queryFn: () => faltasService.buscarPorColaborador(colaboradorId, empresaAtual!.id),
    enabled: !!colaboradorId && !!empresaAtual?.id,
  });
}

export function useCriarFalta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: DataRecord) => faltasService.criar(d as TablesInsert<'faltas'>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['faltas'] });
      toast.success('Falta registrada');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao processar operação.')),
  });
}

export function useAtualizarFalta() {
  const qc = useQueryClient();
  const { empresaAtual } = useEmpresas();
  return useMutation({
    mutationFn: ({ id, ...d }: { id: string } & DataRecord) =>
      faltasService.atualizar(id, d as TablesUpdate<'faltas'>, empresaAtual!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['faltas'] });
      toast.success('Falta atualizada');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao processar operação.')),
  });
}

export function useExcluirFalta() {
  const qc = useQueryClient();
  const { empresaAtual } = useEmpresas();
  return useMutation({
    mutationFn: (id: string) => faltasService.excluir(id, empresaAtual!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['faltas'] });
      toast.success('Falta excluída');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao processar operação.')),
  });
}

// === MEDIDAS DISCIPLINARES ===
export function useMedidasDisciplinares() {
  const { empresaAtual } = useEmpresas();
  return useQuery({
    queryKey: ['medidas-disciplinares', empresaAtual?.id],
    queryFn: () => medidasDisciplinaresService.listar(empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });
}

export function useMedidasDisciplinaresColaborador(colaboradorId: string) {
  const { empresaAtual } = useEmpresas();
  return useQuery({
    // Dentro da família ['medidas-disciplinares'], que as 4 mutations do app
    // invalidam (useNovasTabelas.ts:129,143 e MedidaContestacaoDialog.tsx:60,72).
    // Chave irmã 'medidas-disciplinares-colaborador' NÃO casa por prefixo (o
    // primeiro segmento é outro) e ficava fora de todas elas — a Timeline
    // mostrava medida já excluída por 5 min.
    queryKey: ['medidas-disciplinares', 'colaborador', colaboradorId, empresaAtual?.id],
    queryFn: () => medidasDisciplinaresService.buscarPorColaborador(colaboradorId, empresaAtual!.id),
    enabled: !!colaboradorId && !!empresaAtual?.id,
  });
}

export function useCriarMedidaDisciplinar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: MedidaDisciplinarInsert) => medidasDisciplinaresService.criar(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medidas-disciplinares'] });
      toast.success('Medida disciplinar registrada');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao processar operação.')),
  });
}

export function useAtualizarMedidaDisciplinar() {
  const qc = useQueryClient();
  const { empresaAtual } = useEmpresas();
  return useMutation({
    mutationFn: ({ id, ...d }: { id: string } & DataRecord) =>
      medidasDisciplinaresService.atualizar(id, d, empresaAtual!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medidas-disciplinares'] });
      toast.success('Medida atualizada');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao processar operação.')),
  });
}

// === EPIs ===
export function useEpis() {
  const { empresaAtual } = useEmpresas();
  return useQuery({
    queryKey: ['epis', empresaAtual?.id],
    queryFn: () => episService.listar(empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });
}

export function useCriarEpi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: DataRecord) => episService.criar(d as TablesInsert<'epis'>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['epis'] });
      toast.success('EPI cadastrado');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao processar operação.')),
  });
}

export function useAtualizarEpi() {
  const qc = useQueryClient();
  const { empresaAtual } = useEmpresas();
  return useMutation({
    mutationFn: ({ id, ...d }: { id: string } & DataRecord) => episService.atualizar(id, d, empresaAtual!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['epis'] });
      qc.invalidateQueries({ queryKey: ['epis-entregas'] });
      toast.success('EPI atualizado');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao processar operação.')),
  });
}

export function useExcluirEpi() {
  const qc = useQueryClient();
  const { empresaAtual } = useEmpresas();
  return useMutation({
    mutationFn: (id: string) => episService.excluir(id, empresaAtual!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['epis'] });
      toast.success('EPI excluído');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao processar operação.')),
  });
}

// === ENTREGAS DE EPI ===
export function useEpisEntregas() {
  const { empresaAtual } = useEmpresas();
  return useQuery({
    queryKey: ['epis-entregas', empresaAtual?.id],
    queryFn: () => episEntregasService.listar(empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });
}

export function useEpisEntregasColaborador(colaboradorId: string) {
  const { empresaAtual } = useEmpresas();
  return useQuery({
    // Família ['epis-entregas'] — ver o comentário em useFaltasColaborador.
    queryKey: ['epis-entregas', 'colaborador', colaboradorId, empresaAtual?.id],
    queryFn: () => episEntregasService.buscarPorColaborador(colaboradorId, empresaAtual!.id),
    enabled: !!colaboradorId && !!empresaAtual?.id,
  });
}

export function useCriarEpiEntrega() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: DataRecord) => episEntregasService.criar(d as TablesInsert<'epis_entregas'>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['epis-entregas'] });
      toast.success('Entrega de EPI registrada');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao processar operação.')),
  });
}

export function useDevolverEpi() {
  const qc = useQueryClient();
  const { empresaAtual } = useEmpresas();
  return useMutation({
    mutationFn: ({ id, dataDevolucao }: { id: string; dataDevolucao: string }) =>
      episEntregasService.registrarDevolucao(id, dataDevolucao, empresaAtual!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['epis-entregas'] });
      toast.success('Devolução registrada');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao processar operação.')),
  });
}

// === JORNADAS HORÁRIOS ===
export function useJornadaHorarios(jornadaId: string) {
  return useQuery({
    queryKey: ['jornada-horarios', jornadaId],
    queryFn: () => jornadaHorariosService.listar(jornadaId),
    enabled: !!jornadaId,
  });
}

export function useSalvarGradeHorarios() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jornadaId, horarios }: { jornadaId: string; horarios: TablesInsert<'jornadas_horarios'>[] }) =>
      jornadaHorariosService.salvarGrade(jornadaId, horarios),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jornada-horarios'] });
      toast.success('Grade horária salva');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao processar operação.')),
  });
}

// === BANCO DE HORAS CONFIG ===
export function useBancoHorasConfig() {
  const { empresaAtual } = useEmpresas();
  return useQuery({
    queryKey: ['banco-horas-config', empresaAtual?.id],
    queryFn: () => bancoHorasConfigService.buscar(empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });
}

export function useSalvarBancoHorasConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: DataRecord) => bancoHorasConfigService.salvar(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banco-horas-config'] });
      toast.success('Configuração salva');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao processar operação.')),
  });
}

// === SALDO DO BANCO DE HORAS (Dossiê → Jornada & Ponto) ===
// Chave dentro da família `banco_horas` já usada pelas leituras da área
// (useBancoHoras), e não uma chave própria: assim qualquer writer que
// invalide ['banco_horas'] também derruba este saldo.
export function useSaldoBancoHoras(colaboradorId: string) {
  const { empresaAtual } = useEmpresas();
  return useQuery({
    queryKey: ['banco_horas', 'saldo', colaboradorId, empresaAtual?.id],
    queryFn: async () =>
      mockOr(getMockSaldoBancoHoras(colaboradorId)) ?? bancoHorasService.getSaldo(colaboradorId, empresaAtual!.id),
    enabled: !!colaboradorId && !!empresaAtual?.id,
  });
}

// === REGISTROS DE PONTO DA SEMANA (Dossiê → Jornada & Ponto) ===
// Família ['registros-ponto'], que os writers de ponto já invalidam — bater
// ponto atualiza este resumo sem esperar os 5 min de staleTime.
export function useRegistrosPontoSemana(colaboradorId: string) {
  return useQuery({
    queryKey: ['registros-ponto', 'semana', colaboradorId],
    queryFn: async () =>
      (mockOr(getMockRegistrosPontoSemana(colaboradorId)) as Tables<'registros_ponto'>[] | undefined) ??
      pontoService.buscarRegistrosSemana(colaboradorId),
    enabled: !!colaboradorId,
  });
}

// === ESCALA ATUAL (Dossiê → Jornada & Ponto) ===
// Família ['escalas'], a mesma que as telas de escala já invalidam ao criar,
// editar ou excluir escala — salvar a escala derruba este card sozinho.
export function useEscalaAtual(colaboradorId: string) {
  const { empresaAtual } = useEmpresas();
  return useQuery({
    queryKey: ['escalas', 'atual', colaboradorId, empresaAtual?.id],
    queryFn: async () =>
      (mockOr(getMockEscalaAtual(colaboradorId)) as EscalaComTurno | undefined) ??
      turnoService.buscarEscalaAtual(colaboradorId, empresaAtual!.id),
    enabled: !!colaboradorId && !!empresaAtual?.id,
  });
}
