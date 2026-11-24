import { describe, it, expect } from 'vitest';
import { ordenarNosPorConexoes } from '../ordenarEtapas';
import type { WfConnection, WfNode } from '../WorkflowDesigner';

const node = (id: string, type: WfNode['type'] = 'aprovador'): WfNode => ({
  id,
  type,
  x: 0,
  y: 0,
  label: id,
  config: {},
});
const conn = (from: string, to: string): WfConnection => ({ id: `${from}-${to}`, from, to });
const ids = (ns: WfNode[]) => ns.map((n) => n.id);

describe('ordenarNosPorConexoes', () => {
  it('segue as setas, não a ordem de criação', () => {
    const nodes = [node('S', 'start'), node('B'), node('A'), node('E', 'end')];
    const conns = [conn('S', 'A'), conn('A', 'B'), conn('B', 'E')];
    expect(ids(ordenarNosPorConexoes(nodes, conns))).toEqual(['S', 'A', 'B', 'E']);
  });

  it('respeita dependência quando um ramo reencontra um atalho', () => {
    const nodes = [node('S', 'start'), node('A'), node('C'), node('B'), node('E', 'end')];
    const conns = [conn('S', 'A'), conn('S', 'B'), conn('A', 'C'), conn('C', 'B'), conn('B', 'E')];
    expect(ids(ordenarNosPorConexoes(nodes, conns))).toEqual(['S', 'A', 'C', 'B', 'E']);
  });

  it('desempata ramos independentes pela ordem de criação', () => {
    const nodes = [node('S', 'start'), node('X'), node('Y'), node('E', 'end')];
    const conns = [conn('S', 'Y'), conn('S', 'X'), conn('X', 'E'), conn('Y', 'E')];
    expect(ids(ordenarNosPorConexoes(nodes, conns))).toEqual(['S', 'X', 'Y', 'E']);
  });

  it('coloca nós desconectados no fim', () => {
    const nodes = [node('S', 'start'), node('Z'), node('A')];
    expect(ids(ordenarNosPorConexoes(nodes, [conn('S', 'A')]))).toEqual(['S', 'A', 'Z']);
  });

  it('rejeita ciclo', () => {
    const nodes = [node('S', 'start'), node('A'), node('B')];
    const conns = [conn('S', 'A'), conn('A', 'B'), conn('B', 'A')];
    expect(() => ordenarNosPorConexoes(nodes, conns)).toThrow(/ciclo/);
  });
});
