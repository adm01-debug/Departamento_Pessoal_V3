import { describe, it, expect } from 'vitest';
import {
  chaveLocal,
  estadoLocalVazio,
  encaminharLocal,
  enviarLocal,
  decidirLocal,
  reenviarLocal,
  validarPotencialLocal,
  aprovacoesLocais,
  validacoesLocais,
  estadoLocalDe,
  aplicarAprovacaoLocal,
  lerEstadoLocal,
  gravarEstadoLocal,
} from '@/components/avaliacao/aprovacaoLocal';
import type { PontoNineBox } from '@/components/avaliacao/nineBoxComum';

/**
 * Vitrine local da avaliacao (area Avaliacao/NineBox): as decisoes sobre
 * registros ficticios (mock-*) sao gravadas em armazenamento separado e
 * refletem as MESMAS regras do servidor. Estes testes cobrem a maquina de
 * estados local (encaminhar -> aprovar/devolver -> reenviar -> validar) e o
 * impacto no quadrante do Nine-Box.
 */

function ponto(over: Partial<PontoNineBox> = {}): PontoNineBox {
  return {
    id: 'demo-1',
    colaboradorId: 'col-1',
    nome: 'Ana',
    cargo: 'Analista',
    departamento: 'Comercial',
    foto: null,
    nota: 4,
    potencial: 4,
    desempenho: 3,
    potencialFaixa: 3,
    quadrante: '3-3',
    nomeQuadrante: 'Estrela',
    criadoEm: 1,
    pontuacao: 8,
    temPdi: false,
    pendencias: null,
    quantidadeAvaliacoes: 1,
    quantidadeAvaliacoesValidas: 1,
    sinalizados: 0,
    registrosSinalizados: [],
    selecionadoId: 'demo-1',
    notasForaDaEscala: 0,
    feedbackIdsUtilizados: ['demo-1'],
    statusConsolidacao: 'consolidado',
    tiposAvaliadores: ['auto'],
    ...over,
  };
}

describe('chaveLocal / estado vazio', () => {
  it('normaliza ids nulos e monta a chave colaborador x ciclo', () => {
    expect(chaveLocal('col-1', 'ciclo-1')).toBe('col-1::ciclo-1');
    expect(chaveLocal('  col-1  ', 'ciclo-1')).toBe('col-1::ciclo-1');
    expect(chaveLocal(null, undefined)).toBe('::');
  });

  it('estadoLocalVazio nao traz decisao nem historico', () => {
    const e = estadoLocalVazio();
    expect(e.versao).toBe(1);
    expect(Object.keys(e.decisoes)).toHaveLength(0);
    expect(e.historico).toEqual([]);
  });
});

describe('ler/gravar/limpar', () => {
  it('gravar e ler round-trip (com storage global)', () => {
    const e = estadoLocalVazio();
    const comDecisao = decidirLocal({
      colaboradorId: 'col-1',
      cicloId: 'ciclo-1',
      decisao: 'aprovado',
      versaoAvaliacao: 'v1',
      estado: e,
    });
    gravarEstadoLocal(comDecisao);
    const lido = lerEstadoLocal();
    expect(lido.historico.length).toBeGreaterThan(0);
    try {
      globalThis.localStorage?.removeItem('dp-desempenho-aprovacoes-demo');
    } catch {
      /* noop */
    }
  });
});

describe('encaminharLocal (idempotente)', () => {
  it('primeiro envio grava a data; repeticao nao reescreve a data original', () => {
    const e = estadoLocalVazio();
    const a = encaminharLocal({ colaboradorId: 'col-1', cicloId: 'ciclo-1', versaoAvaliacao: 'v1', estado: e });
    const chave = chaveLocal('col-1', 'ciclo-1');
    expect(a.encaminhamentos[chave]).toBeDefined();
    const primeiraData = a.encaminhamentos[chave].encaminhadoEm;

    const b = encaminharLocal({ colaboradorId: 'col-1', cicloId: 'ciclo-1', versaoAvaliacao: 'v2', estado: a });
    expect(b.encaminhamentos[chave].encaminhadoEm).toBe(primeiraData);
    expect(b.encaminhamentos[chave].versaoAvaliacao).toBe('v2');
    expect(b.historico.filter((h) => h.operacao === 'enviar')).toHaveLength(2);
  });

  it('sem colaborador/ciclo devolve o estado intacto', () => {
    const e = estadoLocalVazio();
    const r = encaminharLocal({ colaboradorId: '', cicloId: '', estado: e });
    expect(r).toBe(e);
  });

  it('marca automatico=false quando informado', () => {
    const e = estadoLocalVazio();
    const r = encaminharLocal({ colaboradorId: 'col-1', cicloId: 'ciclo-1', automatico: false, estado: e });
    expect(r.encaminhamentos[chaveLocal('col-1', 'ciclo-1')].automatico).toBe(false);
  });
});

describe('enviarLocal', () => {
  it('registra operacao enviar na trilha', () => {
    const r = enviarLocal({
      colaboradorId: 'col-1',
      cicloId: 'ciclo-1',
      versaoAvaliacao: 'v1',
      por: 'rh',
      estado: estadoLocalVazio(),
    });
    expect(r.historico.at(-1)).toMatchObject({ operacao: 'enviar', colaboradorId: 'col-1', por: 'rh' });
  });
});

describe('decidirLocal', () => {
  it('devolucao guarda a justificativa e grava historico devolver', () => {
    const e = estadoLocalVazio();
    const r = decidirLocal({
      colaboradorId: 'col-1',
      cicloId: 'ciclo-1',
      decisao: 'devolvido',
      justificativa: 'faltam notas',
      versaoAvaliacao: 'v1',
      estado: e,
    });
    const d = r.decisoes[chaveLocal('col-1', 'ciclo-1')];
    expect(d.decisao).toBe('devolvido');
    expect(d.justificativa).toBe('faltam notas');
    expect(r.historico.some((h) => h.operacao === 'devolver' && h.justificativa === 'faltam notas')).toBe(true);
  });

  it('aprovacao nao guarda justificativa e invalida validacao anterior', () => {
    const e = estadoLocalVazio();
    const comValidacao = {
      ...e,
      validacoes: {
        [chaveLocal('col-1', 'ciclo-1')]: {
          colaboradorId: 'col-1',
          cicloId: 'ciclo-1',
          versaoAvaliacao: 'v1',
          validadoEm: 'x',
          validadoPor: null,
          observacao: null,
        },
      },
    };
    const r = decidirLocal({
      colaboradorId: 'col-1',
      cicloId: 'ciclo-1',
      decisao: 'aprovado',
      versaoAvaliacao: 'v1',
      estado: comValidacao,
    });
    expect(r.decisoes[chaveLocal('col-1', 'ciclo-1')].justificativa).toBeNull();
    expect(r.validacoes[chaveLocal('col-1', 'ciclo-1')]).toBeUndefined();
  });
});

describe('validarPotencialLocal', () => {
  const base = () => {
    const e = decidirLocal({
      colaboradorId: 'col-1',
      cicloId: 'ciclo-1',
      decisao: 'aprovado',
      versaoAvaliacao: 'v1',
      estado: estadoLocalVazio(),
    });
    return e;
  };

  it('recusa sem aprovacao do gestor', () => {
    const r = validarPotencialLocal({
      colaboradorId: 'col-1',
      cicloId: 'ciclo-1',
      versaoAvaliacao: 'v1',
      versaoValidacao: 'a',
      estado: estadoLocalVazio(),
    });
    expect(r.resultado).toMatchObject({ ok: false, motivo: 'sem_aprovacao' });
  });

  it('recusa sem avaliacao do gestor concluida', () => {
    const r = validarPotencialLocal({
      colaboradorId: 'col-1',
      cicloId: 'ciclo-1',
      versaoAvaliacao: 'v1',
      versaoValidacao: '',
      estado: base(),
    });
    expect(r.resultado).toMatchObject({ ok: false, motivo: 'sem_avaliacao_gestor' });
  });

  it('recusa quando a versao da avaliacao divergiu da aprovada', () => {
    const r = validarPotencialLocal({
      colaboradorId: 'col-1',
      cicloId: 'ciclo-1',
      versaoAvaliacao: 'v2',
      versaoValidacao: 'a',
      estado: base(),
    });
    expect(r.resultado).toMatchObject({ ok: false, motivo: 'versao_divergente' });
  });

  it('valida e registra a operacao quando tudo confere', () => {
    const r = validarPotencialLocal({
      colaboradorId: 'col-1',
      cicloId: 'ciclo-1',
      versaoAvaliacao: 'v1',
      versaoValidacao: 'g1',
      por: 'rh',
      observacao: 'ok',
      estado: base(),
    });
    expect(r.resultado).toMatchObject({ ok: true, motivo: 'ok' });
    expect(r.estado.validacoes[chaveLocal('col-1', 'ciclo-1')]).toMatchObject({
      versaoAvaliacao: 'g1',
      validadoPor: 'rh',
      observacao: 'ok',
    });
    expect(r.estado.historico.at(-1)).toMatchObject({ operacao: 'validar_potencial' });
  });
});

describe('reenviarLocal', () => {
  it('remove decisao/validacao e atualiza a data de encaminhamento', () => {
    const chave = chaveLocal('col-1', 'ciclo-1');
    const comFluxo = enviarLocal({ colaboradorId: 'col-1', cicloId: 'ciclo-1', estado: estadoLocalVazio() });
    const enc = encaminharLocal({
      colaboradorId: 'col-1',
      cicloId: 'ciclo-1',
      versaoAvaliacao: 'v1',
      estado: comFluxo,
    });
    const decidido = decidirLocal({
      colaboradorId: 'col-1',
      cicloId: 'ciclo-1',
      decisao: 'aprovado',
      versaoAvaliacao: 'v1',
      estado: enc,
    });
    const semEncaminhamento = reenviarLocal({ colaboradorId: 'col-2', cicloId: 'ciclo-1', estado: estadoLocalVazio() });
    expect(semEncaminhamento.historico.at(-1)).toMatchObject({ operacao: 'reenviar' });

    const reenviado = reenviarLocal({ colaboradorId: 'col-1', cicloId: 'ciclo-1', por: 'rh', estado: decidido });
    expect(reenviado.decisoes[chave]).toBeUndefined();
    expect(reenviado.validacoes[chave]).toBeUndefined();
    expect(reenviado.historico.at(-1)).toMatchObject({ operacao: 'reenviar', versaoAvaliacao: 'v1' });
  });
});

describe('adaptadores para o banco', () => {
  it('aprovacoesLocais e validacoesLocais expoem formato snake_case da linha', () => {
    const a = decidirLocal({
      colaboradorId: 'col-1',
      cicloId: 'ciclo-1',
      decisao: 'aprovado',
      justificativa: null,
      versaoAvaliacao: 'v1',
      estado: estadoLocalVazio(),
    });
    const linhas = aprovacoesLocais(a);
    expect(linhas[0]).toMatchObject({
      colaborador_id: 'col-1',
      ciclo_id: 'ciclo-1',
      decisao: 'aprovado',
      versao_avaliacao: 'v1',
    });
    expect(validacoesLocais(a)).toEqual([]);
  });
});

describe('estadoLocalDe', () => {
  it('sem decisao retorna estado em pre-paracao (nenhuma validacao)', () => {
    const r = estadoLocalDe(estadoLocalVazio(), { colaboradorId: 'col-1', cicloId: 'ciclo-1', versaoGestor: 'g1' });
    expect(r.status).toBe('aguardando_gestor');
    expect(r.pendente).toBe(true);
  });

  it('decisao aprovada vira pendencia aguardando gestor com voto do gestor', () => {
    const comDecisao = decidirLocal({
      colaboradorId: 'col-1',
      cicloId: 'ciclo-1',
      decisao: 'aprovado',
      versaoAvaliacao: 'g1',
      por: 'gestor',
      estado: estadoLocalVazio(),
    });
    const guardada = comDecisao.decisoes[chaveLocal('col-1', 'ciclo-1')];
    const r = estadoLocalDe(comDecisao, {
      colaboradorId: 'col-1',
      cicloId: 'ciclo-1',
      versaoGestor: 'g1',
      responsavel: true,
      gestorIdentificado: true,
      versaoValidacao: 'g1',
    });
    expect(r.gestorIdentificado).toBe(true);
    expect(r.decididoEm).toBe(guardada.decididoEm);
  });

  it('marca aprovacaoInvalidada quando a versao da decisao difere da atual', () => {
    const comDecisao = decidirLocal({
      colaboradorId: 'col-1',
      cicloId: 'ciclo-1',
      decisao: 'aprovado',
      versaoAvaliacao: 'v1',
      estado: estadoLocalVazio(),
    });
    const r = estadoLocalDe(comDecisao, { colaboradorId: 'col-1', cicloId: 'ciclo-1', versaoGestor: 'v2' });
    expect(r.aprovacaoInvalidada).toBe(true);
  });
});

describe('aplicarAprovacaoLocal', () => {
  const CICLO = 'ciclo-1';

  it('sem ciclo devolve os pontos intactos', () => {
    const pts = [ponto()];
    const r = aplicarAprovacaoLocal(pts, estadoLocalVazio(), null, []);
    expect(r).toBe(pts);
  });

  it('ponto sem decisao e sem fluxo permanece intocado', () => {
    const pts = [ponto({ id: 'real-1' })];
    const r = aplicarAprovacaoLocal(pts, estadoLocalVazio(), CICLO, []);
    expect(r[0]).toBe(pts[0]);
  });

  it('ponto sem decisao porem sob fluxo (demo) vai para aguardandoAprovacao', () => {
    const pts = [ponto({ id: 'demo-1' })];
    const r = aplicarAprovacaoLocal(pts, estadoLocalVazio(), CICLO, [], new Set(['demo-1']));
    expect(r[0].aguardandoAprovacao).toBe(true);
    expect(r[0].aguardandoValidacaoRh).toBe(false);
    expect(r[0].motivoNaoClassificado).toContain('aprova');
  });

  it('decisao devolvida sai da matriz com motivo de correcao', () => {
    const e = decidirLocal({
      colaboradorId: 'col-1',
      cicloId: CICLO,
      decisao: 'devolvido',
      justificativa: 'revisar',
      versaoAvaliacao: 'v1',
      estado: estadoLocalVazio(),
    });
    const r = aplicarAprovacaoLocal([ponto()], e, CICLO, []);
    expect(r[0].quadrante).toBeNull();
    expect(r[0].aguardandoAprovacao).toBe(true);
    expect(r[0].motivoNaoClassificado).toContain('devolvida');
  });

  it('aprovacao com nota valida classifica o quadrante', () => {
    const e = decidirLocal({
      colaboradorId: 'col-1',
      cicloId: CICLO,
      decisao: 'aprovado',
      versaoAvaliacao: 'v1',
      estado: estadoLocalVazio(),
    });
    const r = aplicarAprovacaoLocal([ponto()], e, CICLO, []);
    expect(r[0].quadrante).toBe('3-3');
    expect(r[0].aguardandoAprovacao).toBe(false);
    expect(r[0].pontuacao).toBe(8);
  });

  it('aprovacao com nota invalida sai da matriz com motivo explicito', () => {
    const e = decidirLocal({
      colaboradorId: 'col-1',
      cicloId: CICLO,
      decisao: 'aprovado',
      versaoAvaliacao: 'v1',
      estado: estadoLocalVazio(),
    });
    const pts = [ponto({ nota: 9, potencial: 4 })];
    const r = aplicarAprovacaoLocal(pts, e, CICLO, []);
    expect(r[0].quadrante).toBeNull();
    expect(r[0].motivoNaoClassificado).toContain('válidos');
  });

  it('versao da avaliacao divergente invalida a aprovacao anterior', () => {
    const e = decidirLocal({
      colaboradorId: 'col-1',
      cicloId: CICLO,
      decisao: 'aprovado',
      versaoAvaliacao: 'v0',
      estado: estadoLocalVazio(),
    });
    // feedbacks presentes mudam a versao consolidada para algo != v0
    const feedbacks = [
      { id: 'demo-1', avaliado_id: 'col-1', ciclo_id: CICLO, status: 'concluido', nota: 4, potencial: 4, tipo: 'auto' },
    ];
    const r = aplicarAprovacaoLocal([ponto()], e, CICLO, feedbacks);
    expect(r[0].aguardandoAprovacao).toBe(true);
    expect(r[0].motivoNaoClassificado).toContain('invalidada');
  });
});
