// Verificação de integridade financeira da folha.
//
// Confere que os totais persistidos em `folhas_pagamento` batem com a soma
// atual em `holerites` E em `folha_itens` (cruzamento duplo). Isso captura:
// - Recálculos parciais que não atualizaram o cabeçalho
// - Divergências entre a fonte de verdade (holerites) e a projeção contábil
//   (folha_itens)
// - Corrupção manual do cabeçalho da folha
//
// Retorna `{ ok: true, ...somas }` quando tudo bate dentro da tolerância;
// `{ ok: false, code, details }` caso contrário, com o motivo específico
// para logging/auditoria — sem vazar PII.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const FINANCIAL_TOLERANCE = 0.01; // R$ 0,01

export type IntegrityFolha = {
  total_proventos: number | null;
  total_descontos: number | null;
  total_liquido: number | null;
  total_fgts?: number | null;
};

export type IntegrityCheck =
  | {
      ok: true;
      holerites_count: number;
      itens_count: number;
      sum_proventos: number;
      sum_descontos: number;
      sum_liquido: number;
      sum_fgts: number;
    }
  | {
      ok: false;
      code:
        | 'FOLHA_EMPTY'
        | 'HOLERITE_LOAD_ERROR'
        | 'ITENS_LOAD_ERROR'
        | 'INTEGRITY_MISMATCH_HEADER'
        | 'INTEGRITY_MISMATCH_CROSS'
        | 'ITENS_MISSING';
      details: Record<string, unknown>;
    };

function approxEq(a: number, b: number): boolean {
  return Math.abs(a - b) <= FINANCIAL_TOLERANCE;
}

export async function verifyFolhaIntegrity(
  admin: SupabaseClient,
  folhaId: string,
  folha: IntegrityFolha,
): Promise<IntegrityCheck> {
  const { data: holerites, error: hErr } = await admin
    .from('holerites')
    .select('total_proventos, total_descontos, liquido, valor_fgts')
    .eq('folha_id', folhaId);

  if (hErr) {
    return { ok: false, code: 'HOLERITE_LOAD_ERROR', details: { message: hErr.message } };
  }

  const holCount = holerites?.length ?? 0;
  if (holCount === 0) {
    return { ok: false, code: 'FOLHA_EMPTY', details: { holerites_count: 0 } };
  }

  const sumProv = holerites!.reduce((s, h) => s + Number(h.total_proventos ?? 0), 0);
  const sumDesc = holerites!.reduce((s, h) => s + Number(h.total_descontos ?? 0), 0);
  const sumLiq = holerites!.reduce((s, h) => s + Number(h.liquido ?? 0), 0);
  const sumFgts = holerites!.reduce((s, h) => s + Number(h.valor_fgts ?? 0), 0);

  const hdrProv = Number(folha.total_proventos ?? 0);
  const hdrDesc = Number(folha.total_descontos ?? 0);
  const hdrLiq = Number(folha.total_liquido ?? 0);
  const hdrFgts = Number(folha.total_fgts ?? 0);

  if (
    !approxEq(sumProv, hdrProv) ||
    !approxEq(sumDesc, hdrDesc) ||
    !approxEq(sumLiq, hdrLiq)
  ) {
    return {
      ok: false,
      code: 'INTEGRITY_MISMATCH_HEADER',
      details: {
        holerites_count: holCount,
        header: { proventos: hdrProv, descontos: hdrDesc, liquido: hdrLiq },
        calculated: { proventos: sumProv, descontos: sumDesc, liquido: sumLiq },
      },
    };
  }

  // FGTS é opcional no cabeçalho: só falha se estiver preenchido e divergente
  if (folha.total_fgts != null && !approxEq(sumFgts, hdrFgts)) {
    return {
      ok: false,
      code: 'INTEGRITY_MISMATCH_HEADER',
      details: {
        holerites_count: holCount,
        header_fgts: hdrFgts,
        calculated_fgts: sumFgts,
      },
    };
  }

  // Cruzamento com folha_itens (projeção contábil)
  const { data: itens, error: iErr } = await admin
    .from('folha_itens')
    .select('total_proventos, total_descontos, total_liquido, fgts_mes')
    .eq('folha_id', folhaId);

  if (iErr) {
    return { ok: false, code: 'ITENS_LOAD_ERROR', details: { message: iErr.message } };
  }

  const itensCount = itens?.length ?? 0;
  if (itensCount === 0) {
    return {
      ok: false,
      code: 'ITENS_MISSING',
      details: { holerites_count: holCount, itens_count: 0 },
    };
  }
  if (itensCount !== holCount) {
    return {
      ok: false,
      code: 'INTEGRITY_MISMATCH_CROSS',
      details: { holerites_count: holCount, itens_count: itensCount },
    };
  }

  const itSumProv = itens!.reduce((s, i) => s + Number(i.total_proventos ?? 0), 0);
  const itSumDesc = itens!.reduce((s, i) => s + Number(i.total_descontos ?? 0), 0);
  const itSumLiq = itens!.reduce((s, i) => s + Number(i.total_liquido ?? 0), 0);

  if (
    !approxEq(itSumProv, sumProv) ||
    !approxEq(itSumDesc, sumDesc) ||
    !approxEq(itSumLiq, sumLiq)
  ) {
    return {
      ok: false,
      code: 'INTEGRITY_MISMATCH_CROSS',
      details: {
        holerites: { proventos: sumProv, descontos: sumDesc, liquido: sumLiq },
        folha_itens: { proventos: itSumProv, descontos: itSumDesc, liquido: itSumLiq },
      },
    };
  }

  return {
    ok: true,
    holerites_count: holCount,
    itens_count: itensCount,
    sum_proventos: sumProv,
    sum_descontos: sumDesc,
    sum_liquido: sumLiq,
    sum_fgts: sumFgts,
  };
}
