import { describe, it, expect } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  CRESCIMENTO_BARRA_DURACAO_MS,
  CRESCIMENTO_BARRA_INTERVALO_MS,
  duracaoTotalCrescimento,
  easeInOutSine,
  estiloCrescimentoBarra,
  useCrescimentoBarras,
} from '../ui/crescimentoBarras';
import { PontoEquipeStatusCard } from '../ponto/PontoEquipeStatusCard';

/**
 * MOTION DOS CARDS DO CONTROLE DE PONTO — prova objetiva das quatro mudanças.
 *
 *  1. "Fechamento do Ponto": barra com gradiente lima → success, preenchendo
 *     0 → percentual com a régua global (`propsPreenchimentoBarra`).
 *  2. "Horas Trabalhadas": barras com o acabamento do card "Visualize o
 *     impacto" (preenchimento translúcido + contorno) crescendo da base em
 *     cascata, com as cores semânticas do card preservadas.
 *  3. "Últimas Batidas": hover que ESCURECE a linha (paleta do sistema).
 *  4. "Situação da Equipe": os quatro indicadores entram de dentro para fora
 *     (opacidade + escala), em cascata, com a régua global de duração.
 *
 * Os números de tempo NÃO são redigitados em cada tela: o teste lê o fonte do
 * card de referência (`RewardsSimulator`, "2. Visualize o impacto") e o módulo
 * compartilhado para garantir que os dois lados continuam iguais — mexer num
 * deles derruba este arquivo.
 */
const ler = (relativo: string) => readFileSync(path.resolve(process.cwd(), relativo), 'utf8');

const SIMULADOR = 'src/components/premiacoes/RewardsSimulator.tsx';
const HORAS = 'src/components/ponto/PontoHorasSemanaCard.tsx';
const FECHAMENTO = 'src/components/ponto/PontoFechamentoCard.tsx';
const BATIDAS = 'src/components/ponto/PontoUltimasBatidasCard.tsx';
const EQUIPE = 'src/components/ponto/PontoEquipeStatusCard.tsx';

describe('crescimento das barras verticais (referência: "Visualize o impacto")', () => {
  it('os números são os mesmos do simulador (900 ms / 100 ms / ease-in-out senoidal)', () => {
    const simulador = ler(SIMULADOR);

    expect(simulador, 'duração por barra saiu da referência').toContain(
      `const BARRA_CRESCIMENTO_MS = ${CRESCIMENTO_BARRA_DURACAO_MS};`
    );
    expect(simulador, 'intervalo da cascata saiu da referência').toContain(
      `const BARRA_INTERVALO_MS = ${CRESCIMENTO_BARRA_INTERVALO_MS};`
    );
    expect(simulador, 'a referência deixou de usar a curva senoidal').toContain('easeInOutSine');

    expect(CRESCIMENTO_BARRA_DURACAO_MS).toBe(900);
    expect(CRESCIMENTO_BARRA_INTERVALO_MS).toBe(100);
    // 80–120 ms é a faixa pedida para o intervalo entre barras.
    expect(CRESCIMENTO_BARRA_INTERVALO_MS).toBeGreaterThanOrEqual(80);
    expect(CRESCIMENTO_BARRA_INTERVALO_MS).toBeLessThanOrEqual(120);
  });

  it('a curva é senoidal, limitada a 0–1 e termina exatamente em 1', () => {
    expect(easeInOutSine(0)).toBeCloseTo(0, 6);
    expect(easeInOutSine(0.5)).toBeCloseTo(0.5, 6);
    expect(easeInOutSine(1)).toBeCloseTo(1, 6);
    // Fora da faixa (barra que ainda não começou / já terminou) não extrapola.
    expect(easeInOutSine(-3)).toBe(0);
    expect(easeInOutSine(4)).toBeCloseTo(1, 6);
    expect(easeInOutSine(Number.NaN)).toBe(0);
  });

  it('a cascata soma uma barra por intervalo (7 dias = 1,5 s)', () => {
    expect(duracaoTotalCrescimento(0)).toBe(0);
    expect(duracaoTotalCrescimento(1)).toBe(CRESCIMENTO_BARRA_DURACAO_MS);
    expect(duracaoTotalCrescimento(7)).toBe(CRESCIMENTO_BARRA_DURACAO_MS + 6 * CRESCIMENTO_BARRA_INTERVALO_MS);
  });

  it('a barra cresce a partir da BASE e já nasce crescida sem JavaScript', () => {
    const estilo = estiloCrescimentoBarra(2);
    expect(estilo.transformOrigin).toBe('center bottom');
    expect(estilo.transformBox).toBe('fill-box');
    // Padrão 1 na variável: sem controlador, a barra aparece cheia (nunca em 0).
    expect(estilo.transform).toBe('scaleY(var(--crescimento-barra-2, 1))');
  });

  /** Monta o controlador num `<div>` real e devolve a variável CSS escrita. */
  function AlvoDoCrescimento({ total, ativo, reduzir }: { total: number; ativo: boolean; reduzir: boolean }) {
    const ref = useCrescimentoBarras({ total, ativo, reduzir });
    return <div ref={ref} data-testid="alvo" />;
  }

  it('antes do gatilho as barras ficam em zero; com movimento reduzido nascem cheias', () => {
    const { getByTestId, unmount } = render(<AlvoDoCrescimento total={3} ativo={false} reduzir={false} />);
    const alvo = getByTestId('alvo');
    expect(alvo.style.getPropertyValue('--crescimento-barra-0')).toBe('0.0000');
    expect(alvo.style.getPropertyValue('--crescimento-barra-2')).toBe('0.0000');
    unmount();

    const reduzido = render(<AlvoDoCrescimento total={3} ativo reduzir />);
    const alvoReduzido = reduzido.getByTestId('alvo');
    expect(alvoReduzido.style.getPropertyValue('--crescimento-barra-0')).toBe('1');
    expect(alvoReduzido.style.getPropertyValue('--crescimento-barra-2')).toBe('1');
  });

  it('o card de Horas usa o acabamento do simulador e mantém as cores do card', () => {
    const fonte = ler(HORAS);
    const simulador = ler(SIMULADOR);

    // Acabamento copiado da referência: 20% de preenchimento, contorno de 1,5px.
    expect(simulador).toContain('fillOpacity={0.2}');
    expect(simulador).toContain('strokeWidth={1.5}');
    expect(fonte).toContain('const BARRA_PREENCHIMENTO = 0.2;');
    expect(fonte).toContain('const BARRA_CONTORNO = 1.5;');

    // Cores semânticas preservadas: só os dois verdes do card entram nas barras
    // (a linha de meta pontilhada usa `--warning`, mas não é barra), e nenhum
    // hex fixo — as cores do simulador financeiro não foram copiadas.
    expect(fonte).toContain("fill={entrada.completa ? 'hsl(var(--success))' : 'hsl(var(--primary))'}");
    expect(fonte).not.toMatch(/#[0-9A-Fa-f]{6}/);

    // Crescimento pelo controlador compartilhado, sem duração digitada aqui.
    expect(fonte).toContain('useCrescimentoBarras');
    expect(fonte).toContain('useEntradaCardConcluida');
    expect(fonte).toContain('isAnimationActive={false}');
    expect(fonte).toContain('activeBar=');

    // Eixo, meta e tooltip seguem montados (só as barras animam).
    expect(fonte).toContain('<TooltipGrafico');
    expect(fonte).toContain('<ReferenceLine');
    expect(fonte).toContain('<YAxis');
  });
});

describe('Fechamento do Ponto — gradiente e preenchimento', () => {
  it('usa o gradiente lima → success na régua global, sem duração própria', () => {
    const fonte = ler(FECHAMENTO);

    expect(fonte).toContain('bg-gradient-to-r from-primary to-success');
    expect(fonte).toContain('propsPreenchimentoBarra');
    expect(fonte).toContain('useEntradaCardConcluida');
    expect(fonte).toContain('role="progressbar"');
    // A barra antiga (verde sólido, `translateX`) saiu de cena.
    expect(fonte).not.toContain('indicatorClassName');
    expect(fonte).not.toContain("components/ui/progress'");
  });
});

describe('Últimas Batidas — hover escurece a linha', () => {
  it('a linha escurece para o tom mais escuro da paleta, sem verde-lima', () => {
    const fonte = ler(BATIDAS);

    expect(fonte).toContain('hover:bg-background/80');
    expect(fonte).toContain('transition-colors');
    // O `--accent` translúcido clareava a linha no tema escuro.
    expect(fonte).not.toContain('hover:bg-accent');
    // Cabeçalho segue fora do hover.
    expect(fonte).toContain('hover:bg-transparent');
  });
});

describe('Situação da Equipe — indicadores de dentro para fora', () => {
  it('os quatro indicadores nascem escondidos (escala 0,9) e são revelados', async () => {
    // Render real (sem mock do Framer): prova que o estado inicial é opacidade 0
    // com escala 0,9 e que, terminada a entrada do card, os quatro blocos vão
    // para o estado final.
    const { container } = render(
      <PontoEquipeStatusCard
        colaboradores={[
          { id: 'c1', nome_completo: 'Ana Souza' },
          { id: 'c2', nome_completo: 'Bruno Lima' },
        ]}
        batidasHoje={[{ colaborador_id: 'c1', tipo: 'entrada' }]}
      />
    );

    const blocos = Array.from(container.querySelectorAll<HTMLElement>('[data-indicador]'));
    expect(blocos.map((bloco) => bloco.dataset.indicador)).toEqual([
      'Em jornada',
      'Em intervalo',
      'Não iniciaram',
      'Encerraram',
    ]);
    expect(blocos[0].style.opacity).toBe('0');
    expect(blocos[0].style.transform).toContain('0.9');
    // O bloco é o mesmo nó que carrega as classes visuais (nada de wrapper).
    expect(blocos[0].className).toContain('min-h-[62px]');

    await waitFor(() => expect(blocos[0].style.opacity).toBe('1'), { timeout: 5000 });
    await waitFor(() => expect(blocos[3].style.opacity).toBe('1'), { timeout: 5000 });
  }, 12000);

  it('entra com escala 0,9 → 1 em cascata de 100 ms, com a régua global', () => {
    const fonte = ler(EQUIPE);

    expect(fonte).toContain('const ENTRADA_INDICADOR_ESCALA = 0.9;');
    expect(fonte).toContain('const ENTRADA_INDICADOR_INTERVALO_S = 0.1;');
    // Duração e curva vêm da régua global de entrada de card (520 ms).
    expect(fonte).toContain('CONFIG_ENTRADA_CARD_GLOBAL.duracaoMs');
    expect(fonte).toContain('CONFIG_ENTRADA_CARD_GLOBAL.curva');
    expect(fonte).toContain('useEntradaCardConcluida');
    expect(fonte).toContain('opacity: 0, scale: ENTRADA_INDICADOR_ESCALA');
    expect(fonte).toContain('opacity: 1, scale: 1');
    // Movimento reduzido: revela direto no estado final.
    expect(fonte).toContain('reduzirMovimento ? false :');
  });
});
