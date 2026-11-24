/**
 * Contrato da ENTRADA e da SAÍDA da Trilha de Auditoria de Desligamentos.
 *
 * O que está protegido aqui (e por quê):
 *  - a ENTRADA é KEYFRAME CSS dirigido pelo compositor, não Framer: o contrato
 *    inteiro é `TRILHA_CLASSE_ENTRADA` + `estiloEntrada()`, e NÃO existe variant
 *    de entrada. Se alguém voltar a animar a entrada por JS, o objeto
 *    `trilhaSaidaVariants` deixa de ser suficiente e o teste acusa. O motivo:
 *    a Motion anima na main thread, e a trilha monta ~20 linhas densas de uma
 *    vez — o rAF fica sem quadro e a entrada "anda aos pulos";
 *  - o estilo inline publica SÓ custom properties: nenhuma propriedade de
 *    LAYOUT (a 1ª versão animava `height: 0 → 'auto'` e refluía a página);
 *  - deslocamento e a curva de SAÍDA vêm do ORGANOGRAMA — uma coreografia só no
 *    produto —, mas a CURVA DE ENTRADA é própria (`TRILHA_ENTRADA_EASE`), de
 *    arranque lento: a curva de abertura `(0.22, 1, 0.36, 1)` entrega ~75% do
 *    percurso em 100ms e, numa linha densa de ~120px, se lia como piscada;
 *  - o ritmo é de leitura (620ms por bloco, 90ms de passo, teto 6) e o passo
 *    continua MENOR que a duração: as entradas se sobrepõem (onda, não fila);
 *  - a SAÍDA continua recolhendo altura (`collapsed`), que é o que impede o
 *    vizinho de pular quando o filtro remove um evento.
 */
import { describe, it, expect } from 'vitest';
import {
  TRILHA_CLASSE_ENTRADA,
  TRILHA_EASE,
  TRILHA_ENTRADA_DURACAO_MS,
  TRILHA_ENTRADA_EASE,
  TRILHA_ENTRADA_OFFSET_PX,
  TRILHA_ENTRADA_PASSO_MS,
  TRILHA_PASSOS_MAX,
  TRILHA_SAIDA_DURACAO,
  TRILHA_SAIDA_DURACAO_MS,
  TRILHA_SAIDA_EASE,
  atrasoDoGrupoMs,
  coordenarTrilhaPorGrupo,
  estiloEntrada,
  trilhaSaidaVariants,
} from '../desligamentos/trilhaReveal';
import { REVEAL_CLOSE_EASE, REVEAL_OFFSET_Y, REVEAL_OPEN_EASE } from '../organograma/organogramaReveal';

describe('trilhaReveal — entrada por keyframe CSS (compositor)', () => {
  it('expõe a classe que liga o keyframe em `index.css`', () => {
    expect(TRILHA_CLASSE_ENTRADA).toBe('trilha-evento-entrada');
  });

  it('o estilo inline leva atraso, deslocamento, duração e curva — e NADA de layout', () => {
    const estilo = estiloEntrada(140) as Record<string, unknown>;
    expect(estilo['--trilha-entrada-delay']).toBe('140ms');
    expect(estilo['--trilha-entrada-offset']).toBe(`${REVEAL_OFFSET_Y * 2}px`);
    expect(estilo['--trilha-entrada-duracao']).toBe(`${TRILHA_ENTRADA_DURACAO_MS}ms`);
    expect(estilo['--trilha-entrada-curva']).toBe(TRILHA_ENTRADA_EASE);

    const chaves = Object.keys(estilo);
    expect(chaves).toHaveLength(4);
    chaves.forEach((chave) => {
      // Só custom properties: `height`, `margin`, `padding`, `width`… ficam fora.
      expect(chave.startsWith('--')).toBe(true);
    });
  });

  it('o atraso inline nunca é negativo, fracionário ou NaN', () => {
    expect(estiloEntrada(-30)['--trilha-entrada-delay']).toBe('0ms');
    expect(estiloEntrada(Number.NaN)['--trilha-entrada-delay']).toBe('0ms');
    expect(estiloEntrada(69.4)['--trilha-entrada-delay']).toBe('69ms');
  });

  it('NÃO existe variant de entrada — a entrada não passa pelo Framer', () => {
    expect(Object.keys(trilhaSaidaVariants)).toEqual(['collapsed']);
  });

  it('o controle do painel "Mais filtros" continua com a curva do Organograma', () => {
    expect(TRILHA_EASE).toBe(REVEAL_OPEN_EASE);
  });

  it('a ENTRADA tem curva PRÓPRIA, de arranque lento (não é a de abertura)', () => {
    // `cubic-bezier(0.2, 0, 0, 1)`: a "emphasized decelerate". A curva de
    // abertura `(0.22, 1, 0.36, 1)` entrega ~75% do percurso em 100ms e, numa
    // linha de ~120px, se lia como piscada (ver o topo de `trilhaReveal.ts`).
    expect(TRILHA_ENTRADA_EASE).toBe('cubic-bezier(0.2, 0, 0, 1)');
    expect(TRILHA_ENTRADA_EASE).not.toBe(REVEAL_OPEN_EASE);
  });

  it('o deslocamento é o DOBRO do Organograma: -8px numa linha densa de ~120px', () => {
    // Com 4px sobre uma linha de 120px a subida não se lê: a entrada virava fade.
    expect(TRILHA_ENTRADA_OFFSET_PX).toBe(-8);
    expect(TRILHA_ENTRADA_OFFSET_PX).toBe(REVEAL_OFFSET_Y * 2);
  });

  it('o ritmo é de leitura: 620ms por bloco e 90ms de passo', () => {
    expect(TRILHA_ENTRADA_DURACAO_MS).toBe(620);
    expect(TRILHA_ENTRADA_PASSO_MS).toBe(90);
    expect(TRILHA_PASSOS_MAX).toBe(6);
  });

  it('o passo é MENOR que a duração: as entradas se SOBREPÕEM', () => {
    expect(TRILHA_ENTRADA_PASSO_MS).toBeLessThan(TRILHA_ENTRADA_DURACAO_MS);
  });

  it('o pior caso assenta em pouco mais de 1s (onda longa o bastante para ser lida)', () => {
    const piorCaso = atrasoDoGrupoMs(TRILHA_PASSOS_MAX) + TRILHA_ENTRADA_DURACAO_MS;
    expect(piorCaso).toBe(540 + 620);
    expect(piorCaso).toBeGreaterThan(1000);
    expect(piorCaso).toBeLessThan(1200);
  });

  it('a SAÍDA recolhe a altura (para o vizinho não pular) e é curta', () => {
    expect(trilhaSaidaVariants.collapsed).toMatchObject({ height: 0, opacity: 0 });
    const transicao = (trilhaSaidaVariants.collapsed as any).transition;
    expect(transicao.delay).toBe(0);
    expect(transicao.duration).toBe(TRILHA_SAIDA_DURACAO);
    expect(transicao.ease).toBe(TRILHA_SAIDA_EASE);
    expect(TRILHA_SAIDA_EASE).toBe(REVEAL_CLOSE_EASE);
    expect(TRILHA_SAIDA_DURACAO_MS).toBe(220);
    expect(TRILHA_SAIDA_DURACAO_MS).toBeLessThan(TRILHA_ENTRADA_DURACAO_MS);
  });
});

describe('coordenarTrilhaPorGrupo — cascata em ms com reset por grupo', () => {
  it('cada grupo devolve cabeçalho + um atraso por evento, em ms', () => {
    expect(coordenarTrilhaPorGrupo([2, 1])).toEqual([
      [0, 90, 180],
      [0, 90],
    ]);
  });

  it('a contagem REINICIA em cada grupo (o 2º grupo não espera o 1º)', () => {
    const [g1, g2] = coordenarTrilhaPorGrupo([6, 4]);
    expect(g1[0]).toBe(0);
    expect(g2[0]).toBe(0);
    // O 1º evento do grupo 2 começa no primeiro passo, não depois da fila do 1º.
    expect(g2[1]).toBe(TRILHA_ENTRADA_PASSO_MS);
  });

  it('dentro do grupo o atraso é estritamente crescente até o teto', () => {
    const [g] = coordenarTrilhaPorGrupo([TRILHA_PASSOS_MAX]);
    expect(g).toEqual([0, 90, 180, 270, 360, 450, 540]);
    for (let i = 1; i < g.length; i += 1) expect(g[i]).toBeGreaterThan(g[i - 1]);
  });

  it('acima do teto o atraso congela (dia grande não arrasta a entrada)', () => {
    const [curto] = coordenarTrilhaPorGrupo([TRILHA_PASSOS_MAX]);
    const [longo] = coordenarTrilhaPorGrupo([40]);
    expect(longo[longo.length - 1]).toBe(curto[curto.length - 1]);
    expect(atrasoDoGrupoMs(40)).toBe(atrasoDoGrupoMs(TRILHA_PASSOS_MAX));
  });

  it('grupo vazio devolve só a posição do cabeçalho', () => {
    expect(coordenarTrilhaPorGrupo([0])).toEqual([[0]]);
  });

  it('entrada inválida não gera atraso negativo', () => {
    expect(atrasoDoGrupoMs(-5)).toBe(0);
    expect(atrasoDoGrupoMs(Number.NaN)).toBe(0);
    expect(atrasoDoGrupoMs(2.9)).toBe(2 * TRILHA_ENTRADA_PASSO_MS);
  });
});
