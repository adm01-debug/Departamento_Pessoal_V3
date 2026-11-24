import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { AnalyticsOrigens } from '../AnalyticsOrigens';
import { AnalyticsVagas } from '../AnalyticsVagas';
import { PreenchimentoBarraAnalytics } from '../barraProgressoAnalytics';
import { GRADIENTES_ORIGEM, GRADIENTE_VAGA, TRILHA_BARRA_INLINE } from '../analyticsVisual';
import type { DesempenhoVaga, OrigemRanking } from '../analyticsComum';

/**
 * Barras de "Principais origens" e "Desempenho por vaga".
 *
 * O que este teste trava (o movimento em si é validado no navegador):
 *   1. o gradiente é o da PLATAFORMA (LinkedIn azul, Indeed roxo, …), não o da
 *      posição na lista — a cor não pode trocar quando o ranking muda;
 *   2. "Desempenho por vaga" usa UM gradiente em todas as barras;
 *   3. as barras começam VISIVELMENTE em 0 e só crescem depois que a entrada do
 *      card termina (`animar`), sem nunca nascerem cheias;
 *   4. com movimento reduzido a barra é montada já no comprimento final;
 *   5. nada de trilho, altura, canto ou espaçamento foi tocado: o trilho
 *      continua sendo o token de sempre e o preenchimento continua
 *      `block h-full rounded-full`.
 */

const ORIGENS: OrigemRanking[] = [
  { origem: 'LinkedIn', total: 5, percentual: 27.8 },
  { origem: 'Indeed', total: 4, percentual: 22.2 },
  { origem: 'Gupy', total: 3, percentual: 16.7 },
  { origem: 'Indicação', total: 3, percentual: 16.7 },
  { origem: 'Site', total: 3, percentual: 16.7 },
];

const VAGAS: DesempenhoVaga[] = [
  {
    id: 'vaga-1',
    titulo: 'Desenvolvedor(a) Full Stack Sênior',
    status: 'aberta',
    candidatos: 5,
    contratados: 2,
    conversao: 40,
  },
  {
    id: 'vaga-2',
    titulo: 'Assistente Administrativo',
    status: 'fechada',
    candidatos: 4,
    contratados: 2,
    conversao: 50,
  },
  { id: 'vaga-3', titulo: 'Analista de RH Pleno', status: 'aberta', candidatos: 4, contratados: 1, conversao: 25 },
  { id: 'vaga-4', titulo: 'Analista de Dados', status: 'aberta', candidatos: 3, contratados: 0, conversao: 0 },
];

/** Preenchimentos renderizados (o trilho não tem `background-image`). */
function preenchimentos(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('span')).filter((el) =>
    el.style.backgroundImage.includes('linear-gradient')
  );
}

/**
 * O `style` do jsdom normaliza cor para `rgb(...)` — o degradê em si (eixo,
 * paradas e percentuais) continua idêntico. Normalizar o esperado pelo MESMO
 * motor evita comparar `#0284C7` com `rgb(2, 132, 199)` sem afrouxar a
 * asserção.
 */
function normalizar(css: string): string {
  const alvo = document.createElement('span');
  alvo.style.backgroundImage = css;
  return alvo.style.backgroundImage;
}

describe('barras da Analytics — gradiente e entrada', () => {
  it('cada origem usa o gradiente da SUA plataforma, na ordem aprovada', () => {
    const { container } = render(<AnalyticsOrigens origens={ORIGENS} index={6} />);
    const barras = preenchimentos(container);

    expect(barras).toHaveLength(ORIGENS.length);
    expect(barras.map((barra) => barra.style.backgroundImage)).toEqual([
      normalizar(GRADIENTES_ORIGEM.azul),
      normalizar(GRADIENTES_ORIGEM.roxo),
      normalizar(GRADIENTES_ORIGEM.ambar),
      normalizar(GRADIENTES_ORIGEM.rosa),
      normalizar(GRADIENTES_ORIGEM.verde),
    ]);

    // O degradê vai da esquerda para a direita, com a cor intensa na partida.
    expect(GRADIENTES_ORIGEM.azul).toBe('linear-gradient(90deg, #0284C7 0%, #00C8FF 100%)');
    expect(GRADIENTES_ORIGEM.verde).toBe('linear-gradient(90deg, #059669 0%, #00E89D 100%)');
  });

  it('origem sem marca conhecida herda o gradiente do token da linha', () => {
    // "Não informada" está na 2ª linha → token `chart-4` (roxo) no marcador, e a
    // barra acompanha o marcador em vez de ficar sem cor.
    const { container } = render(
      <AnalyticsOrigens
        origens={[
          { origem: 'LinkedIn', total: 5, percentual: 60 },
          { origem: 'Não informada', total: 3, percentual: 40 },
        ]}
        index={6}
      />
    );
    const barras = preenchimentos(container);

    expect(barras[0].style.backgroundImage).toBe(normalizar(GRADIENTES_ORIGEM.azul));
    expect(barras[1].style.backgroundImage).toBe(normalizar(GRADIENTES_ORIGEM.roxo));
  });

  it('todo preenchimento de vaga usa o MESMO gradiente azul → verde-água', () => {
    const { container } = render(<AnalyticsVagas vagas={VAGAS} index={9} />);
    const barras = preenchimentos(container);

    expect(barras).toHaveLength(VAGAS.length);
    for (const barra of barras) {
      expect(barra.style.backgroundImage).toBe(normalizar(GRADIENTE_VAGA));
    }
    expect(GRADIENTE_VAGA).toBe('linear-gradient(90deg, #0284C7 0%, #00C8FF 100%)');
  });

  it('as barras nascem em 0 e esperam a entrada do card terminar', () => {
    const { container: origens } = render(<AnalyticsOrigens origens={ORIGENS} index={6} />);
    const { container: vagas } = render(<AnalyticsVagas vagas={VAGAS} index={9} />);

    // `animar` só vira `true` no `onAnimationComplete` do card (ou na rede de
    // segurança do hook) — no primeiro render a barra está vazia.
    for (const barra of [...preenchimentos(origens), ...preenchimentos(vagas)]) {
      expect(barra.style.width).toMatch(/^0(px)?$/);
    }
  });

  it('preserva o trilho, a altura e os cantos do preenchimento', () => {
    const { container } = render(<AnalyticsOrigens origens={ORIGENS} index={6} />);
    const barra = preenchimentos(container)[0];

    expect(barra.className).toContain('block');
    expect(barra.className).toContain('h-full');
    expect(barra.className).toContain('rounded-full');
    // O trilho continua sendo o token compartilhado, com o fundo escuro: nada de
    // altura, largura ou cor de trilho novas.
    const trilho = barra.parentElement as HTMLElement;
    expect(trilho.className).toContain('h-2');
    expect(trilho.className).toContain('overflow-hidden');
    expect(trilho.className).toContain('rounded-full');
    expect(trilho.className).toContain('bg-border/40');
    expect(trilho.className).toContain('flex-[1.15]');
    expect(TRILHA_BARRA_INLINE).toContain('bg-border/40');
  });

  it('monta já no comprimento final com movimento reduzido', () => {
    const { container } = render(
      <PreenchimentoBarraAnalytics percentual={27.8} gradiente={GRADIENTES_ORIGEM.azul} animar reduzirMovimento />
    );
    const barra = container.firstElementChild as HTMLElement;

    // Sem arredondar: a barra representa o percentual escrito ao lado dela.
    expect(barra.style.width).toBe('27.8%');
  });

  it('antes da entrada do card a barra fica em 0 mesmo com o dado pronto', () => {
    const { container } = render(
      <PreenchimentoBarraAnalytics
        percentual={62.5}
        gradiente={GRADIENTE_VAGA}
        animar={false}
        reduzirMovimento={false}
      />
    );
    const barra = container.firstElementChild as HTMLElement;

    expect(barra.style.width).toMatch(/^0(px)?$/);
    expect(barra.style.backgroundImage).toBe(normalizar(GRADIENTE_VAGA));
  });
});
