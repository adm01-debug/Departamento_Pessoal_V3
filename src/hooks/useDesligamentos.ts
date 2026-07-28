import { useEmpresas } from './useEmpresas';
import { useGenericCrud } from './useGenericCrud';
import { desligamentoService } from '@/services/desligamentoService';

export function useDesligamentos() {
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id;

  // IMPORTANTE: `empresaId` é passado nas duas formas — como parâmetro dedicado
  // (destrava `enabled` em useGenericCrud, que ignora `empresa_id`/`empresaId`
  // dentro de `filters`) e dentro de `filters` apenas quando definido (o
  // desligamentoService exige `empresa_id` explícito em listar()).
  // Sem isso, a query nunca dispara e a página exibe lista vazia.
  const crud = useGenericCrud<unknown>({
    queryKey: 'desligamentos',
    service: desligamentoService,
    filters: empresaId ? { empresa_id: empresaId } : {},
    empresaId,
  });

  return {
    ...crud,
    desligamentos: crud.items,
  };
}
