import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { afastamentoService } from '@/services/afastamentoService';
import { useEmpresas } from './useEmpresas';
import { auditLogger } from '@/utils/auditLogger';
import { toast } from 'sonner';
import { useGenericCrud } from './useGenericCrud';
import { safeErrorMessage } from '@/utils/safeError';

// P2-051 (batch 2026-07-26): filtros tipados para o useGenericCrud.
// Cada chave é opcional e aceita string (filtro livre, id, status, etc.).
export interface AfastamentoFiltros {
  status?: string;
  tipo?: string;
  colaborador_id?: string;
  data_inicio?: string;
  data_fim?: string;
  busca?: string;
  [key: string]: string | undefined;
}

export function useAfastamentos() {
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id;
  const [filtros, setFiltros] = useState<AfastamentoFiltros>({});

  const crud = useGenericCrud<unknown>({
    queryKey: 'afastamentos',
    service: afastamentoService,
    filters: { ...filtros, empresaId },
    successMessages: {
      create: 'Afastamento registrado com sucesso',
      update: 'Afastamento atualizado com sucesso',
      delete: 'Afastamento excluído com sucesso'
    }
  });

  const configsQuery = useQuery({
    queryKey: ['afastamentos-configs'],
    queryFn: () => afastamentoService.listarConfiguracoes(),
  });

  return {
    ...crud,
    afastamentos: crud.items,
    configs: configsQuery.data || [],
    isLoading: crud.isLoading || configsQuery.isLoading,
    isCriando: crud.isCreating,
    isAtualizando: crud.isUpdating,
    filtros,
    setFiltros,
  };
}



export function useProrrogacoesAfastamento(afastamentoId?: string) {
  const queryClient = useQueryClient();
  const { empresaAtual } = useEmpresas();

  const query = useQuery({
    queryKey: ['prorrogacoes-afastamento', empresaAtual?.id, afastamentoId],
    queryFn: () => afastamentoService.listarProrrogacoes(afastamentoId, empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });

  const criarMutation = useMutation({
    mutationFn: (data: any) => afastamentoService.criarProrrogacao(data, empresaAtual!.id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['prorrogacoes-afastamento'] });
      queryClient.invalidateQueries({ queryKey: ['afastamentos'] });
      auditLogger.log({
        tabela: 'prorrogacoes_afastamento',
        registro_id: (data as any).id,
        acao: 'INSERT',
        dados_novos: data
      });
      toast.success('Prorrogação registrada com sucesso');
    },
    onError: (err: Error) => toast.error(safeErrorMessage(err, 'Erro ao registrar prorrogação.')),
  });

  return {
    prorrogacoes: query.data || [],
    isLoading: query.isLoading,
    criar: criarMutation.mutateAsync,
    isCriando: criarMutation.isPending,
  };
}

export function useDocumentosAfastamento(afastamentoId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['documentos-afastamento', afastamentoId],
    queryFn: () => afastamentoService.listarDocumentos(afastamentoId!),
    enabled: !!afastamentoId,
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, tipo }: { file: File; tipo: string }) => {
      return afastamentoService.uploadDocumento(afastamentoId!, file, tipo);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos-afastamento', afastamentoId] });
      toast.success('Documento enviado com sucesso');
    },
    onError: (err: Error) => toast.error(safeErrorMessage(err, 'Erro ao enviar documento.')),
  });

  const excluirMutation = useMutation({
    mutationFn: (id: string) => (afastamentoService as any).excluir(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos-afastamento', afastamentoId] });
      toast.success('Documento excluído com sucesso');
    },
    onError: (err: Error) => toast.error(safeErrorMessage(err, 'Erro ao excluir documento.')),
  });

  return {
    documentos: query.data || [],
    isLoading: query.isLoading,
    upload: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
    excluir: excluirMutation.mutateAsync,
  };
}
