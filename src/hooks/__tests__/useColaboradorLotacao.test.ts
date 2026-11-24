import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { chaveCatalogoLotacoes, chaveLotacoesDoColaborador } from '../useColaboradorLotacao';

/**
 * `useDefinirLotacaoPrincipal` invalida UMA chave — a da lista de vínculos — e
 * conta com o casamento por prefixo do React Query para alcançar também a
 * query da lotação principal, cuja chave é a da lista + 'principal'.
 *
 * Se essa relação de prefixo se quebrar (alguém reordenar os segmentos), a
 * troca de lotação passaria a atualizar a lista e deixar o campo do dossiê
 * exibindo a lotação antiga até o staleTime expirar. Este teste trava isso.
 */
const CHAVE_LISTA = chaveLotacoesDoColaborador('col-1', 'emp-1');
const CHAVE_PRINCIPAL = [...CHAVE_LISTA, 'principal'];

function clienteComCache() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(CHAVE_LISTA, []);
  qc.setQueryData(CHAVE_PRINCIPAL, null);
  qc.setQueryData(chaveCatalogoLotacoes('emp-1'), []);
  return qc;
}

const invalidada = (qc: QueryClient, chave: readonly unknown[]) =>
  qc.getQueryCache().find({ queryKey: chave })?.state.isInvalidated ?? false;

describe('chaves de colaborador_lotacoes', () => {
  it('invalidar a lista alcança a query da lotação principal', async () => {
    const qc = clienteComCache();
    await qc.invalidateQueries({ queryKey: CHAVE_LISTA });
    expect(invalidada(qc, CHAVE_LISTA)).toBe(true);
    expect(invalidada(qc, CHAVE_PRINCIPAL)).toBe(true);
  });

  it('não invalida o catálogo da empresa (prefixo diferente)', async () => {
    const qc = clienteComCache();
    await qc.invalidateQueries({ queryKey: CHAVE_LISTA });
    expect(invalidada(qc, chaveCatalogoLotacoes('emp-1'))).toBe(false);
  });

  it('a chave é escopada por empresa — outra empresa não é alcançada', async () => {
    const qc = clienteComCache();
    qc.setQueryData(chaveLotacoesDoColaborador('col-1', 'emp-2'), []);
    await qc.invalidateQueries({ queryKey: CHAVE_LISTA });
    expect(invalidada(qc, chaveLotacoesDoColaborador('col-1', 'emp-2'))).toBe(false);
  });
});
