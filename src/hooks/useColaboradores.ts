import { useState } from 'react';
import { useGenericCrud } from './useGenericCrud';
import { colaboradorService } from '@/services/colaboradorService';
import { useEmpresas } from './useEmpresas';
import type { Colaborador } from '@/types/entities';
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

  // Opções dos dropdowns de filtro — ver colaboradorService.listarOpcoesFiltro.
  const { data: opcoesFiltro } = useQuery({
    // Prefixo 'colaboradores' de proposito: o react-query casa por prefixo, entao
    // os invalidateQueries(['colaboradores']) que o formulario, a importacao, as
    // movimentacoes e o kanban de admissoes ja fazem passam a atualizar tambem as
    // opcoes — sem isto um departamento novo levava os 5 min de staleTime para
    // aparecer no filtro.
    queryKey: ['colaboradores', 'opcoes-filtro', empresaId],
    queryFn: () => colaboradorService.listarOpcoesFiltro(empresaId!),
    enabled: !!empresaId,
  });

  const crud = useGenericCrud<Colaborador>({
    queryKey: 'colaboradores',
    service: colaboradorService,
    initialPageSize: 25,
    empresaId,
    filters: {
      empresaId,
      status,
      departamento,
      cargo,
    },
    successMessages: {
      create: 'Colaborador criado com sucesso',
      update: 'Colaborador atualizado',
      delete: 'Colaborador excluído',
    },
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
    departamentosDisponiveis: opcoesFiltro?.departamentos ?? [],
    cargosDisponiveis: opcoesFiltro?.cargos ?? [],
    criar: (data: Record<string, unknown>) => crud.criar({ ...data, empresa_id: empresaId }),
  };
}
