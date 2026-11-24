import { describe, expect, it } from 'vitest';
import { construirTabelasGestao } from '../dados';
import { isGestaoMockEnabled, rotaNoEscopoDoGestaoMock, ROTAS_GESTAO_MOCK } from '../gate';

const tabelas = construirTabelasGestao();
const linha = (tabela: string, indice = 0) => (tabelas[tabela] ?? [])[indice] as Record<string, unknown>;

describe('dataset do mock de demonstração (áreas operacionais)', () => {
  it('nunca liga em ambiente de teste', () => {
    expect(isGestaoMockEnabled()).toBe(false);
  });

  it('não deixa tabela coberta vazia', () => {
    const vazias = Object.entries(tabelas)
      .filter(([, linhas]) => !linhas?.length)
      .map(([tabela]) => tabela);
    expect(vazias).toEqual([]);
  });

  it('reaproveita os mesmos 13 colaboradores fictícios dos outros mocks', () => {
    const colaboradores = tabelas.colaboradores ?? [];
    expect(colaboradores).toHaveLength(13);
    expect(colaboradores.every((c) => String(c.id).startsWith('mock-'))).toBe(true);
  });

  it('fecha quatro competências de folha com itens e holerites', () => {
    const folhas = tabelas.folhas_pagamento ?? [];
    const ativos = (tabelas.colaboradores ?? []).filter((c) => c.status !== 'desligado');

    expect(folhas).toHaveLength(4);
    expect(tabelas.folha_itens).toHaveLength(4 * ativos.length);
    expect(tabelas.holerites).toHaveLength(4 * ativos.length);
    expect(folhas.some((f) => f.status === 'fechada')).toBe(true);
  });

  it('provisiona férias e 13º na competência da última folha', () => {
    const ultima = [...(tabelas.folhas_pagamento ?? [])].sort((a, b) =>
      String(b.competencia).localeCompare(String(a.competencia))
    )[0];
    const provisoes = (tabelas.provisoes_mensais ?? []).filter((p) => p.competencia === `${ultima.competencia}-01`);

    expect(provisoes.length).toBeGreaterThan(0);
    expect(new Set(provisoes.map((p) => p.tipo))).toEqual(new Set(['ferias', '13']));
  });

  it('faz os itens de folha apontarem para colaboradores existentes', () => {
    const ids = new Set((tabelas.colaboradores ?? []).map((c) => c.id));
    const orfaos = (tabelas.folha_itens ?? []).filter((item) => !ids.has(item.colaborador_id));
    expect(orfaos).toEqual([]);
  });

  it('preenche estrutura, documentos, eSocial e SST', () => {
    for (const tabela of [
      'cargos',
      'departamentos',
      'centros_custo',
      'documentos',
      'esocial_eventos',
      'asos',
      'exames',
      'epis',
    ]) {
      expect((tabelas[tabela] ?? []).length, tabela).toBeGreaterThan(0);
    }
  });

  it('mantém tabelas de tenant/permissão fora do mock', () => {
    for (const tabela of ['empresas', 'user_empresas', 'user_roles', 'profiles']) {
      expect(tabelas[tabela], tabela).toBeUndefined();
    }
  });
});

describe('escopo de rotas do mock de demonstração', () => {
  it('cobre as rotas operacionais listadas', () => {
    for (const rota of ROTAS_GESTAO_MOCK) {
      expect(rotaNoEscopoDoGestaoMock(`${rota}/exemplo`), rota).toBe(true);
    }
  });

  it('não cobre as áreas que já têm mock próprio nem telas administrativas', () => {
    for (const rota of [
      '/avaliacao',
      '/colaboradores',
      '/admissoes',
      '/ferias',
      '/empresas',
      '/configuracoes',
      '/usuarios',
    ]) {
      expect(rotaNoEscopoDoGestaoMock(rota), rota).toBe(false);
    }
  });
});
