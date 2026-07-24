import { useState } from 'react';
import { useGenericCrud } from './useGenericCrud';
import { colaboradorService } from '@/services/colaboradorService';
import { useEmpresas } from './useEmpresas';
import { Colaborador } from '@/types/entities';
import { useQuery } from '@tanstack/react-query';

export function useColaboradores() {
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id;

  const [status, setStatus] = useState('all');
  const [departamento, setDepartamento] = useState('all');
  const [cargo, setCargo] = useState('all');

  const { data: summary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['colaboradores-summary', empresaId, departamento, cargo],
    queryFn: () => colaboradorService.getSummary(empresaId!, { departamento, cargo }),
    enabled: !!empresaId,
  });

  const crud = useGenericCrud<Colaborador>({
    queryKey: 'colaboradores',
    service: colaboradorService,
    initialPageSize: 25,
    filters: {
      empresaId,
      status,
      departamento,
      cargo
    },
    successMessages: {
      create: 'Colaborador criado com sucesso',
      update: 'Colaborador atualizado',
      delete: 'Colaborador excluído'
    }
  });

  return {
    ...crud,
    colaboradores: crud.items,
    status,
    setStatus,
    departamento,
    setDepartamento,
    cargo,
    setCargo,
    summary,
    isLoadingSummary,
    criar: (data: any) => crud.criar({ ...data, empresa_id: empresaId }),
  };
}
