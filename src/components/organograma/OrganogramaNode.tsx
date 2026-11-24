import { motion } from 'framer-motion';
import { DepartmentRow } from '@/components/organograma/DepartmentRow';
import { EmployeeRow } from '@/components/organograma/EmployeeRow';
import { OrganogramaRevealBlock } from '@/components/organograma/OrganogramaRevealBlock';
import { cascadeVariants, type CascadeOrder } from '@/components/organograma/organogramaCascade';
import {
  revealItemExitDelay,
  type RevealWave,
} from '@/components/organograma/organogramaReveal';
import { cn } from '@/lib/utils';
import type { OrgDepartamento, RevealWaveIndex } from '@/lib/organogramaTree';

interface OrganogramaNodeProps {
  node: OrgDepartamento;
  level: number;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  /**
   * Posição de cada row (departamento e colaborador) na cascata de entrada —
   * ver `buildCascadeIndex` em `@/lib/organogramaTree`. É o que faz a raiz
   * entrar primeiro, os subdepartamentos na sequência e os colaboradores por
   * último, cada um um pouco depois do anterior.
   */
  cascadeIndex: Map<string, number>;
  /**
   * Onde os BLOCOS da árvore estão na onda de abrir/fechar — ver
   * `buildRevealWave` em `@/lib/organogramaTree`. O nó consulta o slot do PRÓPRIO
   * departamento (`slots.get(node.id)`): o de abertura é diferente para o bloco
   * de subdepartamentos (`open`) e o de colaboradores (`trailing`, depois de toda
   * a subárvore); o de fechamento (`close`) é o mesmo para os dois, porque os dois
   * saem no mesmo passo do nível. O índice inteiro desce para os filhos, que
   * consultam o slot deles.
   */
  waveIndex?: RevealWaveIndex;
}

export function OrganogramaNode({
  node,
  level,
  expandedIds,
  onToggle,
  cascadeIndex,
  waveIndex,
}: OrganogramaNodeProps) {
  const expanded = expandedIds.has(node.id);
  const colaboradores = node.colaboradores || [];
  const subDepartamentos = node.sub_departamentos || [];
  const isRoot = level === 0;
  const wave = waveIndex?.slots.get(node.id);

  // Row sem posição conhecida (fora da árvore visível) cai no primeiro lugar:
  // nada desaparece, só entra junto com o item de índice 0.
  const cascadePosition = (id: string) => cascadeIndex.get(id) ?? 0;

  const showSubDepartamentos = expanded && subDepartamentos.length > 0;
  const showColaboradores = expanded && colaboradores.length > 0;
  const showEmptyMessage = expanded && colaboradores.length === 0 && subDepartamentos.length === 0;

  // A onda de cada bloco: o slot na fila (`buildRevealWave`) + quantos itens o
  // bloco revela quando está aberto. O bloco usa os dois: o slot pra esperar a
  // vez e a contagem pra só encolher depois que o conteúdo saiu.
  const subBlockWave: RevealWave = {
    open: wave?.open ?? 0,
    close: wave?.close ?? 0,
    items: subDepartamentos.length,
  };
  const colabBlockWave: RevealWave = {
    open: wave?.trailing ?? 0,
    close: wave?.close ?? 0,
    items: colaboradores.length,
  };
  // A mensagem de vazio ocupa o lugar dos subdepartamentos (é o que aparece no
  // vão deles) e é um item só.
  const emptyBlockWave: RevealWave = { open: wave?.open ?? 0, close: wave?.close ?? 0, items: 1 };

  /**
   * Ordem do item na SAÍDA: 0 é o ÚLTIMO item do bloco (o primeiro a sair) e
   * `itens − 1` é o primeiro. O atraso já vem resolvido do preset (inclui o passo
   * da onda do bloco).
   */
  const exitOrder = (blockWave: RevealWave, index: number, total: number): CascadeOrder => ({
    exit: revealItemExitDelay(blockWave, total - 1 - index),
  });

  return (
    <div>
      {/* Departamentos e subdepartamentos ficam em um bloco com moldura própria;
          colaboradores são deliberadamente renderizados fora dele (abaixo),
          como rows soltas, para não virarem "card".
          Esta moldura e os traços vertical (tronco) e horizontal (ramal) dos
          colaboradores não declaram mais espessura nem cor: os três consomem
          `--organograma-line-width` e `--organograma-line-color` através das
          classes `.organograma-*` de src/index.css. Era essa divergência — 2px
          repetido em cada className mais molduras em `muted-foreground/30` e
          `/50` contra traços em `muted-foreground` cheio — que dava peso visual
          diferente a linhas geometricamente idênticas. Raiz e subdepartamento
          seguem distinguíveis pelo preenchimento, não pela linha. */}
      <div className={cn('organograma-frame rounded-lg overflow-hidden', isRoot ? 'bg-muted/15' : 'bg-background/70')}>
        {/* A cascata entra por um wrapper próprio (div sem estilo nenhum): a
            DepartmentRow continua intacta — mesmo grid, mesmas alturas,
            mesmas cores. Como só `transform` (x) e `opacity` animam, nada
            aqui sai do fluxo nem interfere no clique que expande/recolhe. */}
        <motion.div
          variants={cascadeVariants}
          initial="hidden"
          animate="visible"
          custom={{ enter: cascadePosition(node.id) }}
        >
          <DepartmentRow
            nome={node.nome}
            isRoot={isRoot}
            expanded={expanded}
            onToggle={() => onToggle(node.id)}
            colaboradoresCount={colaboradores.length}
            subDepartamentosCount={subDepartamentos.length}
          />
        </motion.div>

        {/* Bloco de subdepartamentos: abre/fecha com altura + opacidade
            (`OrganogramaRevealBlock`) em vez de aparecer/sumir no mesmo frame do
            clique. O bloco em si — recuos, gap, molduras internas — segue
            exatamente como estava; é ele que define o layout, não o wrapper.
            `wave` é o que põe este bloco na fila de abrir/fechar (o slot vem do
            `buildRevealWave`) e diz quantos itens ele tem: o bloco só encolhe
            depois que o último subdepartamento (item daqui) terminou de sair. */}
        <OrganogramaRevealBlock open={showSubDepartamentos} wave={subBlockWave}>
          <div className="pl-4 pr-1.5 pb-1.5 flex flex-col gap-1.5">
            {subDepartamentos.map((sub, index) => (
              // O nó inteiro é um ITEM deste bloco: o wrapper de saída é dele (o
              // de dentro segue intocado, com a cascata da própria row). Sem
              // `animate`, o wrapper só existe para a SAÍDA — a entrada dele é a
              // da row do subdepartamento, que anima por conta própria.
              <motion.div
                key={sub.id}
                variants={cascadeVariants}
                initial={false}
                exit="closed"
                custom={exitOrder(subBlockWave, index, subDepartamentos.length)}
              >
                <OrganogramaNode
                  node={sub}
                  level={level + 1}
                  expandedIds={expandedIds}
                  onToggle={onToggle}
                  cascadeIndex={cascadeIndex}
                  waveIndex={waveIndex}
                />
              </motion.div>
            ))}
          </div>
        </OrganogramaRevealBlock>
      </div>

      {/* Colaboradores: mesmo tratamento de abertura/fechamento dos
          subdepartamentos (altura + opacidade). Continua FORA da moldura, como
          antes — só ganhou o wrapper de revelação, que não tem estilo de layout.
          O bloco aqui usa o slot `trailing` (depois de toda a subárvore) e conta
          os colaboradores como itens: cada row sai antes de o vão fechar. */}
      <OrganogramaRevealBlock open={showColaboradores} wave={colabBlockWave}>
        <div className="relative ml-4 pl-4 flex flex-col gap-0.5 py-1.5">
          {/* Tronco vertical — mesma linha (espessura e tinta) da moldura acima. */}
          <span className="organograma-line organograma-line-vertical absolute left-0 top-0 bottom-0 rounded-full" />
          {colaboradores.map((colaborador, index) => (
            // Mesmo wrapper de antes (`relative`, de onde o ramal horizontal se
            // ancora), agora em `motion.div`: a cascata entra DEPOIS dos
            // subdepartamentos porque é essa a posição do colaborador em
            // `buildCascadeIndex`, e a SAÍDA vai na ordem inversa (o último
            // colaborador é o primeiro a ir embora). EmployeeRow segue intocada.
            <motion.div
              key={colaborador.id}
              className="relative"
              variants={cascadeVariants}
              initial="hidden"
              animate="visible"
              exit="closed"
              custom={{
                enter: cascadePosition(colaborador.id),
                ...exitOrder(colabBlockWave, index, colaboradores.length),
              }}
            >
              {/* Ramal horizontal — mesma linha do tronco e da moldura; centrado
                  na altura real da row via `top-1/2` (o recuo de meia espessura
                  é calculado a partir do token em .organograma-line-horizontal). */}
              <span className="organograma-line organograma-line-horizontal absolute -left-4 top-1/2 w-4 rounded-full" />
              <EmployeeRow colaborador={colaborador} />
            </motion.div>
          ))}
        </div>
      </OrganogramaRevealBlock>

      {/* Mensagem de departamento sem filhos: é conteúdo que também nasce e
          morre com o expandir/recolher — pelo mesmo motivo, entra e sai
          animando (senão seria o único bloco a piscar). O wrapper do `p` é o
          item do bloco (como as rows): a linha sobe e desaparece antes de o vão
          fechar. */}
      <OrganogramaRevealBlock open={showEmptyMessage} wave={emptyBlockWave}>
        <motion.div
          variants={cascadeVariants}
          initial={false}
          exit="closed"
          custom={exitOrder(emptyBlockWave, 0, 1)}
        >
          <p className="text-[11px] text-muted-foreground italic py-2 pl-6">Nenhum colaborador vinculado.</p>
        </motion.div>
      </OrganogramaRevealBlock>
    </div>
  );
}
