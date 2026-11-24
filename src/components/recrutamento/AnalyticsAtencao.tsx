import { useState } from 'react';
import {
  AlertTriangle,
  Briefcase,
  ChevronDown,
  CircleCheck,
  Timer,
  TrendingDown,
  UserMinus,
  type LucideIcon,
} from 'lucide-react';
import type { PontoAtencao, SeveridadeAtencao } from './analyticsComum';
import { AnalyticsPainel } from './AnalyticsPainel';
import { BOTAO_VER_TODOS } from './analyticsVisual';
import { cn } from '@/lib/utils';

/**
 * PONTOS DE ATENÇÃO — insights acionáveis derivados do próprio funil.
 *
 * As regras estão em `analyticsComum.construirPontosDeAtencao`: permanência
 * acima de 21 dias, vaga aberta parada há mais de 15 dias, menor conversão e
 * desistências registradas. Não há IA nem texto fixo: sem alerta derivado, o
 * painel mostra um estado positivo compacto.
 *
 * RESUMO, NÃO RELATÓRIO: cada alerta mostra só o essencial — ícone, título de
 * uma linha curta (contagem + etapa, dias parada, percentual) e uma descrição
 * de apoio. O texto técnico completo (permanência média, nome da vaga, data da
 * última movimentação, passagem do funil) vive em `PontoAtencao.detalhe` e sai
 * no `title` da linha. A nota "Regras: permanência > 21 dias…" que ficava no
 * pé do card saiu da interface: as regras continuam nos limites declarados em
 * `analyticsComum` (`DIAS_ALERTA_ETAPA`, `DIAS_ALERTA_VAGA`, piso de 60% de
 * conversão), mas não ocupam espaço permanente na vitrine.
 *
 * LISTA LONGA: a derivação já devolve no máximo quatro alertas
 * (`construirPontosDeAtencao` fecha com `.slice(0, 4)`), então na prática o
 * painel nunca cresce; o "Ver todos" no cabeçalho continua existindo para o
 * caso de o limite da derivação aumentar sem revisar esta tela. Antes, uma base
 * com muitos gargalos empurrava o painel para o dobro da altura dos vizinhos
 * (tempo e vagas).
 */
const ESTILO_SEVERIDADE: Record<SeveridadeAtencao, string> = {
  alta: 'border-destructive-vivid/25 bg-destructive-vivid/10 text-destructive-vivid',
  media: 'border-warning/25 bg-warning/10 text-warning',
  baixa: 'border-info/25 bg-info/10 text-info',
};

const ICONE_TIPO: Record<PontoAtencao['tipo'], LucideIcon> = {
  gargalo: Timer,
  vaga: Briefcase,
  conversao: TrendingDown,
  desistencia: UserMinus,
};

/**
 * Quantos alertas aparecem com a lista fechada. TRÊS linhas de duas linhas de
 * texto preenchem o painel sem estourar a altura dos vizinhos (a faixa da
 * referência mostra três); daí para cima a lista abre no "Ver todos" em vez de
 * empurrar o rodapé. A derivação (`construirPontosDeAtencao`) já limita a
 * quatro alertas, então na prática o botão só aparece quando há o 4º.
 */
const ALERTAS_VISIVEIS = 3;

export function AnalyticsAtencao({ atencao, index }: { atencao: PontoAtencao[]; index: number }) {
  const [expandido, setExpandido] = useState(false);
  const podeExpandir = atencao.length > ALERTAS_VISIVEIS;
  const visiveis = expandido || !podeExpandir ? atencao : atencao.slice(0, ALERTAS_VISIVEIS);

  /* "Ver todos" no CABEÇALHO, à direita, como na referência: abaixo da lista
     ele custava uma linha inteira (~20px) que empurrava a nota de regras e
     desalinhava a altura deste painel em relação aos vizinhos da faixa. É o
     mesmo lugar e o mesmo desenho do "Ver todas" do painel de vagas.
     Rótulo curto ("Ver todos") e contagem no `aria-label`: a contagem já está
     no subtítulo ("3 alertas") e o rótulo longo roubava largura do título. */
  const toggleLista = podeExpandir ? (
    <button
      type="button"
      aria-expanded={expandido}
      aria-label={expandido ? 'Ver menos' : `Ver todos (${atencao.length})`}
      onClick={() => setExpandido((atual) => !atual)}
      className={cn(BOTAO_VER_TODOS, 'shrink-0')}
    >
      {expandido ? 'Ver menos' : 'Ver todos'}
      <ChevronDown className={cn('h-3 w-3 transition-transform duration-200', expandido && 'rotate-180')} aria-hidden />
    </button>
  ) : undefined;

  return (
    <AnalyticsPainel
      icon={AlertTriangle}
      title="Pontos de atenção"
      /* A contagem de alertas vive no SUBTÍTULO, junto do que o painel mede, e
         não mais num selo no canto superior direito: o selo custava ~52px de
         largura e o título "Pontos de atenção" (140px) caía em reticências nos
         ~240px internos do painel. O número continua visível (é a mesma
         informação do selo), agora sem disputar espaço com o título — e o canto
         superior direito fica livre, como na referência. */
      subtitle={
        atencao.length > 0
          ? `Gargalos e riscos · ${atencao.length} ${atencao.length === 1 ? 'alerta' : 'alertas'}`
          : 'Gargalos e riscos'
      }
      tom="warning"
      index={index}
      action={toggleLista}
      /* Cabeçalho maior SÓ neste painel e no de vagas (`titleClassName` /
         `subtitleClassName`): 15px de título (18,75px reais) e 12px de subtítulo
         (15px reais), com 3px entre os dois — os dois cards da faixa de operação
         leem como um par. O casco continua em 13/10 para os outros cinco
         painéis da aba. */
      titleClassName="text-[15px] leading-[1.3]"
      subtitleClassName="mt-[3px] text-[12px] leading-[1.4]"
      /* Respiro vertical: 10px até a lista (somados aos 8px que o cabeçalho já
         deixa embaixo = 18px de projeto entre cabeçalho e primeira linha) e 14px
         até a borda inferior. O padding horizontal de 16px já vem do casco. */
      contentClassName="flex flex-col px-4 pb-3.5 pt-2.5"
    >
      {atencao.length === 0 ? (
        <div className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-[7px] border border-dashed border-success/25 bg-success/5 px-4 py-4 text-center">
          <CircleCheck className="h-5 w-5 text-success" aria-hidden />
          <p className="text-[12.5px] font-medium text-foreground/85">Nenhum gargalo crítico</p>
          <p className="max-w-[230px] text-[11.5px] leading-[1.4] text-muted-foreground">
            O funil está fluindo dentro dos limites de tempo e conversão.
          </p>
        </div>
      ) : (
        /* Cada alerta é uma LINHA independente, separada por um fio discreto
           (`divide-y divide-border/30`) e 7,5px de padding em cima e embaixo —
           15px reais entre um alerta e o seguinte (era 13,75px), com o fio no
           meio: o respiro que a referência pede entre as três linhas. `flex-1`
           nas linhas: quando o painel de vagas for mais alto, o excedente se
           reparte entre os três alertas em vez de virar um vão morto no pé do
           card. */
        <ul className="flex flex-1 flex-col divide-y divide-border/30" aria-label="Pontos de atenção do recrutamento">
          {visiveis.map((alerta) => {
            const Icone = ICONE_TIPO[alerta.tipo];
            return (
              <li
                key={alerta.id}
                className="flex min-w-0 flex-1 items-center gap-2.5 py-1.5 first:pt-0 last:pb-0"
                /* O título da linha é o texto CURTO visível; o resumo técnico
                   completo (média de permanência, nome da vaga, data, motivo)
                   vem do modelo em `alerta.detalhe` — é a leitura detalhada. */
                title={alerta.detalhe}
              >
                {/* Marcador circular de 30px de projeto (37,5px reais) na cor da
                    severidade, com 10px reais de vão até o texto: é a medida da
                    referência e a que devolve ~10px para o título do alerta caber
                    em uma linha no painel mais estreito da faixa. */}
                <span
                  className={cn(
                    'flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border',
                    ESTILO_SEVERIDADE[alerta.severidade]
                  )}
                >
                  <Icone className="h-[17px] w-[17px]" aria-hidden />
                </span>
                {/* Título (13px) e descrição (12px) em coluna, com 5px entre eles.
                    Cada um em UMA linha: `truncate` é só a rede de segurança —
                    os textos derivados agora cabem inteiros na largura do card
                    (título ≤ ~32 caracteres, descrição ≤ ~35). */}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="truncate text-[13px] font-semibold leading-[1.35] text-foreground">{alerta.titulo}</p>
                  <p className="truncate text-[12px] leading-[1.4] text-muted-foreground">{alerta.descricao}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AnalyticsPainel>
  );
}
