/**
 * Testes da revelação da Trilha de Auditoria de Desligamentos.
 *
 * O que está sendo protegido aqui:
 *  - a expansão é a do ORGANOGRAMA, não uma cópia: o preset importa duração,
 *    curva, deslocamento e passo de lá (mudar um valor na árvore move a trilha);
 *  - o bloco RECOLHIDO é altura zero + invisível (é expansão, não fade);
 *  - a fila é uma cascata: começa em 0, é estritamente crescente e o degrau é o
 *    cheio do Organograma enquanto couber numa fila curta;
 *  - a fila LONGA não acumula espera: o atraso do último bloco nunca passa da
 *    janela máxima (é o que impede uma trilha de 200 eventos levar segundos).
 */
import { describe, it, expect } from 'vitest';
import {
  atrasoDoGrupo,
  coordenarTrilhaPorGrupo,
  TRILHA_EVENTO_DURACAO,
  TRILHA_EVENTO_PASSO,
  TRILHA_PASSOS_MAX,
  TRILHA_SAIDA_DURACAO,
  trilhaRevealVariants,
} from '../desligamentos/trilhaReveal';
import { REVEAL_OFFSET_Y, REVEAL_OPEN_EASE } from '../organograma/organogramaReveal';

describe('trilhaReveal — preset do Organograma', () => {
  it('reusa curva e deslocamento do Organograma (só o ritmo é local)', () => {
    const alvo = trilhaRevealVariants.expanded(0) as Record<string, unknown>;
    const transicao = alvo.transition as Record<string, unknown>;
    expect(transicao.ease).toBe(REVEAL_OPEN_EASE);
    expect((trilhaRevealVariants.collapsed as Record<string, unknown>).y).toBe(REVEAL_OFFSET_Y);
  });

  it('usa a calibração local de ritmo (700ms por bloco, 150ms de passo)', () => {
    expect(TRILHA_EVENTO_DURACAO).toBe(0.7);
    expect(TRILHA_EVENTO_PASSO).toBe(0.15);
    const transicao = (trilhaRevealVariants.expanded(0) as any).transition;
    expect(transicao.duration).toBe(0.7);
  });

  it('o passo é menor que a duração: há SOBREPOSIÇÃO entre os eventos', () => {
    expect(TRILHA_EVENTO_PASSO).toBeLessThan(TRILHA_EVENTO_DURACAO);
  });

  it('o estado recolhido é altura ZERO e invisível (expansão, não fade)', () => {
    expect(trilhaRevealVariants.collapsed).toMatchObject({ height: 0, opacity: 0 });
  });

  it('a SAÍDA é curta e sem atraso (recolhimento discreto de ~250ms)', () => {
    const transicao = (trilhaRevealVariants.collapsed as any).transition;
    expect(transicao.delay).toBe(0);
    expect(transicao.duration).toBe(TRILHA_SAIDA_DURACAO);
    expect(TRILHA_SAIDA_DURACAO).toBe(0.25);
  });

  it('o estado expandido é a altura NATURAL do conteúdo e opaco', () => {
    expect(trilhaRevealVariants.expanded(0)).toMatchObject({ height: 'auto', opacity: 1, y: 0 });
  });

  it('o atraso chega pelo `custom` e nunca é negativo', () => {
    expect((trilhaRevealVariants.expanded(0.33) as any).transition.delay).toBeCloseTo(0.33, 6);
    expect((trilhaRevealVariants.expanded(-5) as any).transition.delay).toBe(0);
    expect((trilhaRevealVariants.expanded(Number.NaN) as any).transition.delay).toBe(0);
  });
});

describe('coordenarTrilhaPorGrupo — cascata com reset por grupo', () => {
  it('cada grupo devolve cabeçalho + um atraso por evento', () => {
    expect(coordenarTrilhaPorGrupo([2, 1])).toEqual([
      [0, 0.15, 0.3],
      [0, 0.15],
    ]);
  });

  it('a contagem REINICIA em cada grupo (o 2º grupo não espera o 1º)', () => {
    const [g1, g2] = coordenarTrilhaPorGrupo([6, 4]);
    expect(g1[0]).toBe(0);
    expect(g2[0]).toBe(0);
    // O 1º evento do grupo 2 começa no primeiro passo, não depois da fila do 1º.
    expect(g2[1]).toBe(TRILHA_EVENTO_PASSO);
  });

  it('dentro do grupo o atraso é estritamente crescente até o teto', () => {
    const [g] = coordenarTrilhaPorGrupo([TRILHA_PASSOS_MAX]);
    for (let i = 1; i < g.length; i += 1) expect(g[i]).toBeGreaterThan(g[i - 1]);
  });

  it('acima do teto o atraso congela (dia grande não arrasta a entrada)', () => {
    const [curto] = coordenarTrilhaPorGrupo([TRILHA_PASSOS_MAX]);
    const [longo] = coordenarTrilhaPorGrupo([40]);
    const ultimoCurto = curto[curto.length - 1];
    const ultimoLongo = longo[longo.length - 1];
    expect(ultimoLongo).toBe(ultimoCurto);
    expect(atrasoDoGrupo(40)).toBe(atrasoDoGrupo(TRILHA_PASSOS_MAX));
  });

  it('grupo vazio devolve só a posição do cabeçalho', () => {
    expect(coordenarTrilhaPorGrupo([0])).toEqual([[0]]);
  });
});
