import { Globe, Tag, UserCheck, type LucideIcon } from 'lucide-react';
import type { OrigemRanking } from './analyticsComum';
import { AnalyticsPainel } from './AnalyticsPainel';
import { PreenchimentoBarraAnalytics } from './barraProgressoAnalytics';
import { LogotipoGupy, LogotipoIndeed, LogotipoLinkedin, type LogotipoOrigem } from './OrigemLogotipo';
import { GRADIENTES_ORIGEM, SUPERFICIE_SUAVE, TRILHA_BARRA_INLINE } from './analyticsVisual';
import { slotSequencial } from '@/components/ui/entradaGlobal';
import { useEntradaCardConcluida } from '@/hooks/useEntradaCardConcluida';
import { useMovimentoReduzido } from '@/lib/motionMode';

/**
 * PRINCIPAIS ORIGENS — ranking de captação derivado de `candidatos.origem`.
 *
 * Cada linha tem marcador colorido (tokens do sistema), nome, volume,
 * participação e barra — tudo no MESMO eixo, como na referência. Não há origem
 * fixa: o que a base tiver aparece aqui, inclusive "Não informada". O tom de
 * cada linha só ordena a leitura visual — não carrega semântica de desempenho.
 *
 * MARCADOR: quadrado arredondado de 25px com a cor da linha e, dentro, a marca
 * da plataforma (`OrigemLogotipo.tsx`, SVG local) em branco. Site, Indicação e
 * qualquer origem sem marca continuam com o ícone do sistema — o mesmo de
 * antes —, então a lista nunca fica sem símbolo.
 *
 * ATENÇÃO ao formato dos tokens: aqui eles são o NOME da variável SEM o prefixo
 * `--` (o prefixo entra no `var(--${token})`). Quando a lista trazia o prefixo,
 * o CSS saía como `var(----info)` — inválido — e o ícone/barra de cada origem
 * ficavam sem cor nenhuma (ícones brancos, barras vazias).
 *
 * BARRA: deixou de ser um `span` CSS pintado já cheio. O preenchimento é
 * `PreenchimentoBarraAnalytics`, que aplica o gradiente da plataforma
 * (`GRADIENTES_ORIGEM`) e a MESMA coreografia do card "Amplitude de Liderança"
 * — 0 → percentual real, `easeOut`, 1,2 s, em cascata de 0,15 s + 0,1 s por
 * linha, uma única vez na entrada do painel. Altura, largura, trilho escuro,
 * cantos e espaçamento não mudaram.
 */
const PALETA_ORIGENS = ['info', 'chart-4', 'warning', 'chart-5', 'success', 'aqua', 'primary'] as const;

/** Origem genérica (sem marca própria) → ícone do sistema, como antes. */
const ICONES_ORIGEM: { chave: string; icone: LucideIcon }[] = [
  { chave: 'site', icone: Globe },
  { chave: 'indicacao', icone: UserCheck },
];

/**
 * Plataformas com marca própria → SVG local (`OrigemLogotipo.tsx`). A busca é
 * por `includes` na chave normalizada, então "LinkedIn BR" e "gupy.com" caem no
 * mesmo símbolo. O que não estiver aqui usa o ícone de `ICONES_ORIGEM`.
 */
const LOGOTIPOS_ORIGEM: { chave: string; Logotipo: LogotipoOrigem }[] = [
  { chave: 'linkedin', Logotipo: LogotipoLinkedin },
  { chave: 'indeed', Logotipo: LogotipoIndeed },
  { chave: 'gupy', Logotipo: LogotipoGupy },
];

function normalizar(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function iconeDaOrigem(origem: string): LucideIcon {
  const chave = normalizar(origem);
  return ICONES_ORIGEM.find((item) => chave.includes(item.chave))?.icone ?? Tag;
}

function logotipoDaOrigem(origem: string): LogotipoOrigem | null {
  const chave = normalizar(origem);
  return LOGOTIPOS_ORIGEM.find((item) => chave.includes(item.chave))?.Logotipo ?? null;
}

/**
 * GRADIENTE DE CADA ORIGEM — a identidade cromática da PLATAFORMA, não a
 * posição na lista.
 *
 * A busca é a mesma dos logotipos (`includes` na chave normalizada), então
 * "LinkedIn BR" e "linkedin.com" caem no azul do LinkedIn mesmo que a base
 * tenha mudado a ordem do ranking. Sem isso, a cor da barra dependeria do
 * índice e a mesma origem mudaria de cor de um recorte para outro.
 */
const ORIGENS_COM_GRADIENTE: { chave: string; gradiente: string }[] = [
  { chave: 'linkedin', gradiente: GRADIENTES_ORIGEM.azul },
  { chave: 'indeed', gradiente: GRADIENTES_ORIGEM.roxo },
  { chave: 'gupy', gradiente: GRADIENTES_ORIGEM.ambar },
  { chave: 'indicacao', gradiente: GRADIENTES_ORIGEM.rosa },
  { chave: 'site', gradiente: GRADIENTES_ORIGEM.verde },
];

/**
 * Origem SEM marca conhecida ("Não informada", "Outros", cadastro livre) usa o
 * gradiente do TOKEN que já pinta o marcador daquela linha (`PALETA_ORIGENS`):
 * a barra nunca fica sem degradê e continua combinando com o ícone ao lado.
 * `aqua` cai na família verde e `primary` (lima) na âmbar — os dois degraus
 * aprovados mais próximos do matiz do token.
 */
const GRADIENTE_POR_TOKEN: Record<string, string> = {
  info: GRADIENTES_ORIGEM.azul,
  'chart-4': GRADIENTES_ORIGEM.roxo,
  warning: GRADIENTES_ORIGEM.ambar,
  'chart-5': GRADIENTES_ORIGEM.rosa,
  success: GRADIENTES_ORIGEM.verde,
  aqua: GRADIENTES_ORIGEM.verde,
  primary: GRADIENTES_ORIGEM.ambar,
};

function gradienteDaOrigem(origem: string, token: string): string {
  const chave = normalizar(origem);
  return (
    ORIGENS_COM_GRADIENTE.find((item) => chave.includes(item.chave))?.gradiente ??
    GRADIENTE_POR_TOKEN[token] ??
    GRADIENTES_ORIGEM.azul
  );
}

export function AnalyticsOrigens({ origens, index }: { origens: OrigemRanking[]; index: number }) {
  /**
   * BARRAS — quando o preenchimento pode correr.
   *
   * Gatilho ÚNICO, monotônico e igual ao do painel vizinho (Evolução): a
   * entrada do card pela régua global precisa TERMINAR antes de a primeira
   * barra sair de 0 (`useEntradaCardConcluida`, alimentado pelo
   * `onAnimationComplete` real do `MotionCard` desta aba). Sem essa espera o
   * preenchimento aconteceria escondido atrás do fade do card — o usuário
   * veria as barras já cheias, e não o movimento.
   *
   * Sem `useInView` de propósito: o painel desta aba monta no mesmo commit da
   * navegação (a aba já está em tela quando o usuário clica), e a barra em 0
   * não é um artefato visual — é o estado inicial natural de uma barra.
   *
   * Movimento reduzido: `animar` nasce `true` e cada barra é montada já no
   * comprimento final (`initial: false`), sem espera e sem varredura.
   */
  const reduzirMovimento = useMovimentoReduzido();
  const { entradaConcluida, aoConcluirEntrada } = useEntradaCardConcluida(index, slotSequencial);
  const animar = reduzirMovimento || entradaConcluida;

  const totalTop3 = origens.slice(0, 3).reduce((soma, origem) => soma + origem.percentual, 0);
  const top3 = Math.round(totalTop3 * 10) / 10;

  // O subtítulo não repete a contagem ("· 5 origens"): a lista logo abaixo já
  // mostra todas as origens e o texto maior estourava a coluna mais estreita
  // da faixa (medido em 1440 — "De onde vêm os candidatos" pedia 164px numa
  // caixa de 160px).
  return (
    <AnalyticsPainel
      icon={Globe}
      title="Principais origens"
      subtitle="Origem dos candidatos"
      tom="chart4"
      index={index}
      aoConcluirEntrada={aoConcluirEntrada}
    >
      {origens.length === 0 ? (
        <div
          className={`flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl px-4 py-8 text-center ${SUPERFICIE_SUAVE}`}
        >
          <Globe className="h-5 w-5 text-muted-foreground/40" aria-hidden />
          <p className="text-[12px] font-medium text-foreground/80">Nenhuma origem registrada</p>
          <p className="max-w-[210px] text-[10.5px] leading-snug text-muted-foreground">
            A origem é preenchida no cadastro do candidato.
          </p>
        </div>
      ) : (
        <ol className="space-y-1.5" aria-label="Ranking de origens de candidatos">
          {origens.map((origem, indice) => {
            const token = PALETA_ORIGENS[indice % PALETA_ORIGENS.length];
            const Icone = iconeDaOrigem(origem.origem);
            const Logotipo = logotipoDaOrigem(origem.origem);
            return (
              <li
                key={origem.origem}
                className="flex min-w-0 items-center gap-1"
                title={`${origem.origem}: ${origem.total} ${origem.total === 1 ? 'candidato' : 'candidatos'} (${origem.percentual.toFixed(1).replace('.', ',')}%)`}
              >
                {/* Marcador de 30px reais: quadrado arredondado com a cor da linha
                    e a marca da plataforma dentro (SVG local em `currentColor`,
                    daí o `text-white`). É o "logotipo pequeno" da referência sem
                    imagem externa; sem marca, cai no ícone do sistema. */}
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white"
                  style={{ background: `hsl(var(--${token}))` }}
                >
                  {Logotipo ? <Logotipo className="h-3.5 w-3.5" /> : <Icone className="h-3.5 w-3.5" aria-hidden />}
                </span>

                {/* UMA linha — marca · nome · volume · barra · participação —, como
                    na referência. As colunas de volume (`w-5`) e participação
                    (`w-8`) são fixas, então todas as barras começam e terminam no
                    mesmo x e o olho compara comprimentos. A barra fica com um
                    pedaço MAIOR da sobra (`flex-[1.15]` contra `flex-1` do nome):
                    é ela que precisa de largura para o preenchimento ser legível —
                    com as duas em partes iguais o trilho caía para ~68px e a barra
                    de 25% virava um traço. Com ~70px de trilho o comprimento volta
                    a ser comparável entre as linhas. O nome desce para 10px
                    (12,5px reais) para "Indicação" (59px) caber nos ~61px que
                    sobram; o que passar cai em reticências SEM empurrar barra,
                    volume ou percentual. */}
                <span className="min-w-0 flex-1 truncate text-[10px] text-foreground/85" title={origem.origem}>
                  {origem.origem}
                </span>
                <span className="w-5 shrink-0 text-right text-[11px] font-semibold tabular-nums text-foreground/75">
                  {origem.total}
                </span>
                <span aria-hidden className={`min-w-0 flex-[1.15] ${TRILHA_BARRA_INLINE}`}>
                  {/* Preenchimento com o gradiente da ORIGEM (não do índice) e
                      a cascata do card "Amplitude de Liderança". O piso de 3%
                      continua: uma participação de 1,1% precisa de um traço
                      visível para não parecer trilho vazio — o percentual
                      escrito à direita é o dado, a barra é a leitura rápida. */}
                  <PreenchimentoBarraAnalytics
                    percentual={Math.min(100, Math.max(3, origem.percentual))}
                    indice={indice}
                    gradiente={gradienteDaOrigem(origem.origem, token)}
                    animar={animar}
                    reduzirMovimento={reduzirMovimento}
                  />
                </span>
                <span className="w-8 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
                  {origem.percentual.toFixed(1).replace('.', ',')}%
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {origens.length > 0 && (
        <p className="mt-auto pt-2 text-[10.5px] leading-snug text-muted-foreground">
          As {Math.min(3, origens.length)} principais origens concentram{' '}
          <span className="font-semibold text-foreground">{top3.toFixed(1).replace('.', ',')}%</span> da base.
        </p>
      )}
    </AnalyticsPainel>
  );
}
