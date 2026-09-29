import { AnimatePresence, motion } from 'framer-motion';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { makeRevealVariants, type RevealWave } from '@/components/organograma/organogramaReveal';

interface OrganogramaRevealBlockProps {
  /** `true` = bloco aberto (montado); `false` = bloco saiu (com a transição reversa). */
  open: boolean;
  /**
   * Onde o bloco está na onda (`buildRevealWave`, em @/lib/organogramaTree) e
   * quantos itens ele revela. É o que decide a espera da abertura (slot `open`),
   * a do fechamento (slot `close`, mais a janela dos itens) e a saída de cada
   * item. Omitido, vale tudo 0 — bloco sem onda e sem item, o comportamento de
   * um bloco solto: abre na hora e não espera ninguém pra encolher.
   */
  wave?: RevealWave;
  children: ReactNode;
}

/**
 * Canal de presença do bloco. Ele existe porque o `AnimatePresence` CONGELA a
 * subárvore que está saindo: quando o bloco é desmontado, os filhos que ele já
 * tinha renderizado (o conteúdo, com as rows dentro) são re-renderizados com as
 * props de ANTES — inclusive um `open` que já virou `false`. Prop nova não chega
 * nesse pedaço, mas mudança de CONTEXTO chega (o React re-renderiza qualquer
 * consumidor de contexto, mesmo dentro de uma subárvore que não re-renderiza por
 * props). É por esse canal que um bloco saindo conta pro conteúdo que ele fechou,
 * e assim as rows rodam a PRÓPRIA saída antes de o vão encolher.
 *
 * Um contexto por INSTÂNCIA de bloco (criado dentro do componente, não no
 * módulo) porque cada bloco tem o próprio `open` — e o provider fica FORA do
 * `AnimatePresence`, que é justamente o que o mantém fora do congelamento.
 */
const BlockPresenceOpen = createContext(false);

/**
 * O conteúdo do bloco. Fora do `AnimatePresence` do bloco ele seria congelado
 * junto (é o caso acima); aqui dentro ele lê o canal de presença e é ele quem
 * carrega o `AnimatePresence` interno que dá saída às rows.
 *
 * O `AnimatePresence` interno é o de antes, com o mesmo papel: uma presença LOCAL
 * devolve o keyframe inicial a quem entra DENTRO de um bloco que nasceu aberto (o
 * `initial={false}` do de fora vale só para o primeiro render dele). Ele não
 * renderiza DOM: layout e espaçamento seguem idênticos.
 */
function BlockContent({ children }: { children: ReactNode }) {
  const open = useContext(BlockPresenceOpen);

  return <AnimatePresence>{open && children}</AnimatePresence>;
}


/**
 * Revelação de altura dos blocos do Organograma: `height` + `opacity` com
 * `AnimatePresence`, o mesmo desenho que o app já usa para conteúdo de altura
 * variável (`layout/EmpresaSelector.tsx`, `ui/sync-error-state.tsx`,
 * `LocaisTrabalhoPage.tsx`).
 *
 * `AnimatePresence` é o que torna possível ANIMAR A SAÍDA: sem ele, recolher um
 * departamento desmontaria o bloco no mesmo frame do clique (o salto de layout
 * que este trabalho veio corrigir). Com ele, o bloco fica montado durante a
 * transição e só sai no fim — por isso abrir/fechar deixam de ser instantâneos.
 *
 * `initial={false}` é o que separa "layout inicial" de "interação", sem flag
 * nenhuma vinda de fora: a própria Motion sabe quando é o PRIMEIRO render deste
 * `AnimatePresence` e, nesse caso, pula o keyframe do bloco que já está aberto.
 * Como a árvore monta com raízes e 1º nível expandidos (`getDefaultExpandedIds`,
 * em OrganogramaPage), esse conteúdo é o layout da página — abrir "na frente do
 * usuário" ali seria um salto de layout de graça. Qualquer abertura POSTERIOR
 * (clique na row, "Expandir tudo", busca) já é um filho novo deste
 * `AnimatePresence` e entra animando do `initial="collapsed"`. E, como o
 * `initial={false}` só vale para os filhos do primeiro render, ele não
 * interfere na saída de ninguém.
 *
 * O `AnimatePresence` INTERNO (sem props) existe por causa do `initial={false}`
 * acima: o contexto de presença chega a qualquer `motion.*` descendente, então
 * com `initial={false}` a cascata das rows que entram DENTRO do bloco também
 * perderia o keyframe (é o mesmo caso já documentado e contornado em
 * OrganogramaTree.tsx). Uma presença local, com o padrão de volta (`initial`
 * true), devolve a cascata a quem está lá dentro — a supressão vale só para o
 * bloco em si. Ele não renderiza DOM: layout e espaçamento seguem idênticos.
 *
 * `overflow-hidden` é a única classe do wrapper (o `height` anima de 0 até
 * `'auto'`, então o conteúdo precisa ser recortado enquanto o bloco encolhe —
 * durante a animação E depois dela). Ela NÃO altera layout, cor nem espaçamento:
 * sem padding/margem, o wrapper mede exatamente o que o bloco mede — todo o
 * recuo da árvore (o `pl-4`/`pb-1.5` dos subdepartamentos, o `ml-4`/`pl-4` dos
 * colaboradores) continua nos blocos internos, que seguem intocados, e o que
 * estiver nas bordas (o tronco vertical, o ramal horizontal, o anel de foco das
 * rows) já está dentro desses recuos.
 *
 * `wave` é a onda: o preset é resolvido a partir dela (`makeRevealVariants`) e o
 * fechamento espera a janela dos itens (`cascadeItemsSpan`) antes de encolher —
 * primeiro sai o conteúdo, depois o vão fecha. Sem isso, "Expandir tudo"/
 * "Recolher tudo" abriam/fechavam TODOS os blocos no mesmo frame — uma parede
 * crescendo (ou desabando) junta, sem hierarquia. Quem decide a ordem das duas
 * filas é `buildRevealWave` (@/lib/organogramaTree); aqui só se consome o slot.
 *
 * A cascata de ENTRADA das rows NÃO passa por aqui: cada row continua com o
 * próprio `motion.div` e o preset de organogramaCascade.ts (a SAÍDA dela também).
 * Este componente envolve só o bloco, então o que era animado em cascata continua
 * animando em cascata dentro de um bloco que abre.
 */
export function OrganogramaRevealBlock({ open, wave, children }: OrganogramaRevealBlockProps) {
  // Memoizado pelos CAMPOS da onda (e não pelo objeto): a árvore re-renderiza a
  // cada clique (o estado de expansão vive na página) e a Motion não precisa de um
  // objeto de variants novo a cada um desses renders pra chegar no mesmo alvo.
  const { open: openSlot = 0, close: closeSlot = 0, items = 0 } = wave || {};
  const variants = useMemo(
    () => makeRevealVariants({ open: openSlot, close: closeSlot, items }),
    [openSlot, closeSlot, items]
  );

  return (
    <BlockPresenceOpen.Provider value={open}>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="reveal"
            variants={variants}
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            className="overflow-hidden"
          >
            <BlockContent>{children}</BlockContent>
          </motion.div>
        )}
      </AnimatePresence>
    </BlockPresenceOpen.Provider>
  );
}
