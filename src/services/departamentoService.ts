import { BaseService } from './baseService';
import { Departamento } from '@/types/entities';

class DepartamentoService extends BaseService<Departamento> {
  constructor() {
    super('departamentos', { 
      searchColumn: 'nome', 
      defaultOrderBy: 'nome' 
    });
  }
}

export const departamentoService = new DepartamentoService();
