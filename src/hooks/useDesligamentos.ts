import { useMemo } from 'react';
import { useEmpresas } from './useEmpresas';
import { useGenericCrud } from './useGenericCrud';
import { desligamentoService } from '@/services/desligamentoService';
import { getMockDesligamentos } from '@/mocks/desligamentosMock';

export function useDesligamentos() {
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id;

  // MOCK VISUAL — ver src/mocks/desligamentosMock.ts. Fica `undefined` (nenhum
  // efeito) quando o modo demonstração está desligado; com ele ligado, a área
  // passa a mostrar o conjunto fictício, igual a Admissões/Colaboradores.
  const ficticios = useMemo(() => getMockDesligamentos(empresaId), [empresaId]);

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
    // Com o mock ligado a consulta real nem dispara: os dados fictícios abaixo
    // tomam o lugar dela (e o mesmo vale para `isLoading`/`error`).
    enabled: !ficticios,
  });

  // MOCK VISUAL — curto-circuito de LEITURA: só troca o que a tela consome.
  if (ficticios) {
    return {
      ...crud,
      items: ficticios as unknown as typeof crud.items,
      desligamentos: ficticios,
      total: ficticios.length,
      isLoading: false,
      isFetching: false,
      error: null,
    };
  }

  return {
    ...crud,
    desligamentos: crud.items,
  };
}
