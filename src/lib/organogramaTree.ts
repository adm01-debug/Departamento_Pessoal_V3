export interface OrgColaborador {
  id: string;
  nome_completo: string;
  cargo?: string | null;
  email?: string | null;
  foto_url?: string | null;
}

export interface OrgDepartamento {
  id: string;
  nome: string;
  colaboradores: OrgColaborador[];
  sub_departamentos: OrgDepartamento[];
}

export function normalizeText(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

export function countTree(nodes: OrgDepartamento[]): { totalDeptos: number; totalColabs: number } {
  let totalDeptos = 0;
  let totalColabs = 0;

  const walk = (list: OrgDepartamento[]) => {
    list.forEach((n) => {
      totalDeptos++;
      totalColabs += n.colaboradores?.length || 0;
      if (n.sub_departamentos?.length) walk(n.sub_departamentos);
    });
  };

  walk(nodes || []);
  return { totalDeptos, totalColabs };
}

export function maxDepth(nodes: OrgDepartamento[], level = 1): number {
  if (!nodes?.length) return 0;

  return nodes.reduce((deepest, node) => {
    const childDepth = node.sub_departamentos?.length ? maxDepth(node.sub_departamentos, level + 1) : level;
    return Math.max(deepest, childDepth);
  }, level);
}

export function collectAllIds(nodes: OrgDepartamento[]): string[] {
  const ids: string[] = [];

  const walk = (list: OrgDepartamento[]) => {
    list.forEach((n) => {
      ids.push(n.id);
      if (n.sub_departamentos?.length) walk(n.sub_departamentos);
    });
  };

  walk(nodes || []);
  return ids;
}

export function getDefaultExpandedIds(nodes: OrgDepartamento[]): Set<string> {
  const ids = new Set<string>();

  (nodes || []).forEach((root) => {
    ids.add(root.id);
    root.sub_departamentos?.forEach((child) => ids.add(child.id));
  });

  return ids;
}

/**
 * Posição de CADA row do Organograma na cascata de entrada (ver
 * `organogramaCascade.ts`), em pré-ordem: o departamento primeiro, depois seus
 * subdepartamentos (recursivamente, cada um com o seu próprio conteúdo) e só
 * então os colaboradores dele. É exatamente a ordem em que `OrganogramaNode`
 * renderiza as rows, então o atraso cresce de cima para baixo na tela —
 * departamento raiz entra primeiro, subdepartamentos na sequência e os
 * colaboradores por último, como na Timeline de colaboradores.
 *
 * Chave do Map: id do departamento (DepartmentRow) ou id do colaborador
 * (EmployeeRow). A árvore pronta para renderizar é a que decide: departamento
 * recolhido não desenha filhos, então a subárvore dele não consome posição —
 * nenhuma row que não existe deixa "buraco" de delay nas que vêm depois.
 */
export function buildCascadeIndex(nodes: OrgDepartamento[], expandedIds: Set<string>): Map<string, number> {
  const index = new Map<string, number>();
  let next = 0;

  const walk = (node: OrgDepartamento) => {
    index.set(node.id, next++);
    if (!expandedIds.has(node.id)) return;
    (node.sub_departamentos || []).forEach(walk);
    (node.colaboradores || []).forEach((colaborador) => index.set(colaborador.id, next++));
  };

  (nodes || []).forEach(walk);
  return index;
}

/**
 * Onda dos BLOCOS do Organograma (ver organogramaReveal.ts): onde cada bloco está
 * na fila de abertura e na fila de fechamento. São duas filas diferentes de
 * propósito:
 *
 *   • ABERTURA segue a pré-ordem da árvore — é a MESMA ordem da cascata das rows
 *     (`buildCascadeIndex`), então o que o olho vê é uma coisa só: a row entra, o
 *     vão dela abre, e o ramo seguinte entra depois. Só a profundidade (o que a
 *     onda usava antes) não dava essa leitura: numa árvore de dois níveis sobrava
 *     um degrau único e "Expandir tudo" continuava abrindo tudo quase junto.
 *   • FECHAMENTO é por NÍVEL, contado de trás pra frente (o último bloco do nível
 *     é o primeiro a sair). Quem fecha um nível por vez é a página
 *     (`buildCollapseStages`), porque desmontar a árvore inteira num commit só
 *     não anima nada: bloco que está dentro de outro que está saindo não roda a
 *     própria saída (o `AnimatePresence` congela a subárvore que está saindo).
 *
 * Cada nó dono de blocos tem dois slots de abertura porque os blocos dele não são
 * vizinhos no tempo: o de subdepartamentos abre junto com a row dele e o de
 * colaboradores abre depois de TODA a subárvore dele (é essa a ordem em que os
 * dois aparecem na tela). O bloco da mensagem "Nenhum colaborador vinculado."
 * ocupa o slot de subdepartamentos — é o conteúdo que aparece no lugar deles.
 *
 * A conta é feita sobre a ÁRVORE INTEIRA, expandida ou não: assim os slots não
 * mudam quando um nível recolhe (o mapa de fechamento precisa sobreviver à
 * transição dos passos) e o que fica recolhido só deixa buraco na fila, nunca
 * troca a ordem de quem aparece.
 */
export interface RevealWaveSlot {
  /** Slot do bloco de subdepartamentos (e da mensagem de vazio) na abertura. */
  open: number;
  /** Slot do bloco de colaboradores na abertura (depois de toda a subárvore). */
  trailing: number;
  /** Slot do bloco no fechamento DENTRO do nível dele (o maior sai primeiro). */
  close: number;
}

export interface RevealWaveIndex {
  /** Um slot por departamento da árvore; quem monta o bloco é quem consulta. */
  slots: Map<string, RevealWaveSlot>;
  /** Maior slot de abertura da árvore (o fim da fila de abrir). */
  span: number;
  /** Maior slot de fechamento (o nível mais largo da árvore). */
  closeSpan: number;
}

export function buildRevealWave(nodes: OrgDepartamento[]): RevealWaveIndex {
  const slots = new Map<string, RevealWaveSlot>();
  const byDepth: string[][] = [];

  let next = 0;

  const walk = (node: OrgDepartamento, depth: number) => {
    const open = next++;
    (node.sub_departamentos || []).forEach((child) => walk(child, depth + 1));
    const trailing = next++;

    slots.set(node.id, { open, trailing, close: 0 });

    if (!byDepth[depth]) byDepth[depth] = [];
    byDepth[depth].push(node.id);
  };

  (nodes || []).forEach((root) => walk(root, 0));

  let closeSpan = 0;

  byDepth.forEach((ids) => {
    ids.forEach((id, rank) => {
      const slot = slots.get(id);
      if (slot) slot.close = ids.length - 1 - rank;
    });
    closeSpan = Math.max(closeSpan, ids.length - 1);
  });

  return { slots, span: Math.max(next - 1, 0), closeSpan };
}

/**
 * Quantos itens o bloco mais cheio do departamento revela quando está aberto —
 * subdepartamentos, colaboradores ou a mensagem de vazio. É o que o bloco espera
 * antes de encolher (`cascadeItemsSpan`) e o que a página usa para dimensionar o
 * passo do recolhimento.
 */
function blockItemCount(node: OrgDepartamento): number {
  const subDeptos = node.sub_departamentos?.length || 0;
  const colaboradores = node.colaboradores?.length || 0;
  if (subDeptos === 0 && colaboradores === 0) return 1; // mensagem de vazio
  return Math.max(subDeptos, colaboradores);
}

/**
 * Um passo do recolhimento: um NÍVEL inteiro da árvore saindo do estado de
 * expansão. A página aplica os passos em sequência (do fundo pra raiz), um por
 * vez, e é isso que faz "Recolher tudo" ser uma onda de baixo pra cima em vez de
 * um desmonte único — o nível mais profundo termina de sair antes de o nível que
 * o contém começar.
 */
export interface CollapseStage {
  /** Departamentos que saem do estado de expansão neste passo. */
  ids: string[];
  /** Maior bloco do nível (a janela que a página espera antes do passo seguinte). */
  maxItems: number;
  /** Maior slot de fechamento entre os blocos deste nível (a onda dentro do nível). */
  closeSlots: number;
}

/**
 * Os passos de "Recolher tudo", do fundo pra raiz. Só entram os departamentos que
 * ESTÃO expandidos agora: nível sem nada aberto não vira passo (não há bloco
 * nenhum pra animar) e o último passo é sempre o das raízes — depois dele a
 * árvore está recolhida, igual ao `setExpandedIds(new Set())` de antes.
 */
export function buildCollapseStages(nodes: OrgDepartamento[], expandedIds: Set<string>): CollapseStage[] {
  const wave = buildRevealWave(nodes);
  const byDepth = new Map<number, CollapseStage>();

  const walk = (node: OrgDepartamento, depth: number) => {
    (node.sub_departamentos || []).forEach((child) => walk(child, depth + 1));

    if (!expandedIds.has(node.id)) return;

    const stage = byDepth.get(depth) || { ids: [], maxItems: 0, closeSlots: 0 };
    stage.ids.push(node.id);
    stage.maxItems = Math.max(stage.maxItems, blockItemCount(node));
    stage.closeSlots = Math.max(stage.closeSlots, wave.slots.get(node.id)?.close || 0);
    byDepth.set(depth, stage);
  };

  (nodes || []).forEach((root) => walk(root, 0));

  return [...byDepth.entries()]
    .sort(([depthA], [depthB]) => depthB - depthA)
    .map(([, stage]) => stage);
}

/**
 * Filtra a árvore preservando o caminho até os matches (departamento,
 * subdepartamento, nome de colaborador ou cargo). Um departamento cujo
 * próprio nome bate mantém toda a subárvore intacta; caso contrário só
 * os colaboradores/subdeptos que batem (ou contêm um match) sobrevivem.
 */
export function filterTree(
  nodes: OrgDepartamento[],
  term: string
): { nodes: OrgDepartamento[]; matchedIds: Set<string> } {
  const matchedIds = new Set<string>();
  const needle = normalizeText(term);

  if (!needle) return { nodes, matchedIds };

  const filterNode = (node: OrgDepartamento): OrgDepartamento | null => {
    const deptoMatches = normalizeText(node.nome).includes(needle);

    if (deptoMatches) {
      matchedIds.add(node.id);
      collectAllIds([node]).forEach((id) => matchedIds.add(id));
      return node;
    }

    const colaboradores = (node.colaboradores || []).filter(
      (c) => normalizeText(c.nome_completo).includes(needle) || normalizeText(c.cargo || '').includes(needle)
    );

    const subDeptos = (node.sub_departamentos || []).map(filterNode).filter((n): n is OrgDepartamento => n !== null);

    if (colaboradores.length === 0 && subDeptos.length === 0) return null;

    matchedIds.add(node.id);
    return { ...node, colaboradores, sub_departamentos: subDeptos };
  };

  const filtered = (nodes || []).map(filterNode).filter((n): n is OrgDepartamento => n !== null);
  return { nodes: filtered, matchedIds };
}

export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}
