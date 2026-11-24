import { BaseService } from './baseService';
import { Cargo } from '@/types/entities';

class CargoService extends BaseService<Cargo> {
  constructor() {
    super('cargos', { 
      searchColumn: 'nome', 
      defaultOrderBy: 'nome',
      useVersioning: true 
    });
  }
}

export const cargoService = new CargoService();
