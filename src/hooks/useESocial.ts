import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as esocialService from '@/services/esocialService';
import { toast } from 'sonner';
import { useServerValidation } from './useServerValidation';
import { useEmpresas } from './useEmpresas';

export function useESocial() {
  const queryClient = useQueryClient();
  const { handleServerError } = useServerValidation();
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id;

  const eventosQuery = useQuery({
    queryKey: ['esocial-eventos', empresaId],
    queryFn: async () => {
      return await esocialService.listarEventos(empresaId!);
    },
    enabled: !!empresaId,
  });

  const statsQuery = useQuery({
    queryKey: ['esocial-stats', empresaId],
    queryFn: async () => {
      return await esocialService.obterEstatisticas(empresaId!);
    },
    enabled: !!empresaId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['esocial-eventos'] });
    queryClient.invalidateQueries({ queryKey: ['esocial-stats'] });
  };

  const enviarMutation = useMutation({
    mutationFn: async ({ eventoId, empresaId }: { eventoId: string; empresaId: string }) => {
      return await esocialService.enviarEvento(eventoId, empresaId);
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast.success(`Evento enviado — Protocolo: ${data.protocolo}`);
      } else {
        toast.error(`Falha no envio: ${data?.error}`);
      }
      invalidate();
    },
    onError: (err: any) => handleServerError(err),
  });

  const reenviarMutation = useMutation({
    mutationFn: async ({ eventoId, empresaId }: { eventoId: string; empresaId: string }) => {
      return await esocialService.reenviarEvento(eventoId, empresaId);
    },
    onSuccess: (data) => {
      if (data?.success) toast.success('Evento reenviado com sucesso');
      else toast.error(`Falha ao reenviar: ${data?.error}`);
      invalidate();
    },
    onError: (err: any) => handleServerError(err),
  });

  const gerarEventosMutation = useMutation({
    mutationFn: async ({ empresaId, competencia }: { empresaId: string; competencia: string }) => {
      return await esocialService.gerarEventosPeriodo(empresaId, competencia);
    },
    onSuccess: (data) => {
      toast.success(`Geração concluída: ${data.criados} criados, ${data.pulados} já existentes.`);
      invalidate();
    },
    onError: (err: any) => handleServerError(err),
  });

  const configQuery = useQuery({
    queryKey: ['esocial-config', empresaId],
    queryFn: async () => esocialService.getConfig(empresaId!),
    enabled: !!empresaId,
  });

  const certificadosQuery = useQuery({
    queryKey: ['esocial-certificados', empresaId],
    queryFn: async () => esocialService.listarCertificados(empresaId!),
    enabled: !!empresaId,
  });

  const logsQuery = useQuery({
    queryKey: ['esocial-logs', empresaId],
    queryFn: async () => esocialService.listarTransmissaoLogs(empresaId!),
    enabled: !!empresaId,
  });

  const enviarLoteMutation = useMutation({
    mutationFn: async ({ eventoIds, empresaId }: { eventoIds: string[]; empresaId: string }) => {
      const results: any[] = [];
      for (const id of eventoIds) {
        results.push(await esocialService.enviarEvento(id, empresaId));
      }
      return results;
    },
    onSuccess: () => { 
      toast.success('Lote enviado com sucesso'); 
      invalidate(); 
    },
    onError: (err: any) => handleServerError(err),
  });

  return {
    eventos: eventosQuery.data || [],
    stats: statsQuery.data || { enviados: 0, pendentes: 0, erros: 0, conformidade: 100 },
    config: configQuery.data,
    certificados: certificadosQuery.data || [],
    logs: logsQuery.data || [],
    isLoading: eventosQuery.isLoading || statsQuery.isLoading,
    criarEvento: esocialService.criarEvento,
    enviarEvento: enviarMutation.mutate,
    enviarLote: enviarLoteMutation.mutate,
    reenviarEvento: reenviarMutation.mutate,
    gerarEventosPeriodo: gerarEventosMutation.mutate,
    salvarConfig: esocialService.salvarConfig,
    adicionarCertificado: esocialService.adicionarCertificado,
    refreshLogs: () => queryClient.invalidateQueries({ queryKey: ['esocial-logs'] }),
    isSending: enviarMutation.isPending || reenviarMutation.isPending || gerarEventosMutation.isPending,
  };
}

