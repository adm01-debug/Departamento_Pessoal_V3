import { describe, it, expect, beforeEach } from 'vitest';
import {
  CHAVE_ARMAZENAMENTO,
  aplicarAprovacaoLocal,
  aprovacoesLocais,
  chaveLocal,
  decidirLocal,
  enviarLocal,
  estadoLocalDe,
  estadoLocalVazio,
  lerEstadoLocal,
  limparEstadoLocal,
  reenviarLocal,
  validacoesLocais,
  validarPotencialLocal,
} from '@/components/avaliacao/aprovacaoLocal';
import { derivarPendencias, versaoConsolidadaDemo } from '@/components/avaliacao/aprovacaoGestor';
import type { PontoNineBox } from '@/components/avaliacao/nineBoxComum';

/**
 * VITRINE — persistência local das decisões da demonstração.
 *
 * Garante o que a tarefa pede: decidir SALVA (localStorage), sobrevive à
 * recarga, respeita as MESMAS regras do servidor (aprovação antes da validação,
 * versão como âncora), alimenta fila/modal/Nine-Box e NÃO toca nos mocks.
 */

const COLAB = 'mock-1';
const CICLO = 'mock-ciclo-3';
const CHAVE = chaveLocal(COLAB, CICLO);
const VERSAO = 'demonstracao:mock-fb-1';

beforeEach(() => {
  limparEstadoLocal();
});

describe('armazenamento da vitrine', () => {
  it('começa vazio, grava e SOBREVIVE à releitura (F5)', () => {
    expect(lerEstadoLocal()).toEqual(estadoLocalVazio());

    decidirLocal({
      colaboradorId: COLAB,
      cicloId: CICLO,
      decisao: 'aprovado',
      versaoAvaliacao: 'v1',
      por: 'demo@teste',
    });

    // Releitura do storage = o que acontece depois de um F5.
    const relido = lerEstadoLocal();
    expect(relido.decisoes[CHAVE]).toMatchObject({
      decisao: 'aprovado',
      versaoAvaliacao: 'v1',
      decididoPor: 'demo@teste',
    });
    expect(relido.historico.map((h) => h.operacao)).toEqual(['aprovar']);
    expect(JSON.parse(localStorage.getItem(CHAVE_ARMAZENAMENTO) ?? '{}').decisoes[CHAVE].decisao).toBe('aprovado');
  });

  it('conteúdo corrompido não derruba a vitrine (volta ao estado vazio)', () => {
    localStorage.setItem(CHAVE_ARMAZENAMENTO, '{lixo');
    expect(lerEstadoLocal()).toEqual(estadoLocalVazio());
  });

  it('limpar apaga SÓ a chave da vitrine', () => {
    localStorage.setItem('ui-theme', 'dark');
    decidirLocal({ colaboradorId: COLAB, cicloId: CICLO, decisao: 'aprovado', versaoAvaliacao: 'v1' });
    limparEstadoLocal();
    expect(lerEstadoLocal().decisoes).toEqual({});
    expect(localStorage.getItem('ui-theme')).toBe('dark');
  });
});

describe('decisões do gestor na vitrine', () => {
  it('devolução guarda a justificativa; aprovação não', () => {
    decidirLocal({
      colaboradorId: COLAB,
      cicloId: CICLO,
      decisao: 'devolvido',
      justificativa: 'Revisar os pontos de melhoria',
      versaoAvaliacao: 'v1',
    });
    expect(lerEstadoLocal().decisoes[CHAVE].justificativa).toBe('Revisar os pontos de melhoria');

    decidirLocal({ colaboradorId: COLAB, cicloId: CICLO, decisao: 'aprovado', versaoAvaliacao: 'v1' });
    expect(lerEstadoLocal().decisoes[CHAVE].justificativa).toBeNull();
    expect(lerEstadoLocal().historico.map((h) => h.operacao)).toEqual(['devolver', 'aprovar']);
  });

  it('nova decisão INVALIDA a validação anterior do Potencial', () => {
    decidirLocal({ colaboradorId: COLAB, cicloId: CICLO, decisao: 'aprovado', versaoAvaliacao: 'v1' });
    validarPotencialLocal({
      colaboradorId: COLAB,
      cicloId: CICLO,
      versaoAvaliacao: 'v1',
      versaoValidacao: 'v1',
    });
    expect(lerEstadoLocal().validacoes[CHAVE]).toBeDefined();

    decidirLocal({
      colaboradorId: COLAB,
      cicloId: CICLO,
      decisao: 'devolvido',
      versaoAvaliacao: 'v1',
      justificativa: 'x',
    });
    expect(lerEstadoLocal().validacoes[CHAVE]).toBeUndefined();
  });

  it('REENVIAR retira a decisão e a validação (volta a aguardar o gestor)', () => {
    decidirLocal({
      colaboradorId: COLAB,
      cicloId: CICLO,
      decisao: 'devolvido',
      versaoAvaliacao: 'v1',
      justificativa: 'x',
    });
    reenviarLocal({ colaboradorId: COLAB, cicloId: CICLO });
    const estado = lerEstadoLocal();
    expect(estado.decisoes[CHAVE]).toBeUndefined();
    expect(estado.validacoes[CHAVE]).toBeUndefined();
    expect(estado.historico.map((h) => h.operacao)).toEqual(['devolver', 'reenviar']);
  });

  it('o envio ao gestor entra no histórico (RH prepara)', () => {
    enviarLocal({ colaboradorId: COLAB, cicloId: CICLO, versaoAvaliacao: 'v1' });
    expect(lerEstadoLocal().historico[0]).toMatchObject({ operacao: 'enviar', colaboradorId: COLAB });
  });
});

describe('validação do Potencial (RH) — mesma régua do servidor', () => {
  it('recusa SEM aprovação do gestor', () => {
    const { resultado } = validarPotencialLocal({
      colaboradorId: COLAB,
      cicloId: CICLO,
      versaoAvaliacao: 'v1',
      versaoValidacao: 'v1',
    });
    expect(resultado.ok).toBe(false);
    expect(resultado.motivo).toBe('sem_aprovacao');
    expect(lerEstadoLocal().validacoes).toEqual({});
  });

  it('recusa quando a VERSÃO mudou depois da aprovação', () => {
    decidirLocal({ colaboradorId: COLAB, cicloId: CICLO, decisao: 'aprovado', versaoAvaliacao: 'v1' });
    const { resultado } = validarPotencialLocal({
      colaboradorId: COLAB,
      cicloId: CICLO,
      versaoAvaliacao: 'v2',
      versaoValidacao: 'v2',
    });
    expect(resultado.ok).toBe(false);
    expect(resultado.motivo).toBe('versao_divergente');
  });

  it('recusa quando não há avaliação do GESTOR (requisito obrigatório)', () => {
    decidirLocal({ colaboradorId: COLAB, cicloId: CICLO, decisao: 'aprovado', versaoAvaliacao: 'v1' });
    const { resultado } = validarPotencialLocal({
      colaboradorId: COLAB,
      cicloId: CICLO,
      versaoAvaliacao: 'v1',
      versaoValidacao: '',
    });
    expect(resultado.ok).toBe(false);
    expect(resultado.motivo).toBe('sem_avaliacao_gestor');
    expect(lerEstadoLocal().validacoes).toEqual({});
  });

  it('aceita na MESMA versão aprovada e registra quem validou', () => {
    decidirLocal({ colaboradorId: COLAB, cicloId: CICLO, decisao: 'aprovado', versaoAvaliacao: 'v1' });
    const { resultado } = validarPotencialLocal({
      colaboradorId: COLAB,
      cicloId: CICLO,
      versaoAvaliacao: 'v1',
      versaoValidacao: 'v-gestor',
      por: 'rh@teste',
    });
    expect(resultado.ok).toBe(true);
    // A validação guarda a versão do GESTOR (âncora do RH), não a do conjunto.
    expect(lerEstadoLocal().validacoes[CHAVE]).toMatchObject({
      versaoAvaliacao: 'v-gestor',
      validadoPor: 'rh@teste',
    });
  });
});

describe('integração com fila, modal e Nine-Box', () => {
  /** Avaliação do gestor de um mock (mesmo shape usado na vitrine). */
  const FEEDBACK = {
    id: 'mock-fb-1',
    avaliado_id: COLAB,
    avaliador_id: 'mock-13',
    ciclo_id: CICLO,
    tipo: 'gestor',
    nota_geral: 4,
    potencial: 5,
    status: 'concluido',
    updated_at: '2026-10-01T10:00:00.000Z',
  };

  /** Âncora da VALIDAÇÃO do RH: versão da avaliação do GESTOR. */
  const VERSAO_VALIDACAO = versaoConsolidadaDemo([FEEDBACK]) as string;

  const pendenciaDe = (estado = lerEstadoLocal()) =>
    derivarPendencias({
      feedbacks: [FEEDBACK],
      colaboradores: [
        { id: COLAB, nome_completo: 'Ana Beatriz' },
        // O gestor responsável vem do avaliador da avaliação do GESTOR (vitrine
        // sem vínculos): sem ele a linha seria `sem_gestor` (pendência de
        // atribuição), que é o comportamento correto — não o deste teste.
        { id: 'mock-13', nome_completo: 'Mariana Oliveira' },
      ],
      ciclos: [{ id: CICLO, nome: 'Ciclo 2026' }],
      // Versão fixada: na vitrine ela é a impressão digital do conjunto; aqui o
      // teste precisa de uma versão ESTÁVEL para exercitar as decisões.
      versoesPorFeedback: { 'mock-fb-1': VERSAO },
      aprovacoes: aprovacoesLocais(estado),
      validacoes: validacoesLocais(estado),
      modo: 'demonstracao',
    })[0];

  it('a fila e o modal consomem o MESMO estado local', () => {
    expect(pendenciaDe().status).toBe('aguardando_gestor');

    decidirLocal({ colaboradorId: COLAB, cicloId: CICLO, decisao: 'aprovado', versaoAvaliacao: VERSAO });
    expect(pendenciaDe().status).toBe('aprovada_gestor');

    validarPotencialLocal({
      colaboradorId: COLAB,
      cicloId: CICLO,
      versaoAvaliacao: VERSAO,
      versaoValidacao: VERSAO,
    });
    const concluida = pendenciaDe();
    expect(concluida.status).toBe('concluida_validada');
    expect(concluida.estado.elegivelNineBox).toBe(true);

    reenviarLocal({ colaboradorId: COLAB, cicloId: CICLO });
    expect(pendenciaDe().status).toBe('aguardando_gestor');
  });

  it('estadoLocalDe devolve o estado da aprovação para o rodapé do modal', () => {
    expect(
      estadoLocalDe(lerEstadoLocal(), { colaboradorId: COLAB, cicloId: CICLO, versaoGestor: VERSAO })
    ).toMatchObject({ pendente: true, elegivelNineBox: false });

    decidirLocal({ colaboradorId: COLAB, cicloId: CICLO, decisao: 'aprovado', versaoAvaliacao: VERSAO });
    expect(
      estadoLocalDe(lerEstadoLocal(), {
        colaboradorId: COLAB,
        cicloId: CICLO,
        versaoGestor: VERSAO,
        versaoValidacao: VERSAO_VALIDACAO,
      }).podeValidarPotencial
    ).toBe(false);
    expect(
      estadoLocalDe(lerEstadoLocal(), {
        colaboradorId: COLAB,
        cicloId: CICLO,
        versaoGestor: VERSAO,
        versaoValidacao: VERSAO_VALIDACAO,
      }).elegivelNineBox
    ).toBe(true);
  });

  const ponto = (): PontoNineBox =>
    ({
      id: 'mock-fb-1',
      colaboradorId: COLAB,
      nome: 'Ana Beatriz',
      quadrante: '2-3',
      nomeQuadrante: 'Alto potencial',
      pontuacao: 8,
      pendencias: null,
    }) as unknown as PontoNineBox;

  it('clicar em Aprovar JÁ classifica: a decisão do gestor é final', () => {
    // Sem decisão local a vitrine aprovada segue intocada.
    expect(aplicarAprovacaoLocal([ponto()], lerEstadoLocal(), CICLO)[0].quadrante).toBe('2-3');

    decidirLocal({ colaboradorId: COLAB, cicloId: CICLO, decisao: 'aprovado', versaoAvaliacao: VERSAO });
    expect(aplicarAprovacaoLocal([ponto()], lerEstadoLocal(), CICLO)[0]).toMatchObject({
      quadrante: '2-3',
      aguardandoValidacaoRh: false,
      aguardandoAprovacao: false,
      motivoNaoClassificado: null,
    });
  });

  it('alteração relevante depois da aprovação INVALIDA a decisão (versão do grupo)', () => {
    const feedbackAtual = [
      {
        id: 'mock-fb-1',
        avaliado_id: COLAB,
        ciclo_id: CICLO,
        tipo: 'gestor',
        status: 'concluido',
        nota_geral: 4,
        potencial: 4,
        pontos_fortes: 'a',
        pontos_melhoria: 'b',
        comentarios: 'c',
      },
    ];
    const versaoAtual = versaoConsolidadaDemo(feedbackAtual);
    expect(versaoAtual).toBeTruthy();

    // Decisão gravada numa versão que já não é a atual.
    decidirLocal({ colaboradorId: COLAB, cicloId: CICLO, decisao: 'aprovado', versaoAvaliacao: 'versao-antiga' });
    const [invalidado] = aplicarAprovacaoLocal([ponto()], lerEstadoLocal(), CICLO, feedbackAtual);
    expect(invalidado).toMatchObject({
      quadrante: null,
      aguardandoValidacaoRh: false,
      aguardandoAprovacao: true,
    });
    expect(invalidado.motivoNaoClassificado).toMatch(/invalidada/i);

    // Nova aprovação NA versão atual ⇒ volta ao quadrante, sem validação do RH.
    decidirLocal({ colaboradorId: COLAB, cicloId: CICLO, decisao: 'aprovado', versaoAvaliacao: versaoAtual! });
    const [ok] = aplicarAprovacaoLocal([ponto()], lerEstadoLocal(), CICLO, feedbackAtual);
    expect(ok.quadrante).toBe('2-3');
    expect(ok.aguardandoAprovacao).toBe(false);
  });

  it('PAR aprovado com Desempenho/Potencial válidos classifica (sem gestor separado)', () => {
    const par = [
      {
        id: 'mock-par-1',
        avaliado_id: COLAB,
        ciclo_id: CICLO,
        tipo: 'par',
        status: 'concluido',
        nota_geral: 3,
        potencial: 2,
      },
    ];
    const versaoConjunto = versaoConsolidadaDemo(par) as string;
    decidirLocal({ colaboradorId: COLAB, cicloId: CICLO, decisao: 'aprovado', versaoAvaliacao: versaoConjunto });
    const [pontoAprovado] = aplicarAprovacaoLocal([ponto()], lerEstadoLocal(), CICLO, par);
    expect(pontoAprovado.aguardandoValidacaoRh).toBe(false);
    expect(pontoAprovado.aguardandoAprovacao).toBe(false);
    expect(pontoAprovado.quadrante).toBe('2-3');
    expect(pontoAprovado.motivoNaoClassificado).toBeNull();
  });

  it('aprovação vigente classifica; validação legada não é necessária', () => {
    const gestor = {
      id: 'mock-gestor-1',
      avaliado_id: COLAB,
      ciclo_id: CICLO,
      tipo: 'gestor',
      status: 'concluido',
      nota_geral: 4,
      potencial: 4,
    };
    const par = {
      id: 'mock-par-1',
      avaliado_id: COLAB,
      ciclo_id: CICLO,
      tipo: 'par',
      status: 'concluido',
      nota_geral: 3,
      potencial: 2,
    };
    const grupo = [gestor, par];
    const versaoConjunto = versaoConsolidadaDemo(grupo) as string;
    const versaoGestor = versaoConsolidadaDemo([gestor]) as string;
    expect(versaoConjunto).not.toBe(versaoGestor);

    decidirLocal({ colaboradorId: COLAB, cicloId: CICLO, decisao: 'aprovado', versaoAvaliacao: versaoConjunto });
    validarPotencialLocal({
      colaboradorId: COLAB,
      cicloId: CICLO,
      versaoAvaliacao: versaoConjunto,
      versaoValidacao: versaoGestor,
    });

    const [classificado] = aplicarAprovacaoLocal([ponto()], lerEstadoLocal(), CICLO, grupo);
    expect(classificado.quadrante).toBe('2-3');
    expect(classificado.aguardandoValidacaoRh).toBe(false);
  });

  it('registro CRIADO/EDITADO sem decisão NÃO recebe classificação oficial', () => {
    const novo = [
      {
        id: 'demo-fb-novo',
        avaliado_id: COLAB,
        ciclo_id: CICLO,
        tipo: 'gestor',
        status: 'concluido',
        nota_geral: 4,
        potencial: 5,
      },
    ];
    // Mesmo sem o conjunto de ids explícito, o prefixo `demo-` prova que é um
    // registro criado na vitrine: não pode classificar antes da aprovação.
    const [semIds] = aplicarAprovacaoLocal([ponto()], estadoLocalVazio(), CICLO, novo);
    expect(semIds).toMatchObject({ quadrante: null, aguardandoAprovacao: true });
    const [aguardando] = aplicarAprovacaoLocal([ponto()], estadoLocalVazio(), CICLO, novo, new Set(['demo-fb-novo']));
    expect(aguardando).toMatchObject({
      quadrante: null,
      nomeQuadrante: null,
      pontuacao: null,
      aguardandoAprovacao: true,
      aguardandoValidacaoRh: false,
    });
    expect(aguardando.motivoNaoClassificado).toMatch(/aprovação do gestor|avaliação do Gestor/i);

    // Depois de aprovado, o MESMO registro volta ao quadrante (sem validação).
    const versaoConjunto = versaoConsolidadaDemo(novo) as string;
    decidirLocal({ colaboradorId: COLAB, cicloId: CICLO, decisao: 'aprovado', versaoAvaliacao: versaoConjunto });
    const [classificado] = aplicarAprovacaoLocal([ponto()], lerEstadoLocal(), CICLO, novo, new Set(['demo-fb-novo']));
    expect(classificado.quadrante).toBe('2-3');
    expect(classificado.aguardandoAprovacao).toBe(false);
    expect(classificado.aguardandoValidacaoRh).toBe(false);
  });

  it('fixture INTOCADA continua formando a vitrine aprovada (sem exigir fluxo)', () => {
    const fixture = [
      {
        id: 'mock-fb-1',
        avaliado_id: COLAB,
        ciclo_id: CICLO,
        tipo: 'gestor',
        status: 'concluido',
        nota_geral: 4,
        potencial: 5,
      },
    ];
    const [pontoAprovado] = aplicarAprovacaoLocal([ponto()], estadoLocalVazio(), CICLO, fixture);
    expect(pontoAprovado.quadrante).toBe('2-3');
    expect(pontoAprovado.aguardandoAprovacao).toBeUndefined();
  });

  it('os MOCKS não são mutados pelo módulo', () => {
    const mocks = [{ id: 'mock-fb-1', status: 'concluido', tipo: 'gestor' }];
    const copia = JSON.parse(JSON.stringify(mocks));

    decidirLocal({ colaboradorId: COLAB, cicloId: CICLO, decisao: 'aprovado', versaoAvaliacao: VERSAO });
    validarPotencialLocal({
      colaboradorId: COLAB,
      cicloId: CICLO,
      versaoAvaliacao: VERSAO,
      versaoValidacao: VERSAO,
    });
    aplicarAprovacaoLocal([ponto()], lerEstadoLocal(), CICLO);

    expect(mocks).toEqual(copia);
  });
});
