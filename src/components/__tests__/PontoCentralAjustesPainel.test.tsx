/**
 * Central de Ajustes — painel "Detalhes da Solicitação": os CARTÕES INTERNOS.
 *
 * O jsdom não pinta pixel, então o teste trava o contrato do redesenho:
 *
 *   • quatro cartões (dados · justificativa · risco · jornada) com a MESMA
 *     anatomia — `rounded-[10px]`, borda e `px-2.5 py-2.5` — separados por
 *     `space-y-2.5` (12,5 px de respiro e de vão);
 *   • cada cartão com a SUA paleta: dados azul-aço, justificativa roxa, risco
 *     conforme o nível e jornada verde-petróleo;
 *   • o tom do risco é o do parecer gravado (alto · médio · baixo) e, sem
 *     parecer, o cartão é NEUTRO — nunca verde "de graça";
 *   • o conteúdo continua sendo o do backend: justificativa inteira, horário
 *     original riscado ao lado do pedido, último registro e próxima jornada
 *     vindos de `registros_ponto`;
 *   • as ações seguem intactas: Aprovar / Rejeitar na mesma linha e "Detalhes
 *     completos" abaixo.
 *
 * `riscoDoAjuste`/`contextoDaJornada` NÃO são recalculados aqui — o painel só
 * escolhe a casca. Por isso os níveis testados são exatamente os que a camada de
 * dados (já coberta em `centralAjustes.test.ts`) devolve.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';

/** Jornada do colaborador devolvida pela consulta (hoisted para o `vi.mock`). */
const cenario = vi.hoisted(() => ({
  registros: [
    { data: '2026-11-03', entrada_1: '07:58', saida_1: '17:12' },
    { data: '2026-11-05', entrada_1: '08:00', saida_1: '17:00' },
  ] as Record<string, unknown>[],
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: cenario.registros, isLoading: false }),
}));

import { CentralAjustesPainel } from '../ponto/CentralAjustesPainel';
import type { NivelRiscoAjuste, SolicitacaoAjustePonto } from '../ponto/centralAjustes';

/** Solicitação completa; cada caso troca só o que importa. */
function solicitacao(over: Partial<SolicitacaoAjustePonto> = {}): SolicitacaoAjustePonto {
  return {
    id: 'saj-1',
    colaborador_id: 'colab-1',
    colaborador: { nome_completo: 'Ana Beatriz Souza' },
    data_ponto: '2026-11-04',
    tipo_ponto: 'saida',
    hora_sugerida: '17:00',
    hora_original: '17:06',
    motivo: 'Esqueci de registrar a saída do expediente, pois precisei sair para um compromisso pessoal.',
    status: 'pendente',
    observacoes_gestor: null,
    relatorio_conformidade: {
      divergencia_minutos: 6,
      ia_risco: { nivel: 'alto', resumo: 'Divergência relevante entre o horário pedido e o histórico recente.' },
    },
    ...over,
  } as SolicitacaoAjustePonto;
}

/** Sem parecer de risco: só o relatório de conformidade. */
const SEM_PARECER = { divergencia_minutos: 6 };

function montar(over: Partial<SolicitacaoAjustePonto> = {}) {
  const acoes = { onFechar: vi.fn(), onAprovar: vi.fn(), onRejeitar: vi.fn(), onVerCompleto: vi.fn() };
  const { container } = render(
    <CentralAjustesPainel solicitacao={solicitacao(over)} empresaId="empresa-1" {...acoes} />
  );
  return { container, ...acoes };
}

/** Cartão que contém um título de seção (o `section` mais próximo do `h4`). */
const cartaoDe = (titulo: RegExp): HTMLElement =>
  screen.getByRole('heading', { name: titulo }).closest('section') as HTMLElement;

/** Paleta esperada por nível — a mesma declarada no componente. */
const TONS: Record<NivelRiscoAjuste, { rotulo: string; fundo: string; borda: string }> = {
  alto: { rotulo: 'Alto', fundo: 'bg-[#30191E]', borda: 'border-[#87313A]' },
  medio: { rotulo: 'Médio', fundo: 'bg-[#2C2110]', borda: 'border-[#8A5B16]' },
  baixo: { rotulo: 'Baixo', fundo: 'bg-[#0C2922]', borda: 'border-[#146C4B]' },
};

describe('CentralAjustesPainel — diagramação dos cartões internos', () => {
  it('empilha os quatro cartões com o mesmo raio, respiro e vão de 12 px', () => {
    const { container } = montar();

    const corpo = container.querySelector('.space-y-2\\.5') as HTMLElement;
    expect(corpo).not.toBeNull();
    // Gap entre cartões: 12,5 px na tela (10 px de fonte × 125% do root).
    expect(corpo.className).toContain('space-y-2.5');

    const cartoes = [
      cartaoDe(/dados da solicitação/i),
      cartaoDe(/justificativa/i),
      cartaoDe(/análise de risco \(ia\)/i),
      cartaoDe(/contexto da jornada/i),
    ];

    cartoes.forEach((cartao) => {
      // Anatomia única: raio 12,5 px, borda e respiro interno de 12,5 px.
      expect(cartao.className).toContain('rounded-[10px]');
      expect(cartao.className).toContain('border');
      expect(cartao.className).toContain('px-2.5');
      expect(cartao.className).toContain('py-2.5');
    });
  });

  it('veste os dados da solicitação de azul-aço, em três colunas iguais', () => {
    montar();

    const dados = cartaoDe(/dados da solicitação/i);
    expect(dados).toHaveAttribute('aria-label', 'Dados da solicitação');
    expect(dados.className).toContain('bg-[#111E30]');
    expect(dados.className).toContain('border-[#26384B]');

    const grade = dados.querySelector('.grid') as HTMLElement;
    expect(grade.className).toContain('grid-cols-3');
    // Divisórias sutis entre as colunas (linhas verticais, não caixas).
    expect(grade.className).toContain('divide-x');
    expect(grade.className).toContain('divide-[#26384B]');

    // Conteúdo real: data, tipo de ajuste e horário pedido + o gravado riscado.
    expect(within(dados).getByText('04/11/2026')).toBeInTheDocument();
    expect(within(dados).getByText('Saída')).toBeInTheDocument();
    expect(within(dados).getByText('17:00')).toBeInTheDocument();
    expect(within(dados).getByText('17:06').className).toContain('line-through');
  });

  it('mostra a justificativa inteira num cartão roxo, sem fundo brilhante', () => {
    const texto =
      'Cheguei ao cliente às 7h50 e o sistema não registrou a entrada porque o aplicativo estava sem sinal; ' +
      'tenho o comprovante de acesso emitido pela portaria e o e-mail do gestor confirmando o horário.';
    montar({ motivo: texto });

    const justificativa = cartaoDe(/justificativa/i);
    expect(justificativa.className).toContain('bg-[#171D31]');
    expect(justificativa.className).toContain('border-[#42417B]');
    // Ícone e título na tinta roxa da seção.
    expect(within(justificativa).getByRole('heading').className).toContain('text-[#A78BFA]');
    expect(justificativa.querySelector('.lucide-quote')?.getAttribute('class')).toContain('text-[#A78BFA]');
    // Nada de texto truncado: o motivo inteiro é renderizado.
    expect(within(justificativa).getByText(texto)).toBeInTheDocument();
  });

  it.each(Object.entries(TONS))('pinta o cartão de risco no tom do nível "%s"', (nivel, tom) => {
    montar({
      relatorio_conformidade: {
        divergencia_minutos: 6,
        ia_risco: { nivel, resumo: 'Parecer gravado pela análise.' },
      } as SolicitacaoAjustePonto['relatorio_conformidade'],
    });

    const risco = cartaoDe(/análise de risco \(ia\)/i);
    expect(risco.className).toContain(tom.fundo);
    expect(risco.className).toContain(tom.borda);

    // Título e selo na MESMA linha, com o parecer logo abaixo.
    const linhaDoTitulo = within(risco).getByRole('heading').parentElement as HTMLElement;
    expect(linhaDoTitulo.className).toContain('justify-between');
    expect(linhaDoTitulo).toHaveTextContent(tom.rotulo);
    expect(within(risco).getByText('Parecer gravado pela análise.')).toBeInTheDocument();
  });

  it('mantém o cartão de risco NEUTRO quando não há parecer (não inventa nível)', () => {
    montar({ relatorio_conformidade: SEM_PARECER as SolicitacaoAjustePonto['relatorio_conformidade'] });

    const risco = cartaoDe(/análise de risco \(ia\)/i);
    expect(risco.className).toContain('bg-muted/20');
    expect(risco.className).not.toContain('bg-[#0C2922]');
    // Nenhum selo de nível: o dado não existe.
    expect(within(risco).queryByText(/^(Alto|Médio|Baixo)$/)).toBeNull();
    expect(within(risco).getByText(/não tem parecer de risco registrado/i)).toBeInTheDocument();
  });

  it('lista último registro e próxima jornada em linhas separadas, valor acima do rótulo', () => {
    montar();

    const jornada = cartaoDe(/contexto da jornada/i);
    expect(jornada.className).toContain('bg-[#102C2A]');
    expect(jornada.className).toContain('border-[#245B52]');
    expect(within(jornada).getByRole('heading').className).toContain('text-[#5EEAD4]');

    // Uma linha por informação: dois pares rótulo/valor.
    const rotulos = jornada.querySelectorAll('dt');
    const valores = jornada.querySelectorAll('dd');
    expect(rotulos).toHaveLength(2);
    expect(valores).toHaveLength(2);
    expect(rotulos[0]).toHaveTextContent(/último registro/i);
    expect(valores[0]).toHaveTextContent('03/11/2026 às 17:12');
    expect(rotulos[1]).toHaveTextContent(/próxima jornada/i);
    expect(valores[1]).toHaveTextContent('05/11/2026');

    // O valor tem mais peso que o rótulo (semibold + tinta clara).
    expect(valores[0].className).toContain('font-semibold');
    expect(valores[0].className).toContain('text-[#D7FBF4]');
    expect(rotulos[0].className).not.toContain('font-semibold');

    // Divergência real do relatório continua aparecendo.
    expect(within(jornada).getByText(/divergência de 6 min/i)).toBeInTheDocument();
  });

  it('preserva as ações: Aprovar/Rejeitar na mesma linha e "Detalhes completos" abaixo', () => {
    const { onAprovar, onRejeitar, onVerCompleto } = montar();

    const aprovar = screen.getByRole('button', { name: /^Aprovar ajuste$/ });
    const rejeitar = screen.getByRole('button', { name: /^Rejeitar solicitação$/ });
    // Mesma linha, larguras equilibradas (grade de duas colunas).
    expect(aprovar.parentElement?.className).toContain('grid-cols-2');
    expect(rejeitar.parentElement).toBe(aprovar.parentElement);

    fireEvent.click(aprovar);
    fireEvent.click(rejeitar);
    expect(onAprovar).toHaveBeenCalledWith('saj-1');
    expect(onRejeitar).toHaveBeenCalledWith('saj-1');

    fireEvent.click(screen.getByRole('button', { name: /detalhes completos/i }));
    expect(onVerCompleto).toHaveBeenCalledWith(expect.objectContaining({ id: 'saj-1' }));
  });

  it('não renderiza cartão nenhum no estado de espera', () => {
    render(
      <CentralAjustesPainel
        solicitacao={null}
        onFechar={vi.fn()}
        onAprovar={vi.fn()}
        onRejeitar={vi.fn()}
        onVerCompleto={vi.fn()}
      />
    );

    expect(screen.getByText(/selecione uma solicitação/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /dados da solicitação/i })).toBeNull();
  });
});
