import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useEmpresas } from '@/hooks/useEmpresas';
import { contratoTemplateService, type ContratoTemplate } from '@/services/contratoTemplateService';
import { safeErrorMessage } from '@/utils/safeError';

export function useContratoTemplates() {
  const { empresaAtual } = useEmpresas();
  const queryClient = useQueryClient();
  const empresaId = empresaAtual?.id;

  const listQuery = useQuery({
    queryKey: ['contrato-templates', empresaId],
    queryFn: () => contratoTemplateService.listar(empresaId!),
    enabled: !!empresaId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['contrato-templates'] });

  const salvar = useMutation({
    mutationFn: (payload: Partial<ContratoTemplate>) =>
      contratoTemplateService.salvar({ ...payload, empresa_id: empresaId! } as never),
    onSuccess: () => { invalidate(); toast.success('Modelo salvo'); },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao salvar modelo.')),
  });

  const duplicar = useMutation({
    mutationFn: (id: string) => contratoTemplateService.duplicarNovaVersao(id),
    onSuccess: () => { invalidate(); toast.success('Nova versão criada'); },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao versionar.')),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => contratoTemplateService.excluir(id),
    onSuccess: () => { invalidate(); toast.success('Modelo excluído'); },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao excluir.')),
  });

  const gerarContrato = useMutation({
    mutationFn: ({ admissao_id, template_id }: { admissao_id: string; template_id?: string }) =>
      contratoTemplateService.gerarPdf(admissao_id, template_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos-gerados'] });
      toast.success('Contrato gerado com hash SHA-256');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao gerar contrato.')),
  });

  return {
    templates: listQuery.data ?? [],
    isLoading: listQuery.isLoading,
    salvar,
    duplicar,
    excluir,
    gerarContrato,
  };
}
