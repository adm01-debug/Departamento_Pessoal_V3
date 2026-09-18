import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from './useEmpresas';
import { MOCK_MODE, getMockOrganograma } from '@/mocks/colaboradoresMock';

export function useOrganograma() {
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id;
  const mockData = MOCK_MODE ? getMockOrganograma() : undefined;

  const query = useQuery({
    queryKey: ['organograma_hierarquico', empresaId],
    enabled: mockData === undefined,
    initialData: mockData,
    queryFn: async () => {
      // Buscar departamentos com informações de parentesco
      // Removido filtro de empresa_id para departamentos pois não existe no schema externo
      const { data: deps, error: depsError } = await supabase
        .from('departamentos')
        .select('*')
        .order('nome');

      if (depsError) throw depsError;

      // Buscar todos os colaboradores ativos para distribuir nos departamentos
      const { data: cols, error: colsError } = await supabase
        .from('colaboradores')
        .select('id, nome_completo, departamento, email, foto_url')
        .eq('status', 'ativo' as any); // Type cast for status

      if (colsError) throw colsError;

      // Montar estrutura hierárquica
      const departamentosMap = new Map();
      const rootDepartamentos: any[] = [];

      deps?.forEach(d => {
        departamentosMap.set(d.id, {
          ...d,
          colaboradores: cols?.filter(c => c.departamento === d.nome) || [],
          sub_departamentos: []
        });
      });

      departamentosMap.forEach(d => {
        if (d.departamento_pai_id && departamentosMap.has(d.departamento_pai_id)) {
          departamentosMap.get(d.departamento_pai_id).sub_departamentos.push(d);
        } else {
          rootDepartamentos.push(d);
        }
      });

      return rootDepartamentos;
    }
  });

  return {
    dados: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch
  };
}
