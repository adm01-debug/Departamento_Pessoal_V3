import { describe, expect, it } from 'vitest';
import {
  CASCADE_ITEM_DURATION_OUT,
  CASCADE_ITEM_STAGGER,
  CASCADE_SAIDA_PADRAO,
  CASCADE_SAIDA_RAPIDA,
  CASCADE_SHELL_CLOSE_DURATION,
  cascadeCloseDuration,
  cascadeContainerVariants,
  cascadeContainerVariantsPara,
  cascadeExitStagger,
  cascadeOverlayVariants,
  cascadeShellVariants,
} from '@/components/ui/cascade-motion';

/**
 * ============================================================================
 * PERFIS DE SAÍDA DA CASCATA — o fechamento não pode crescer com o tamanho da
 * lista.
 *
 * Relato: a janela "Talentos em destaque" (aba Nine-Box) "demora muito pra
 * fechar". A causa não era lenta, era ESTRUTURAL: a saída é sequencial
 * (`0,12 s` por bloco) e a janela abre com um bloco por talento, então 7
 * talentos = `7 × 0,12 + 0,28` de cascata + `0,55` de encolhimento = **1,67 s**
 * — e 20 talentos davam 3,2 s. Com `CASCADE_SAIDA_RAPIDA` o fechamento é
 * **0,62 s** em qualquer contagem.
 *
 * O que este teste trava:
 *   1. o perfil PADRÃO continua com os números históricos (todas as outras
 *      janelas — Pendências, Novo Desligamento, Auditoria, Pesquisas,
 *      Treinamentos — não podem mudar de comportamento);
 *   2. o perfil RÁPIDO é CONSTANTE a partir de 3 blocos (não cresce com a lista);
 *   3. nos dois perfis a ABERTURA é a mesma (a cascata de entrada, 0,12 s por
 *      bloco e 0,9 s de caixa, é a assinatura aprovada do sistema);
 *   4. véu e caixa saem no mesmo compasso (o véu usa `cascadeCloseDuration`).
 * ============================================================================
 */

const BLOCOS_TALENTOS = 8; // 7 talentos + o título da janela

describe('cascade-motion — perfil PADRÃO (comportamento histórico intacto)', () => {
  it('mantém 0,12 s por bloco, sem teto, e 0,55 s de caixa', () => {
    expect(CASCADE_SAIDA_PADRAO.intervalo).toBe(CASCADE_ITEM_STAGGER);
    expect(CASCADE_SAIDA_PADRAO.duracaoCaixa).toBe(CASCADE_SHELL_CLOSE_DURATION);
    expect(CASCADE_SAIDA_PADRAO.intervaloTotalMax).toBe(Number.POSITIVE_INFINITY);

    // Janela de 3 blocos: 0,52 s de cascata + 0,55 s de caixa.
    expect(cascadeCloseDuration(3)).toBeCloseTo(1.07, 10);
    // Janela de lista (o caso relatado): 1,67 s.
    expect(cascadeCloseDuration(BLOCOS_TALENTOS)).toBeCloseTo(1.67, 10);
  });

  it('é o mesmo `cascadeContainerVariants` que os ~30 consumidores importam', () => {
    // O `const` exportado é o perfil padrão aplicado — e o padrão não depende
    // da contagem de blocos, então o objeto é idêntico ao histórico.
    expect(JSON.stringify(cascadeContainerVariants)).toBe(
      JSON.stringify(cascadeContainerVariantsPara(3))
    );
    expect(JSON.stringify(cascadeContainerVariantsPara(BLOCOS_TALENTOS))).toBe(
      JSON.stringify(cascadeContainerVariants)
    );
    expect(cascadeContainerVariants.closed).toEqual({
      transition: { staggerChildren: CASCADE_ITEM_STAGGER, staggerDirection: -1 },
    });
  });

  it('a caixa só encolhe depois da cascata (delay) e em 0,55 s', () => {
    const caixa = cascadeShellVariants(BLOCOS_TALENTOS).closed as any;
    expect(caixa.transition.duration).toBe(CASCADE_SHELL_CLOSE_DURATION);
    expect(caixa.transition.delay).toBeCloseTo(
      7 * CASCADE_ITEM_STAGGER + CASCADE_ITEM_DURATION_OUT,
      10
    );
  });
});

describe('cascade-motion — perfil RÁPIDO (janelas de lista)', () => {
  it('fecha em 0,62 s e NÃO cresce com o número de linhas', () => {
    // 0,08 s de espalhamento total + 0,28 s de fade por bloco + 0,26 s de caixa.
    expect(cascadeCloseDuration(BLOCOS_TALENTOS, CASCADE_SAIDA_RAPIDA)).toBeCloseTo(0.62, 6);
    for (const blocos of [8, 12, 20, 40]) {
      expect(cascadeCloseDuration(blocos, CASCADE_SAIDA_RAPIDA)).toBeCloseTo(0.62, 6);
    }
  });

  it('é ao menos 2,5× mais rápido que o padrão na janela relatada', () => {
    const padrao = cascadeCloseDuration(BLOCOS_TALENTOS, CASCADE_SAIDA_PADRAO);
    const rapido = cascadeCloseDuration(BLOCOS_TALENTOS, CASCADE_SAIDA_RAPIDA);
    expect(rapido).toBeLessThan(0.7); // fechamento abaixo de 1 s (o relato)
    expect(padrao / rapido).toBeGreaterThan(2.5);
  });

  it('espalha os blocos em no máximo `intervaloTotalMax`, com resto de onda', () => {
    const blocos = BLOCOS_TALENTOS;
    const stagger = cascadeExitStagger(blocos, CASCADE_SAIDA_RAPIDA);
    // Teto da SOMA dos intervalos (é o que mantém o total constante).
    expect(stagger * (blocos - 1)).toBeLessThanOrEqual(
      CASCADE_SAIDA_RAPIDA.intervaloTotalMax + 1e-9
    );
    // Ainda existe onda (os blocos não são exatamente simultâneos) e cada
    // passo cabe em menos de um quadro a 60 fps.
    expect(stagger).toBeGreaterThan(0);
    expect(stagger).toBeLessThan(1 / 60);
    // Lista curta usa o intervalo nominal, não o teto.
    expect(cascadeExitStagger(3, CASCADE_SAIDA_RAPIDA)).toBe(CASCADE_SAIDA_RAPIDA.intervalo);
  });

  it('mantém a ABERTURA idêntica à do perfil padrão', () => {
    const rapido = cascadeContainerVariantsPara(BLOCOS_TALENTOS, CASCADE_SAIDA_RAPIDA);
    const padrao = cascadeContainerVariantsPara(BLOCOS_TALENTOS, CASCADE_SAIDA_PADRAO);
    expect(rapido.open).toEqual(padrao.open);

    const caixaRapida = cascadeShellVariants(BLOCOS_TALENTOS, CASCADE_SAIDA_RAPIDA).open as any;
    const caixaPadrao = cascadeShellVariants(BLOCOS_TALENTOS, CASCADE_SAIDA_PADRAO).open as any;
    expect(caixaRapida).toEqual(caixaPadrao);
  });

  it('véu e caixa saem no mesmo compasso (uma única duração total)', () => {
    const blocos = BLOCOS_TALENTOS;
    const total = cascadeCloseDuration(blocos, CASCADE_SAIDA_RAPIDA);
    const veu = cascadeOverlayVariants(blocos, CASCADE_SAIDA_RAPIDA).closed as any;
    const caixa = cascadeShellVariants(blocos, CASCADE_SAIDA_RAPIDA).closed as any;
    expect(veu.transition.duration).toBeCloseTo(total, 10);
    expect(caixa.transition.delay + caixa.transition.duration).toBeCloseTo(total, 10);
    // O conteúdo termina exatamente quando a caixa começa a encolher.
    expect(caixa.transition.delay).toBeCloseTo(
      CASCADE_SAIDA_RAPIDA.intervaloTotalMax + CASCADE_ITEM_DURATION_OUT,
      6
    );
  });
});
