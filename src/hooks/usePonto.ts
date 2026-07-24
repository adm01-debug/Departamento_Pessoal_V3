import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pontosService } from '@/services/pontosService';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';

export function usePonto(colaboradorId?: string) {
  const { empresaAtual } = useEmpresa();
  const queryClient = useQueryClient();

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ['registros-ponto', empresaAtual?.id, colaboradorId],
    enabled: !!empresaAtual?.id && !!colaboradorId,
    queryFn: async () => {
      return await pontosService.listar(colaboradorId!, undefined, undefined);
    },
  });

  const { data: hoje } = useQuery({
    queryKey: ['ponto-hoje', colaboradorId],
    enabled: !!colaboradorId,
    queryFn: async () => {
      return await pontosService.buscarRegistroHoje(colaboradorId!);
    },
  });

  const registrarPonto = useMutation({
    mutationFn: async ({ 
      tipo, 
      colaboradorId: colId, 
      geo,
      foto_biometria_url,
      foto_base64
    }: { 
      tipo: 'entrada' | 'saida_almoco' | 'retorno_almoco' | 'saida'; 
      colaboradorId: string;
      geo?: { latitude: number; longitude: number; accuracy: number };
      foto_biometria_url?: string | null;
      foto_base64?: string | null;
    }) => {
      const res = await pontosService.registrar(tipo, colId, {
        latitude: geo?.latitude,
        longitude: geo?.longitude,
        precisao: geo?.accuracy,
        dispositivoId: navigator.userAgent,
        foto_biometria_url
      });
      const batida = res;

      if (batida && foto_base64 && navigator.onLine) {
        pontosService.validarBiometria(batida.id, colId, foto_base64)
          .then(resBio => {
            if (resBio.valid) {
              toast.success('Biometria validada com sucesso!');
            } else {
              toast.error('Atenção: Falha na validação biométrica!');
            }
          })
          .catch(err => {
            console.error('Erro na validação biométrica:', err);
            toast.error('Falha na validação biométrica. O registro de ponto não será validado.');
          });
      }

      return batida;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registros-ponto'] });
      queryClient.invalidateQueries({ queryKey: ['ponto-hoje'] });
      toast.success('Ponto registrado com sucesso!');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao registrar ponto.')),
  });

  return { 
    registros: registros || [], 
    hoje: hoje || [],
    isLoading, 
    registrarPonto: registrarPonto.mutateAsync,
    isRegistering: registrarPonto.isPending
  };
}

