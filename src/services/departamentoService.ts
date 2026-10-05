import { BaseService } from './baseService';
import { Departamento } from '@/types/entities';
import { departamentoSchema } from '@/schemas/departamento';

class DepartamentoService extends BaseService<Departamento> {
  constructor() {
    super('departamentos', {
      searchColumn: 'nome',
      defaultOrderBy: 'nome',
      schema: departamentoSchema,
    });
  }
}

export const departamentoService = new DepartamentoService();
