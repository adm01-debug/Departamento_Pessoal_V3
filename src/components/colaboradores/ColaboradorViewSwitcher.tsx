import { useId } from 'react';
import { LayoutGroup, motion, type Transition } from 'framer-motion';
import { Table2, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useMovimentoReduzido } from '@/lib/motionMode';

export type ColaboradorViewMode = 'tabela' | 'diretorio';

interface ColaboradorViewSwitcherProps {
  value: ColaboradorViewMode;
  onChange: (mode: ColaboradorViewMode) => void;
}

/**
 * MOLA DO SELETOR — física de mola de alta fidelidade, exatamente a calibração
 * aprovada para este controle:
 *
 *   stiffness 380 → ~21,8 rad/s de frequência natural: o movimento parte no
 *                   primeiro frame após o clique (sem rampa de aceleração
 *                   linear, que é o que dá a sensação de "travar" no início);
 *   damping 30    → ζ ≈ 0,86: passa ~1% do alvo (um "respiro" de 0,4 px,
 *                   imperceptível como overshoot) e assenta em ~0,33 s;
 *   mass 0.8      → inércia baixa: frenagem elegante, sem "borracha".
 *
 * A MESMA transição governa posição E largura da pílula (o `layoutId` mede a
 * caixa inteira), então ela chega ao destino como um bloco só — nunca
 * "esticando atrás" do próprio eixo.
 */
const MOLA_VISUALIZACAO: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 30,
  mass: 0.8,
};

/**
 * Versão atenuada para `prefers-reduced-motion`: mesmo deslize, sem overshoot e
 * curto o bastante para não incomodar. Um `duration: 0` faria a pílula "pular"
 * de um botão para o outro, quebrando a leitura de continuidade.
 */
const TRANSICAO_REDUZIDA: Transition = { duration: 0.18, ease: 'easeOut' };

/**
 * Opções do seletor. Ícones e rótulos são os ORIGINAIS — a única mudança é que
 * o destaque deixou de ser um par de classes aplicado condicionalmente ao botão
 * ativo e virou um bloco animado dedicado.
 */
const OPCOES = [
  { value: 'tabela', label: 'Tabela', Icon: Table2 },
  { value: 'diretorio', label: 'Diretório', Icon: LayoutGrid },
] as const;

/**
 * Skin do gatilho — geometria IDÊNTICA à anterior (`h-8 rounded-lg gap-1.5
 * px-3`, texto herdando `text-xs` do `size="sm"`).
 *
 * Notas de engenharia:
 *   • `relative` é o que torna o botão a referência do posicionamento da pílula
 *     absoluta (`-inset-px`), que assim cobre exatamente a caixa da borda do
 *     botão (ele tem `border border-transparent`, 1 px);
 *   • NADA de `overflow-hidden`: a pílula precisa poder sair do botão de origem
 *     e atravessar o vão até o destino — cortar o overflow transformaria o
 *     slide num wipe;
 *   • no ativo, `hover:bg-transparent` impede o retângulo cinza do variant
 *     `ghost` de aparecer por baixo do preenchimento translúcido da pílula;
 *   • `z-0` (ativo) / `z-10` (inativo) resolvem o empilhamento ENTRE os dois
 *     botões — ver o bloco CAMADAS no doc do componente abaixo.
 */
const BOTAO_BASE = 'group relative h-8 rounded-lg gap-1.5 px-3 border border-transparent bg-transparent shadow-none';

/**
 * Controle visual Tabela/Diretório — ver `ColaboradorDirectoryGrid` para a
 * grade de cards renderizada quando `value === 'diretorio'`.
 *
 * ANIMAÇÃO (pílula flutuante / sliding background badge)
 * ──────────────────────────────────────────────────────
 * 1. Só o botão ATIVO renderiza o `motion.span` absoluto com `layoutId`. Como o
 *    `layoutId` é compartilhado entre as duas opções, o Framer Motion mede a
 *    caixa do elemento antigo e a do novo no MESMO commit (troca de estado) e
 *    faz o FLIP: o fundo não desaparece de um lado para reaparecer no outro —
 *    ele DESLIZA, interpolando posição e largura com a mola acima.
 * 2. Sem `AnimatePresence` de propósito: o nó antigo morre no mesmo commit em
 *    que o novo nasce, então nunca existem dois elementos com o mesmo
 *    `layoutId` na árvore (era o que transformava o slide em crossfade no
 *    padrão `mode="wait"`).
 * 3. O destaque é um ELEMENTO DEDICADO e animado — nunca um par de classes
 *    (`border-primary bg-primary/10`) aplicado condicionalmente ao botão ativo,
 *    que trocaria de lado instantaneamente.
 * 4. `motion.span` e não `motion.div`: com posicionamento absoluto o `span` já
 *    se comporta como bloco, e `<div>` dentro de `<button>` seria HTML
 *    inválido (o botão só aceita conteúdo de fraseado).
 *
 * ESCOPO DO `layoutId`
 * ────────────────────
 * O id recebe um sufixo de `useId()` e fica fechado por um `LayoutGroup` com o
 * mesmo escopo. Com um literal fixo, DUAS instâncias montadas ao mesmo tempo
 * (ex.: card de filtros + barra fixa) colidiam no registro global do Framer —
 * medido no navegador, a primeira pílula era deslocada 82 px no eixo Y e o
 * slide ficava imprevisível. O prefixo `visualizacaoAtiva` é mantido.
 *
 * CAMADAS (o ponto delicado deste componente): a pílula é filha do botão ATIVO,
 * e os dois botões são irmãos. Sem z-index explícito, o botão ativo pinta
 * depois do inativo (ordem de DOM) e a pílula passaria POR CIMA do rótulo
 * vizinho durante o trajeto. Por isso os botões recebem z-index explícito: o
 * ativo fica em `z-0` e o inativo em `z-10`. Resultado:
 *
 *   1. dentro do botão ativo — ícone + rótulo num único span `relative z-10`
 *      vencem a pílula (`z-0`) e ficam sempre acima dela;
 *   2. entre os botões — a pílula (dentro do ativo, `z-0`) passa POR BAIXO do
 *      botão inativo (`z-10`), cujo fundo é transparente: o rótulo dele
 *      continua legível e sem piscar enquanto a pílula atravessa.
 *
 * A cor do conteúdo transiciona em CSS por 300 ms `ease-out`, praticamente a
 * mesma janela do assentamento da mola (~330 ms): texto e fundo chegam juntos.
 * No modo de movimento reduzido o deslize encurta para 180 ms, mas o fade de
 * cor continua em 300 ms — é opacidade/tinta, não deslocamento, então não
 * reintroduz a sensação de movimento que o usuário pediu para atenuar.
 *
 * MOVIMENTO REDUZIDO: a decisão vem de `useMovimentoReduzido()` — a fonte única
 * do app (`lib/motionMode.ts`). Aqui ela é obrigatória porque a página de
 * Colaboradores NÃO está dentro de um `<MotionConfig>`: sem essa consulta, o
 * Framer não teria como saber da preferência de acessibilidade do usuário.
 *
 * O modo reduzido NÃO zera a animação (um `duration: 0` faria a pílula "pular"
 * de lado, perdendo a leitura de continuidade): ele troca a mola com overshoot
 * por um deslize curto e sem bounce — o mesmo trajeto, só que imediato e
 * linear na percepção. O movimento é horizontal, curto (~110 px), sem escala e
 * sem paralaxe, então essa versão atenuada já atende quem pediu menos
 * movimento.
 */

export function ColaboradorViewSwitcher({ value, onChange }: ColaboradorViewSwitcherProps) {
  // Escopo único por instância (ver "ESCOPO DO layoutId" acima).
  const escopo = useId();
  const layoutId = `visualizacaoAtiva-${escopo}`;
  const movimentoReduzido = useMovimentoReduzido();
  const transition = movimentoReduzido ? TRANSICAO_REDUZIDA : MOLA_VISUALIZACAO;

  return (
    <LayoutGroup id={`grupo-visualizacao-${escopo}`}>
      <div
        role="group"
        aria-label="Modo de visualização"
        data-grupo-visualizacao={escopo}
        className="flex items-center gap-1 p-1 rounded-xl border border-border/40 bg-card/50"
      >
        {OPCOES.map(({ value: modo, label, Icon }) => {
          const ativo = value === modo;

          return (
            <Button
              key={modo}
              type="button"
              size="sm"
              variant="ghost"
              className={cn(
                BOTAO_BASE,
                ativo ? 'z-0 hover:bg-transparent' : 'z-10 text-muted-foreground hover:bg-accent'
              )}
              onClick={() => onChange(modo)}
              aria-pressed={ativo}
            >
              {/* PÍLULA DESLIZANTE: elemento dedicado, presente só no ativo. */}
              {ativo && (
                <motion.span
                  data-pilula-visualizacao
                  aria-hidden="true"
                  layoutId={layoutId}
                  transition={transition}
                  className="pointer-events-none absolute -inset-px z-0 rounded-lg border border-primary bg-primary/10"
                />
              )}
              <span
                className={cn(
                  'relative z-10 inline-flex items-center gap-1.5 transition-colors duration-300 ease-out',
                  ativo ? 'text-primary' : 'text-muted-foreground group-hover:text-accent-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {label}
              </span>
            </Button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
