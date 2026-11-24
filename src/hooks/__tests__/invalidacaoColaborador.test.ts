import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';

/**
 * Por que os writers de colaborador invalidam DUAS chaves.
 *
 * O React Query casa chave por prefixo comparando segmento a segmento: se o
 * primeiro segmento difere, não casa — 'colaboradores' e 'colaborador' são
 * strings diferentes. A casca do dossiê (ColaboradorDetalhesPage), o
 * useHistoricoColaborador e as abas Trabalho & Hierarquia e Jornada & Ponto
 * leem ['colaborador', id, empresaId]; as listagens leem ['colaboradores'].
 *
 * Enquanto os writers invalidavam só o plural, editar um colaborador
 * atualizava a listagem e deixava o dossiê dele com o dado antigo até o
 * staleTime de 5 min (queryClient.ts) expirar — e `refetchOnWindowFocus` está
 * desligado, então nem voltar para a aba resolvia.
 *
 * Este teste trava a semântica da qual as duas linhas dependem.
 */
const CHAVE_DOSSIE = ['colaborador', 'col-1', 'emp-1'] as const;

function clienteComDossieEmCache() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(CHAVE_DOSSIE, { id: 'col-1', nome_completo: 'Antes' });
  return qc;
}

const estaInvalidada = (qc: QueryClient) =>
  qc.getQueryCache().find({ queryKey: CHAVE_DOSSIE })?.state.isInvalidated ?? false;

describe('invalidação do dossiê do colaborador', () => {
  it("['colaboradores'] NÃO alcança a chave do dossiê", async () => {
    const qc = clienteComDossieEmCache();
    await qc.invalidateQueries({ queryKey: ['colaboradores'] });
    expect(estaInvalidada(qc)).toBe(false);
  });

  it("['colaborador'] alcança a chave do dossiê", async () => {
    const qc = clienteComDossieEmCache();
    await qc.invalidateQueries({ queryKey: ['colaborador'] });
    expect(estaInvalidada(qc)).toBe(true);
  });

  it("['colaborador'] alcança o dossiê de qualquer colaborador e empresa", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData(['colaborador', 'col-2', 'emp-9'], { id: 'col-2' });
    await qc.invalidateQueries({ queryKey: ['colaborador'] });
    expect(qc.getQueryCache().find({ queryKey: ['colaborador', 'col-2', 'emp-9'] })?.state.isInvalidated).toBe(true);
  });
});
