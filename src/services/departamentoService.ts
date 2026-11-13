import { supabase } from '@/integrations/supabase/client';
import { BaseService } from './baseService';
import type { Departamento } from '@/types/entities';
import { departamentoSchema } from '@/schemas/departamento';

class DepartamentoService extends BaseService<Departamento> {
  constructor() {
    super('departamentos', {
      searchColumn: 'nome',
      defaultOrderBy: 'nome',
      schema: departamentoSchema,
    });
  }

  /**
   * Colaboradores não desligados vinculados ao departamento. O vínculo é por
   * nome: `colaboradores.departamento` é texto (não há departamento_id na tabela).
   */
  async contarColaboradoresVinculados(nome: string, empresaId: string): Promise<number> {
    const { count, error } = await supabase
      .from('colaboradores')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresaId)
      .eq('departamento', nome)
      .neq('status', 'desligado');
    if (error) throw error;
    return count ?? 0;
  }
}

export const departamentoService = new DepartamentoService();
