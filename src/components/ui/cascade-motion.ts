import type { Variants } from 'framer-motion';

/**
 * ============================================================================
 * Coreografia "cascade" — FONTE ÚNICA de toda janela que abre em cascata.
 *
 * Mora fora do componente de propósito (a regra `react-refresh/only-export-
 * components` exige que um arquivo que exporta componentes exporte SÓ eles):
 * assim `AnimatedCascadeDialog` (o popup compacto das Pendências/Próximos
 * Eventos) e as janelas GRANDES, que têm layout próprio mas precisam da MESMA
 * sensação — a de Detalhes da Admissão, por exemplo — importam os MESMOS
 * números e variants. Não existe uma segunda coreografia no sistema: mudar um
 * valor aqui move as duas juntas.
 *
 * Abertura: a caixa nasce como um quadrado pequeno "de dentro pra fora"
 * (scaleX/scaleY 0→0.16), estica as laterais até a largura final
 * (scaleX 0.16→1, altura ainda curta) e só então desce esticando a
 * altura (scaleY 0.16→1) — as três fases moram no mesmo keyframe/`times`
 * pra ficarem sincronizadas num timeline só. Aí sim o conteúdo cascateia
 * (cabeçalho primeiro, depois cada bloco).
 *
 * Fechamento: exatamente o inverso — os blocos somem em cascata de trás pra
 * frente, e só depois que o último terminar é que a caixa encolhe
 * (altura primeiro, depois largura) até virar o quadrado pequeno de novo.
 * ============================================================================
 */

/**
 * ── RÉGUA DE TEMPO (mesma do resto do sistema, ver `@theme` em src/index.css)
 * Abertura da caixa: 0,9 s (é a coreografia mais longa do sistema, de propósito
 * — três fases encadeadas). Conteúdo: entrada 0,4 s / saída 0,28 s, com 0,12 s
 * entre blocos; o véu acompanha a abertura em 0,3 s. Antes eram 0,35/0,22/0,1/
 * 0,25 — rápidos o suficiente para a cascata "piscar" em vez de ser lida.
 */
/**
 * ── MOVIMENTO REDUZIDO (importante) ───────────────────────────────────────
 * A cascata anima `scaleX/scaleY` — que o Framer Motion DESLIGA quando o
 * usuário pede "reduzir movimento" (`<MotionConfig reducedMotion="user">`). Como
 * o transform some nesse modo, a caixa depende do canal de OPACIDADE para não
 * aparecer inteira de uma vez: é ele que `cascadeShellVariants` mantém nos dois
 * estados (abertura = fade curto na 1ª fase; saída = fade no fim do
 * encolhimento). Sem esse canal, toda janela montada dentro de um
 * `<MotionConfig>` "pisca" em vez de entrar — sintoma relatado no modal "Novo
 * Desligamento" (`DesligamentosPage`, que envolve a página no `MotionConfig`).
 */

export const CASCADE_SHELL_OPEN_DURATION = 0.9;
export const CASCADE_SHELL_CLOSE_DURATION = 0.55;
export const CASCADE_ITEM_STAGGER = 0.12;
export const CASCADE_ITEM_DURATION_OUT = 0.28;
export const CASCADE_ITEM_DURATION_IN = 0.4;
export const CASCADE_OVERLAY_OPEN_DURATION = 0.3;

/**
 * ── PERFIL DE SAÍDA: o fechamento NÃO pode crescer com o tamanho da lista ────
 * A coreografia de saída é sequencial por construção (`(blocos - 1) × 0,12 s`
 * até o encolhimento da caixa começar). Isso é bonito em janelas de 3 blocos
 * (0,52 s + 0,55 s = 1,07 s) e impraticável em listas: a janela "Talentos em
 * destaque" (aba Nine-Box) abre com um bloco por talento, então 7 talentos = 8
 * blocos davam `7 × 0,12 + 0,28 + 0,55` = **1,67 s de fechamento** — e 20
 * talentos davam **3,2 s**. Relato do usuário: "demora muito pra fechar".
 *
 * O perfil é a alavanca: ele NÃO mexe na abertura (a cascata de entrada, lenta e
 * escalonada, é a assinatura aprovada do sistema) nem no fade de cada bloco;
 * mexe só no RITMO da saída e no encolhimento da caixa.
 *
 *   • `intervalo` — intervalo nominal entre blocos na saída;
 *   • `intervaloTotalMax` — TETO da soma dos intervalos: a partir daí os blocos
 *     saem juntos (é o que mantém o fechamento de uma lista longa constante);
 *   • `duracaoCaixa` — encolhimento da caixa, que só começa depois do último
 *     bloco (a ordem da coreografia é sempre conteúdo → caixa).
 */
export interface PerfilSaidaCascata {
  intervalo: number;
  intervaloTotalMax: number;
  duracaoCaixa: number;
}

/**
 * PERFIL HISTÓRICO (padrão de TODAS as janelas): `0,12 s` entre blocos, sem
 * teto, caixa em `0,55 s`. É o que o popup "Pendências", o modal "Novo
 * Desligamento", a Auditoria, as Pesquisas e os Treinamentos usam — nenhuma
 * dessas janelas mudou de comportamento com a introdução dos perfis.
 */
export const CASCADE_SAIDA_PADRAO: PerfilSaidaCascata = {
  intervalo: CASCADE_ITEM_STAGGER,
  intervaloTotalMax: Number.POSITIVE_INFINITY,
  duracaoCaixa: CASCADE_SHELL_CLOSE_DURATION,
};

/**
 * PERFIL DE SAÍDA RÁPIDA — para janelas cujo conteúdo É uma lista (um bloco por
 * linha), onde o fechamento sequencial vira espera. Números:
 *
 *   • `intervalo: 0,015 s` — os blocos saem praticamente juntos, com um resto de
 *     onda (menos de um quadro de diferença entre o 1º e o 2º); a leitura é "a
 *     lista dissolve", não "as linhas desfilam";
 *   • `intervaloTotalMax: 0,08 s` — teto da soma, então o fechamento não cresce
 *     com o número de linhas;
 *   • `duracaoCaixa: 0,26 s` — encolhimento curto: quando o conteúdo já está
 *     saindo, a caixa pode fechar na velocidade de interação da régua.
 *
 * Total: `0,08 + 0,28 + 0,26` = **0,62 s**, constante de 3 a 40 linhas (era
 * 1,67 s com 7 e 3,2 s com 20). O fade de cada bloco continua sendo o `0,28 s`
 * do sistema — o que encurta é o ESPALHAMENTO e o encolhimento.
 */
export const CASCADE_SAIDA_RAPIDA: PerfilSaidaCascata = {
  intervalo: 0.015,
  intervaloTotalMax: 0.08,
  duracaoCaixa: 0.26,
};

/** Cascata do conteúdo: cada bloco entra de baixo (`y: 8`) e desaparece para baixo. */
export const cascadeItemVariants: Variants = {
  closed: { opacity: 0, y: 8, transition: { duration: CASCADE_ITEM_DURATION_OUT, ease: 'easeIn' } },
  open: { opacity: 1, y: 0, transition: { duration: CASCADE_ITEM_DURATION_IN, ease: 'easeOut' } },
};

/**
 * Intervalo EFETIVO entre dois blocos na saída: o nominal do perfil, limitado
 * pelo teto (`intervaloTotalMax`). Com o perfil padrão o teto é infinito, então
 * o resultado é sempre `0,12 s` — o comportamento histórico, intacto.
 */
export function cascadeExitStagger(blocos: number, perfil: PerfilSaidaCascata = CASCADE_SAIDA_PADRAO): number {
  const passos = Math.max(blocos - 1, 0);
  if (passos === 0) return perfil.intervalo;
  return Math.min(perfil.intervalo, perfil.intervaloTotalMax / passos);
}

/**
 * Encadeamento dos blocos. Abrindo, eles só começam DEPOIS que a caixa terminou
 * de abrir (`delayChildren` = duração da abertura da caixa); fechando, a cascata
 * corre de trás para frente e é ela que segura a caixa de encolher cedo demais.
 *
 * A ABERTURA não depende do perfil (a cascata de entrada é a assinatura do
 * sistema); só o `closed` muda. O objeto do perfil padrão é JSON-idêntico ao
 * `cascadeContainerVariants` histórico (os testes de paridade comparam os
 * variants por `JSON.stringify`).
 */
export function cascadeContainerVariantsPara(
  blocos: number,
  perfil: PerfilSaidaCascata = CASCADE_SAIDA_PADRAO
): Variants {
  return {
    closed: { transition: { staggerChildren: cascadeExitStagger(blocos, perfil), staggerDirection: -1 } },
    open: { transition: { staggerChildren: CASCADE_ITEM_STAGGER, delayChildren: CASCADE_SHELL_OPEN_DURATION } },
  };
}

/**
 * O encadeamento do sistema, no perfil padrão. Continua sendo um `const`
 * exportado porque ~30 arquivos (e os testes de paridade) o importam; janelas
 * com perfil próprio usam `cascadeContainerVariantsPara(blocos, perfil)`.
 */
export const cascadeContainerVariants: Variants = cascadeContainerVariantsPara(3);

/** Quanto tempo a cascata de `blocos` leva para sumir (sem contar a caixa). */
function cascadeExitContentDuration(blocos: number, perfil: PerfilSaidaCascata): number {
  const passos = Math.max(blocos - 1, 0);
  return passos * cascadeExitStagger(blocos, perfil) + CASCADE_ITEM_DURATION_OUT;
}

/**
 * Duração TOTAL da saída: a cascata dos blocos + o encolhimento da caixa. O
 * véu usa este número para desaparecer no mesmo compasso (e não antes de a
 * janela terminar de sair).
 */
export function cascadeCloseDuration(blocos: number, perfil: PerfilSaidaCascata = CASCADE_SAIDA_PADRAO): number {
  return cascadeExitContentDuration(blocos, perfil) + perfil.duracaoCaixa;
}

/**
 * A caixa. `blocos` é quantos pedaços cascateiam antes de a caixa encolher
 * (cabeçalho + corpo + rodapé = 3, no modal de detalhes; cabeçalho + N itens,
 * no popup) — é desse número que sai o `delay` da saída.
 *
 * `perfil` só afeta o FECHAMENTO (delay e duração do encolhimento); a abertura
 * é a mesma em qualquer perfil.
 *
 * IMPORTANTE: quem anima `scaleX/scaleY` NÃO pode ter `scale-*` do Tailwind no
 * mesmo elemento; a centralização vai por `translate-x/y` (que no Tailwind v4 é
 * a propriedade `translate`, não `transform`) e por isso não briga com o
 * `transform` que o Framer escreve.
 */
export function cascadeShellVariants(blocos: number, perfil: PerfilSaidaCascata = CASCADE_SAIDA_PADRAO): Variants {
  return {
    closed: {
      // Canal de OPACIDADE (ver "MOVIMENTO REDUZIDO" no topo do arquivo). Na
      // saída ele só cai depois da 1ª fase — quando a caixa já está com 16% da
      // altura e some rápido —, então o encolhimento continua legível.
      opacity: [1, 1, 0, 0],
      scaleX: [1, 1, 0.16, 0],
      scaleY: [1, 0.16, 0.16, 0],
      transition: {
        duration: perfil.duracaoCaixa,
        times: [0, 0.4, 0.75, 1],
        ease: 'easeInOut',
        delay: cascadeExitContentDuration(blocos, perfil),
      },
    },
    open: {
      // `opacity` em keyframe: a caixa fica 100% visível ao fim da 1ª fase
      // (22% da abertura). Com movimento normal é imperceptível — nesse instante
      // ela ainda tem 16% do tamanho e está crescendo. Com movimento REDUZIDO é
      // este canal que faz a janela ENTRAR EM FADE em vez de aparecer inteira de
      // uma vez (o Framer desliga `scaleX/scaleY`, nunca a opacidade).
      opacity: [0, 1, 1, 1],
      scaleX: [0, 0.16, 1, 1],
      scaleY: [0, 0.16, 0.16, 1],
      transition: { duration: CASCADE_SHELL_OPEN_DURATION, times: [0, 0.22, 0.6, 1], ease: 'easeInOut' },
    },
  };
}

/** Véu por trás: entra rápido, sai junto com a saída inteira da janela. */
export function cascadeOverlayVariants(blocos: number, perfil: PerfilSaidaCascata = CASCADE_SAIDA_PADRAO): Variants {
  return {
    closed: { opacity: 0, transition: { duration: cascadeCloseDuration(blocos, perfil), ease: 'easeInOut' } },
    open: { opacity: 1, transition: { duration: CASCADE_OVERLAY_OPEN_DURATION } },
  };
}
