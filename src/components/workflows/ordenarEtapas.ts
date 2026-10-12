import type { WfConnection, WfNode } from './WorkflowDesigner';

/**
 * Lineariza o canvas em uma sequência de nós respeitando as setas: ordenação
 * topológica (Kahn) do subgrafo alcançável a partir do nó `start`, com
 * desempate pela ordem de criação. Nós não alcançáveis vão para o fim.
 * Lança erro se houver ciclo — o motor de execução só suporta sequência linear.
 */
export function ordenarNosPorConexoes(nodes: WfNode[], connections: WfConnection[]): WfNode[] {
  const indice = new Map(nodes.map((n, i) => [n.id, i]));
  const adj = new Map<string, string[]>();
  for (const c of connections) {
    if (!indice.has(c.from) || !indice.has(c.to)) continue;
    const list = adj.get(c.from) ?? [];
    list.push(c.to);
    adj.set(c.from, list);
  }

  const start = nodes.find((n) => n.type === 'start');
  const alcancaveis = new Set<string>();
  if (start) {
    const pilha = [start.id];
    while (pilha.length > 0) {
      const cur = pilha.pop() as string;
      if (alcancaveis.has(cur)) continue;
      alcancaveis.add(cur);
      for (const next of adj.get(cur) ?? []) pilha.push(next);
    }
  }

  const grauEntrada = new Map<string, number>();
  for (const id of alcancaveis) grauEntrada.set(id, 0);
  for (const id of alcancaveis) {
    for (const next of adj.get(id) ?? []) grauEntrada.set(next, (grauEntrada.get(next) ?? 0) + 1);
  }

  const porCriacao = (a: string, b: string) => (indice.get(a) ?? 0) - (indice.get(b) ?? 0);
  const prontos = [...alcancaveis].filter((id) => grauEntrada.get(id) === 0).sort(porCriacao);
  const ordenados: string[] = [];
  while (prontos.length > 0) {
    const cur = prontos.shift() as string;
    ordenados.push(cur);
    for (const next of adj.get(cur) ?? []) {
      const g = (grauEntrada.get(next) ?? 0) - 1;
      grauEntrada.set(next, g);
      if (g === 0) {
        prontos.push(next);
        prontos.sort(porCriacao);
      }
    }
  }
  if (ordenados.length < alcancaveis.size) {
    throw new Error('O fluxo contém um ciclo — aprovações precisam formar uma sequência sem retorno.');
  }

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const resto = nodes.filter((n) => !alcancaveis.has(n.id)).map((n) => n.id);
  return [...ordenados, ...resto].map((id) => byId.get(id) as WfNode);
}
