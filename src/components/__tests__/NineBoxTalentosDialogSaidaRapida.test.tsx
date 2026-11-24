import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { PontoNineBox } from '@/components/avaliacao/nineBoxComum';

/**
 * ============================================================================
 * "TALENTOS EM DESTAQUE" FECHA RÁPIDO — a janela do "Ver todos" do Nine-Box
 * precisa responder ao X, não "desfilar" 8 blocos antes de sumir.
 *
 * Aqui cada talento é um BLOCO da cascata, então o fechamento padrão (0,12 s
 * por bloco, caixa só depois do último) dava 1,67 s com 7 talentos. O teste
 * captura as props que a janela entrega ao `AnimatedCascadeDialog` e prova que
 * ela pede `CASCADE_SAIDA_RAPIDA` — além de recalcular o fechamento real a
 * partir da contagem de talentos e do perfil recebido.
 * ============================================================================
 */

type PropsCascata = {
  open: boolean;
  perfilSaida?: PerfilSaidaCascata;
  items: unknown[];
};

const capturado = vi.hoisted(() => ({ props: null as unknown as PropsCascata }));

vi.mock('@/components/ui/animated-cascade-dialog', () => ({
  AnimatedCascadeDialog: (props: PropsCascata) => {
    capturado.props = props;
    return <div />;
  },
}));

import { CASCADE_SAIDA_PADRAO, CASCADE_SAIDA_RAPIDA, cascadeCloseDuration } from '@/components/ui/cascade-motion';
import type { PerfilSaidaCascata } from '@/components/ui/cascade-motion';
import { NineBoxTalentosDialog } from '../avaliacao/NineBoxTalentosDialog';

const FONTE = readFileSync(path.resolve(process.cwd(), 'src/components/avaliacao/NineBoxTalentosDialog.tsx'), 'utf8');
/** Sem comentários: a documentação pode citar o número, o código tem de usar a constante. */
const CODIGO = FONTE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

function ponto(nome: string): PontoNineBox {
  return {
    id: nome,
    colaboradorId: nome,
    nome,
    cargo: 'Analista',
    departamento: 'RH',
    foto: null,
    nota: 5,
    potencial: 5,
    desempenho: 3,
    potencialFaixa: 3,
    quadrante: '3-3',
    nomeQuadrante: 'Estrela',
    criadoEm: 0,
    pontuacao: 10,
    temPdi: true,
    pendencias: null,
    // Rastreabilidade da consolidação (obrigatória no tipo; a UI ignora).
    quantidadeAvaliacoes: 1,
    quantidadeAvaliacoesValidas: 1,
    sinalizados: 0,
    registrosSinalizados: [],
    selecionadoId: nome,
    notasForaDaEscala: 0,
    feedbackIdsUtilizados: [nome],
    statusConsolidacao: 'consolidado',
    tiposAvaliadores: ['gestor'],
  };
}

const RANKING = [
  'Carlos Eduardo Lima',
  'Helena Prado',
  'Ana Beatriz Souza',
  'Rafael Menezes',
  'William Nunes Cardoso',
  'Laura Bittencourt',
  'Lucas Gabriel Fernandes',
].map(ponto);

describe('NineBoxTalentosDialog — fechamento rápido (perfil de saída)', () => {
  it('pede `CASCADE_SAIDA_RAPIDA` e NUNCA o perfil padrão', () => {
    render(<NineBoxTalentosDialog aberto onOpenChange={() => {}} ranking={RANKING} />);

    expect(capturado.props).toBeTruthy();
    expect(capturado.props.open).toBe(true);
    expect(capturado.props.perfilSaida).toBe(CASCADE_SAIDA_RAPIDA);
    expect(capturado.props.perfilSaida).not.toBe(CASCADE_SAIDA_PADRAO);
    // Um bloco por talento: é a contagem que inflava o fechamento.
    expect(capturado.props.items).toHaveLength(RANKING.length);
  });

  it('o fechamento real fica abaixo de 1 s com 7 talentos (era 1,67 s)', () => {
    render(<NineBoxTalentosDialog aberto onOpenChange={() => {}} ranking={RANKING} />);

    const blocos = capturado.props.items.length + 1; // + o título
    const rapido = cascadeCloseDuration(blocos, capturado.props.perfilSaida);
    const padrao = cascadeCloseDuration(blocos, CASCADE_SAIDA_PADRAO);

    expect(padrao).toBeCloseTo(1.67, 6); // o que o usuário via
    expect(rapido).toBeCloseTo(0.62, 6); // o que ele passa a ver
    expect(rapido).toBeLessThan(1);
  });

  it('a fonte da janela passa o perfil (sem duração escrita à mão)', () => {
    expect(CODIGO).toMatch(/perfilSaida=\{CASCADE_SAIDA_RAPIDA\}/);
    expect(CODIGO).toMatch(/import\s*\{\s*CASCADE_SAIDA_RAPIDA\s*\}\s*from\s*'@\/components\/ui\/cascade-motion'/);
    // Nada de número mágico de animação nesta janela: quem manda é o perfil.
    expect(CODIGO).not.toMatch(/duration:\s*0?\.\d+/);
  });
});
