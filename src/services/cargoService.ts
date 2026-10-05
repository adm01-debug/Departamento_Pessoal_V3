import { BaseService } from './baseService';
import { Cargo } from '@/types/entities';
import { cargoSchema } from '@/schemas/cargo';

class CargoService extends BaseService<Cargo> {
  constructor() {
    super('cargos', {
      searchColumn: 'nome',
      defaultOrderBy: 'nome',
      useVersioning: true,
      schema: cargoSchema,
    });
  }
}

export const cargoService = new CargoService();
