import { BaseService } from './baseService';
import type { Tables, Insertable, Updatable } from '@/integrations/supabase/database.types';

class LocalTrabalhoService extends BaseService<
  Tables<'locais_trabalho'>,
  Insertable<'locais_trabalho'>,
  Updatable<'locais_trabalho'>
> {
  constructor() {
    super('locais_trabalho', {
      searchColumn: 'nome',
      defaultOrderBy: 'nome',
    });
  }
}

export const localTrabalhoService = new LocalTrabalhoService();
