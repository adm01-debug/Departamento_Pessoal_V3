import { describe, it, expect } from 'vitest';
import { subDays, subHours } from 'date-fns';
import {
  FILTROS_VAZIOS,
  agruparPorDia,
  aplicarFiltros,
  contarPorModulo,
  derivarEvento,
  filtrosAtivos,
  linhasParaExport,
  normalizarEvento,
  opcoesDeAcao,
  opcoesDeResponsavel,
  textoDoEvento,
  type FiltrosAuditoria,
} from '@/components/avaliacao/auditoriaComum';

/**
 * ============================================================================
 * AUDITORIA — prova das derivações da aba.
 *
 * Dados 100% sintéticos, no mesmo formato de `audit_log`. O que se prova:
 * título legível por tabela+ação, agrupamento por dia real, filtros funcionais,
 * contadores por módulo e exportação — sempre a partir dos CAMPOS REAIS.
 * ============================================================================
 */

const AGORA = new Date();
const RH = 'rh.promobrindes@empresa.com.br';
const GESTOR = 'gestor.regional@empresa.com.br';

const log = (extra: Record<string, unknown> = {}) => ({
  id: 'a1',
  tabela: 'feedbacks_360',
  registro_id: 'reg-1',
  acao: 'INSERT',
  user_email: GESTOR,
  dados_anteriores: null,
  dados_novos: null,
  campos_alterados: [],
  created_at: subHours(AGORA, 2).toISOString(),
  ...extra,
});

const filtros = (parcial: Partial<FiltrosAuditoria> = {}): FiltrosAuditoria => ({ ...FILTROS_VAZIOS, ...parcial });

describe('auditoria · normalização tolerante', () => {
  it('aceita registro sem os campos opcionais', () => {
    const e = normalizarEvento({ id: 'x', tabela: 'pdis', acao: 'UPDATE', created_at: AGORA.toISOString() });
    expect(e).toMatchObject({ id: 'x', registroId: null, usuarioEmail: null, camposAlterados: [] });
    expect(e.dadosNovos).toBeNull();
  });

  it('ignora data inválida sem quebrar', () => {
    const e = normalizarEvento({ id: 'x', created_at: 'nao-e-data' });
    expect(e.criadoEm.getTime()).toBe(0);
  });
});

describe('auditoria · títulos legíveis por módulo e ação', () => {
  it('feedback registrado traz avaliado, tipo e nota real', () => {
    const d = derivarEvento(
      normalizarEvento(log({ dados_novos: { avaliado: 'Carlos Eduardo Lima', nota_geral: 5, tipo: 'gestor' } }))
    );
    expect(d.titulo).toBe('Feedback registrado');
    expect(d.subtitulo).toBe('Carlos Eduardo Lima recebeu um feedback 360º do tipo gestor');
    expect(d.complemento).toBe('Nota geral 5');
    expect(d.nota).toBe(5);
    expect(d.modulo.rotulo).toBe('Feedbacks');
  });

  it('meta atualizada mostra a transição de progresso', () => {
    const d = derivarEvento(
      normalizarEvento(
        log({
          tabela: 'metas_okrs',
          acao: 'UPDATE',
          dados_anteriores: { valor_atual: 120 },
          dados_novos: { titulo: 'Aumentar vendas', valor_atual: 138 },
        })
      )
    );
    expect(d.titulo).toBe('Meta atualizada');
    expect(d.subtitulo).toBe('Aumentar vendas');
    expect(d.complemento).toBe('Progresso: 120 → 138');
    expect(d.modulo.rotulo).toBe('Metas & OKRs');
  });

  it('PDI, ciclo e competência têm títulos próprios', () => {
    const pdi = derivarEvento(
      normalizarEvento(
        log({
          tabela: 'pdis',
          acao: 'UPDATE',
          dados_anteriores: { status: 'em_andamento' },
          dados_novos: { colaborador: 'Lucas Gabriel Fernandes', status: 'concluido' },
        })
      )
    );
    expect(pdi.titulo).toBe('PDI atualizado');
    expect(pdi.subtitulo).toBe('Colaborador: Lucas Gabriel Fernandes');
    expect(pdi.complemento).toContain('Status: em_andamento → concluido');

    const ciclo = derivarEvento(
      normalizarEvento(
        log({
          tabela: 'ciclos_avaliacao',
          acao: 'UPDATE',
          dados_anteriores: { status: 'rascunho' },
          dados_novos: { nome: 'Ciclo S2 2026', status: 'ativo' },
        })
      )
    );
    expect(ciclo.titulo).toBe('Ciclo de avaliação atualizado');
    expect(ciclo.complemento).toBe('Status: rascunho → ativo');

    const comp = derivarEvento(
      normalizarEvento(
        log({ tabela: 'competencias_matriz', dados_novos: { nome: 'Análise de Dados', categoria: 'tecnica' } })
      )
    );
    expect(comp.titulo).toBe('Competência adicionada à matriz');
    expect(comp.modulo.rotulo).toBe('Nine-Box');
  });

  it('tabela fora da lista cai em "Outros" com título derivado (sem genérico vazio)', () => {
    const d = derivarEvento(
      normalizarEvento(log({ tabela: 'tabela_x', acao: 'UPDATE', dados_novos: { nome: 'algo' } }))
    );
    expect(d.titulo).toBe('Atualizar em tabela_x');
    expect(d.modulo.rotulo).toBe('Outros');
  });

  it('evento sem autor é identificado como Sistema', () => {
    const d = derivarEvento(normalizarEvento(log({ user_email: null })));
    expect(d.ehSistema).toBe(true);
    expect(d.responsavel).toBe('Sistema');
  });
});

describe('auditoria · agrupamento por dia', () => {
  const eventos = [
    normalizarEvento(log({ id: 'h1', created_at: subHours(AGORA, 1).toISOString() })),
    normalizarEvento(log({ id: 'h2', created_at: subHours(AGORA, 3).toISOString() })),
    normalizarEvento(log({ id: 'o1', created_at: subDays(AGORA, 1).toISOString() })),
    normalizarEvento(log({ id: 'a1', created_at: subDays(AGORA, 5).toISOString() })),
  ];

  it('cria "Hoje", "Ontem" e a data completa, do mais recente para o mais antigo', () => {
    const grupos = agruparPorDia(eventos, AGORA);
    expect(grupos).toHaveLength(3);
    expect(grupos[0].rotulo).toBe('Hoje');
    expect(grupos[0].total).toBe(2);
    expect(grupos[1].rotulo).toBe('Ontem');
    expect(grupos[1].total).toBe(1);
    expect(grupos[2].rotulo).toMatch(/\d{2} de \w+ de \d{4}/);
    expect(grupos[2].detalhe).toContain('de');
  });

  it('usa a data REAL do registro (não o texto exibido)', () => {
    const grupos = agruparPorDia(
      [normalizarEvento(log({ id: 'z', created_at: subDays(AGORA, 2).toISOString() }))],
      AGORA
    );
    expect(grupos[0].chave).toBe(new Date(subDays(AGORA, 2)).toISOString().slice(0, 10));
  });
});

describe('auditoria · filtros funcionais', () => {
  const base = [
    normalizarEvento(
      log({
        id: 'f1',
        tabela: 'feedbacks_360',
        acao: 'INSERT',
        user_email: GESTOR,
        dados_novos: { avaliado: 'Carlos Eduardo Lima' },
      })
    ),
    normalizarEvento(
      log({
        id: 'm1',
        tabela: 'metas_okrs',
        acao: 'UPDATE',
        user_email: RH,
        registro_id: 'meta-9',
        dados_novos: { titulo: 'Reduzir absenteísmo' },
        campos_alterados: ['valor_atual'],
      })
    ),
    normalizarEvento(
      log({ id: 'p1', tabela: 'pdis', acao: 'UPDATE', user_email: null, created_at: subDays(AGORA, 1).toISOString() })
    ),
  ];

  it('busca encontra evento, colaborador e registro', () => {
    expect(aplicarFiltros(base, filtros({ busca: 'absenteísmo' })).map((e) => e.id)).toEqual(['m1']);
    expect(aplicarFiltros(base, filtros({ busca: 'carlos eduardo' })).map((e) => e.id)).toEqual(['f1']);
    expect(aplicarFiltros(base, filtros({ busca: 'meta-9' })).map((e) => e.id)).toEqual(['m1']);
    expect(aplicarFiltros(base, filtros({ busca: 'feedbacks' })).map((e) => e.id)).toEqual(['f1']);
  });

  it('filtra por módulo, ação, responsável, origem e período', () => {
    expect(aplicarFiltros(base, filtros({ modulo: 'pdis' })).map((e) => e.id)).toEqual(['p1']);
    expect(aplicarFiltros(base, filtros({ acao: 'UPDATE' })).map((e) => e.id)).toEqual(['m1', 'p1']);
    expect(aplicarFiltros(base, filtros({ responsavel: RH })).map((e) => e.id)).toEqual(['m1']);
    expect(aplicarFiltros(base, filtros({ responsavel: 'sistema' })).map((e) => e.id)).toEqual(['p1']);
    expect(aplicarFiltros(base, filtros({ origem: 'sistema' })).map((e) => e.id)).toEqual(['p1']);
    expect(aplicarFiltros(base, filtros({ periodo: 'hoje' })).map((e) => e.id)).toEqual(['f1', 'm1']);
    expect(aplicarFiltros(base, filtros({ periodo: 'ontem' }), { agora: AGORA }).map((e) => e.id)).toEqual(['p1']);
  });

  it('filtros adicionais usam colunas reais (registro e campo alterado)', () => {
    expect(aplicarFiltros(base, filtros({ registro: 'meta' })).map((e) => e.id)).toEqual(['m1']);
    expect(aplicarFiltros(base, filtros({ campo: 'valor_atual' })).map((e) => e.id)).toEqual(['m1']);
  });

  it('contadores por módulo ignoram o próprio filtro de módulo', () => {
    const c = contarPorModulo(base, filtros({ modulo: 'pdis' }), AGORA);
    expect(c.todos).toBe(3);
    expect(c.porTabela).toEqual({ feedbacks_360: 1, metas_okrs: 1, pdis: 1 });
  });

  it('contadores respeitam os demais filtros', () => {
    const c = contarPorModulo(base, filtros({ busca: 'absenteísmo' }), AGORA);
    expect(c.todos).toBe(1);
    expect(c.porTabela.metas_okrs).toBe(1);
  });

  it('opções saem dos registros reais', () => {
    expect(opcoesDeAcao(base)).toEqual(['INSERT', 'UPDATE']);
    expect(opcoesDeResponsavel(base).map((o) => o.valor)).toEqual([GESTOR, RH, 'sistema']);
  });

  it('conta filtros ativos para o botão Limpar', () => {
    expect(filtrosAtivos(FILTROS_VAZIOS)).toBe(0);
    expect(filtrosAtivos(filtros({ modulo: 'pdis', periodo: 'hoje', origem: 'sistema' }))).toBe(3);
  });

  it('texto consultável inclui o payload (busca por dado do registro)', () => {
    expect(textoDoEvento(base[1])).toContain('reduzir absenteísmo');
  });
});

describe('auditoria · exportação', () => {
  it('projeta as colunas legíveis do CSV a partir dos dados reais', () => {
    const linhas = linhasParaExport([
      normalizarEvento(
        log({
          tabela: 'metas_okrs',
          acao: 'UPDATE',
          user_email: RH,
          registro_id: 'meta-9',
          dados_novos: { titulo: 'Reduzir absenteísmo', valor_atual: 138 },
        })
      ),
    ]);
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({
      Módulo: 'Metas & OKRs',
      Ação: 'Atualizar',
      Evento: 'Meta atualizada',
      Detalhe: 'Reduzir absenteísmo',
      Informação: 'Progresso: 138',
      Responsável: RH,
      Registro: 'meta-9',
    });
    expect(linhas[0].Data).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(linhas[0].Hora).toMatch(/^\d{2}:\d{2}$/);
  });
});
