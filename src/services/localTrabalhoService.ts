import { BaseService } from './baseService';
import { mockOr, getMockLocalTrabalho } from '@/mocks/colaboradoresMock';

class LocalTrabalhoService extends BaseService<any> {
  constructor() {
    super('locais_trabalho', {
      searchColumn: 'nome',
      defaultOrderBy: 'nome'
    });
  }

  async buscarPorId(id: string, empresaId?: string) {
    const mock = mockOr(getMockLocalTrabalho(id));
    if (mock) return mock;
    return super.buscarPorId(id, empresaId);
  }
}

export const localTrabalhoService = new LocalTrabalhoService();
