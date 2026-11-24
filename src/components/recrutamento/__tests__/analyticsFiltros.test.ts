import { describe, expect, it } from 'vitest';
import type { CandidatoRow } from '@/types/recrutamento';
import { criarCandidatura, criarVaga } from './candidatosFixture';
import {
  FILTROS_PADRAO,
  PERIODO_PADRAO,
  VAGA_TODAS,
  diasDoPeriodo,
  filtrarEntradaAnalytics,
  rotuloDoPeriodo,
  temFiltroAtivo,
} from '../analyticsFiltros';

/**
 * Recorte da barra de ações da Analytics. A regra que importa: o filtro é
 * aplicado ANTES da matemática, então candidaturas, vagas e candidatos precisam
 * sair coerentes entre si — nunca um painel recortado e o vizinho não.
 *
 * A janela de período é ancorada na DATA DE REFERÊNCIA da base (a maior data
 * conhecida), não em `new Date()`: a base de teste é de 2026 e uma janela
 * ancorada em "hoje" devolveria zero linhas.
 */

const RECENTE = '2026-08-05T12:00:00Z';
const INTERMEDIARIA = '2026-08-01T12:00:00Z';
const ANTIGA = '2026-01-10T12:00:00Z';

/** Candidato derivado da fixture (evita repetir os 15 campos do schema). */
function pessoa(id: string, created_at: string, origem = 'LinkedIn'): CandidatoRow {
  return {
    ...criarCandidatura().candidato!,
    id,
    nome: id,
    email: `${id}@email.com`,
    origem,
    created_at,
    updated_at: created_at,
  };
}

function cenario() {
  const vagaA = criarVaga({
    id: 'vaga-a',
    titulo: 'Vaga A',
    data_abertura: '2026-08-01',
    created_at: '2026-08-01T12:00:00Z',
  });
  const vagaB = criarVaga({
    id: 'vaga-b',
    titulo: 'Vaga B',
    data_abertura: '2026-07-20',
    created_at: '2026-07-20T12:00:00Z',
  });

  const recente = criarCandidatura({
    id: 'cand-recente',
    vaga_id: 'vaga-a',
    candidato_id: 'pessoa-ana',
    created_at: RECENTE,
    updated_at: RECENTE,
  });
  const intermediaria = criarCandidatura({
    id: 'cand-intermediaria',
    vaga_id: 'vaga-b',
    candidato_id: 'pessoa-bia',
    created_at: INTERMEDIARIA,
    updated_at: INTERMEDIARIA,
  });
  const antiga = criarCandidatura({
    id: 'cand-antiga',
    vaga_id: 'vaga-a',
    candidato_id: 'pessoa-antiga',
    created_at: ANTIGA,
    updated_at: ANTIGA,
  });

  return {
    candidaturas: [recente, intermediaria, antiga],
    vagas: [vagaA, vagaB],
    candidatos: [
      pessoa('pessoa-ana', RECENTE),
      pessoa('pessoa-bia', INTERMEDIARIA, 'Indeed'),
      pessoa('pessoa-antiga', ANTIGA, 'Indicação'),
    ],
  };
}

const ids = (lista: { id: string }[]) => lista.map((item) => item.id);

describe('analyticsFiltros — período', () => {
  it('o padrão não recorta nada', () => {
    const entrada = cenario();
    const recorte = filtrarEntradaAnalytics(entrada, FILTROS_PADRAO);

    expect(recorte.candidaturas).toHaveLength(3);
    expect(recorte.vagas).toHaveLength(2);
    expect(recorte.candidatos).toHaveLength(3);
    expect(FILTROS_PADRAO.periodo).toBe(PERIODO_PADRAO);
    expect(FILTROS_PADRAO.vagaId).toBe(VAGA_TODAS);
  });

  it('janela de 30 dias conta a partir da data de referência da base', () => {
    const entrada = cenario();
    const recorte = filtrarEntradaAnalytics(entrada, { periodo: '30', vagaId: VAGA_TODAS });

    // Referência da base = 2026-08-05 → janela começa em 2026-07-06.
    expect(ids(recorte.candidaturas)).toEqual(['cand-recente', 'cand-intermediaria']);
    expect(ids(recorte.vagas)).toEqual(['vaga-a', 'vaga-b']);
    expect(ids(recorte.candidatos)).toEqual(['pessoa-ana', 'pessoa-bia']);
  });

  it('registro sem data legível não é excluído pelo período', () => {
    const semData = criarCandidatura({
      id: 'cand-sem-data',
      vaga_id: 'vaga-a',
      candidato_id: 'pessoa-sem-data',
      created_at: null as unknown as string,
      updated_at: null as unknown as string,
    });
    const entrada = {
      ...cenario(),
      candidaturas: [...cenario().candidaturas, semData],
      candidatos: [...cenario().candidatos, pessoa('pessoa-sem-data', ANTIGA)],
    };

    const recorte = filtrarEntradaAnalytics(entrada, { periodo: '30', vagaId: VAGA_TODAS });
    expect(ids(recorte.candidaturas)).toContain('cand-sem-data');
  });
});

describe('analyticsFiltros — vaga', () => {
  it('recorta candidaturas, vagas e candidatos pelo mesmo critério', () => {
    const entrada = cenario();
    const recorte = filtrarEntradaAnalytics(entrada, { periodo: 'tudo', vagaId: 'vaga-a' });

    expect(ids(recorte.candidaturas)).toEqual(['cand-recente', 'cand-antiga']);
    expect(ids(recorte.vagas)).toEqual(['vaga-a']);
    // Candidatos passam a ser os que têm candidatura no recorte.
    expect(ids(recorte.candidatos)).toEqual(['pessoa-ana', 'pessoa-antiga']);
  });

  it('combina período e vaga sem perder coerência', () => {
    const entrada = cenario();
    const recorte = filtrarEntradaAnalytics(entrada, { periodo: '30', vagaId: 'vaga-a' });

    expect(ids(recorte.candidaturas)).toEqual(['cand-recente']);
    expect(ids(recorte.vagas)).toEqual(['vaga-a']);
    expect(ids(recorte.candidatos)).toEqual(['pessoa-ana']);
  });
});

describe('analyticsFiltros — utilitários', () => {
  it('traduz o período em dias e em rótulo', () => {
    expect(diasDoPeriodo('tudo')).toBeNull();
    expect(diasDoPeriodo('90')).toBe(90);
    expect(rotuloDoPeriodo('90')).toBe('Últimos 90 dias');
    expect(rotuloDoPeriodo('365')).toBe('Últimos 12 meses');
  });

  it('sinaliza recorte ativo só quando algo foi escolhido', () => {
    expect(temFiltroAtivo(FILTROS_PADRAO)).toBe(false);
    expect(temFiltroAtivo({ periodo: '90', vagaId: VAGA_TODAS })).toBe(true);
    expect(temFiltroAtivo({ periodo: PERIODO_PADRAO, vagaId: 'vaga-a' })).toBe(true);
  });
});
