/**
 * ============================================================================
 * GESTÃO DE DESEMPENHO — PERSISTÊNCIA DEMONSTRATIVA (VITRINE).
 *
 * Regra do módulo: TODOS os controles executam a ação que prometem, nos DOIS
 * ambientes. Este módulo é o ambiente DEMONSTRATIVO: grava em armazenamento
 * LOCAL (nunca no Supabase, nunca em ID fictício no banco), SEM tocar nos
 * arquivos de mock — as fixtures continuam intocadas e são apenas a BASE.
 *
 * ── COMO FUNCIONA ──────────────────────────────────────────────────────────
 *   `criados`   registros novos da vitrine (ciclo/meta/feedback/pdi), com id
 *               próprio (`demo-…`) — aparecem nas listas junto dos mocks;
 *   `patches`   alterações de ESTADO/campos sobre QUALQUER registro visível
 *               (mock ou demo): concluir, cancelar, reabrir, editar…
 *   `removidos` ids escondidos da vitrine (excluir ciclo/meta/pdi);
 *   `historico` trilha append-only de TUDO o que foi executado na demo
 *               (auditoria da demonstração; nunca grava em `audit_log`).
 *
 * Sobrevive a F5 e ao fechar/reabrir o navegador (localStorage do perfil).
 * `restaurarAlteradosDemo()` devolve a vitrine ao estado original sem tocar nas
 * fixtures.
 * ============================================================================
 */

export const CHAVE_REGISTROS_DEMO = 'dp-desempenho-demo-registros';

export type EntidadeDemo = 'ciclos' | 'metas' | 'feedbacks' | 'pdis';
export const ENTIDADES_DEMO: EntidadeDemo[] = ['ciclos', 'metas', 'feedbacks', 'pdis'];

export interface EventoDemo {
  em: string;
  entidade: EntidadeDemo;
  operacao: 'criar' | 'editar' | 'excluir' | 'status' | 'aprovar' | 'devolver' | 'reenviar' | 'validar_potencial';
  id: string;
  /** Rótulo humano do que aconteceu (aparece no histórico demonstrativo). */
  descricao: string;
  dados?: Record<string, unknown>;
  por: string | null;
}

export interface EstadoRegistrosDemo {
  versao: 1;
  criados: Record<EntidadeDemo, Record<string, Record<string, unknown>>>;
  patches: Record<EntidadeDemo, Record<string, Record<string, unknown>>>;
  removidos: Record<EntidadeDemo, string[]>;
  historico: EventoDemo[];
}

type MapaEntidades = Record<EntidadeDemo, Record<string, Record<string, unknown>>>;

const mapaVazio = (): MapaEntidades => ({ ciclos: {}, metas: {}, feedbacks: {}, pdis: {} });

export function estadoRegistrosVazio(): EstadoRegistrosDemo {
  return {
    versao: 1,
    criados: mapaVazio(),
    patches: mapaVazio(),
    removidos: { ciclos: [], metas: [], feedbacks: [], pdis: [] },
    historico: [],
  };
}

/** Lê o estado demonstrativo; conteúdo inválido devolve o estado vazio. */
export function lerRegistrosDemo(): EstadoRegistrosDemo {
  try {
    const bruto = globalThis.localStorage?.getItem(CHAVE_REGISTROS_DEMO);
    if (!bruto) return estadoRegistrosVazio();
    const lido = JSON.parse(bruto) as Partial<EstadoRegistrosDemo>;
    const base = estadoRegistrosVazio();
    return {
      versao: 1,
      criados: { ...base.criados, ...(lido?.criados ?? {}) },
      patches: { ...base.patches, ...(lido?.patches ?? {}) },
      removidos: { ...base.removidos, ...(lido?.removidos ?? {}) },
      historico: Array.isArray(lido?.historico) ? lido.historico : [],
    };
  } catch {
    return estadoRegistrosVazio();
  }
}

/** Grava o estado demonstrativo (best-effort). */
export function gravarRegistrosDemo(estado: EstadoRegistrosDemo): EstadoRegistrosDemo {
  try {
    globalThis.localStorage?.setItem(CHAVE_REGISTROS_DEMO, JSON.stringify(estado));
  } catch {
    /* storage indisponível: a vitrine segue em memória */
  }
  return estado;
}

/** Apaga SÓ o estado demonstrativo (fixtures e banco intactos). */
export function limparRegistrosDemo(): EstadoRegistrosDemo {
  try {
    globalThis.localStorage?.removeItem(CHAVE_REGISTROS_DEMO);
  } catch {
    /* nada a fazer */
  }
  return estadoRegistrosVazio();
}

/**
 * Reinicializa SOMENTE o que foi alterado na vitrine (criados, patches e
 * exclusões) e PRESERVA a trilha — é o "reinicializar apenas os dados alterados
 * durante os testes" pedido no roteiro.
 */
export function restaurarAlteradosDemo(): EstadoRegistrosDemo {
  const atual = lerRegistrosDemo();
  return gravarRegistrosDemo({
    ...atual,
    criados: mapaVazio(),
    patches: mapaVazio(),
    removidos: { ciclos: [], metas: [], feedbacks: [], pdis: [] },
  });
}

/** Id de um registro da demonstração (nunca confundido com UUID real). */
export function idDemo(entidade: EntidadeDemo): string {
  return `demo-${entidade.replace(/s$/, '')}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function registrar(estado: EstadoRegistrosDemo, evento: Omit<EventoDemo, 'em'>): EstadoRegistrosDemo {
  return { ...estado, historico: [...estado.historico, { em: new Date().toISOString(), ...evento }] };
}

/* ─── Operações (todas persistem e entram na trilha) ─────────────────────── */

/** CRIA um registro demonstrativo e devolve a linha gravada. */
export function criarRegistroDemo(
  entidade: EntidadeDemo,
  dados: Record<string, unknown>,
  { por = null, descricao = 'Registro criado na demonstração' }: { por?: string | null; descricao?: string } = {}
): { estado: EstadoRegistrosDemo; registro: Record<string, unknown> } {
  const estado = lerRegistrosDemo();
  const id = String(dados?.id ?? '').trim() || idDemo(entidade);
  const registro = { ...dados, id };
  const novo = registrar(
    {
      ...estado,
      criados: { ...estado.criados, [entidade]: { ...estado.criados[entidade], [id]: registro } },
      removidos: { ...estado.removidos, [entidade]: estado.removidos[entidade].filter((x) => x !== id) },
    },
    { entidade, operacao: 'criar', id, descricao, dados: registro, por }
  );
  return { estado: gravarRegistrosDemo(novo), registro };
}

/** EDITA/ALTERA O ESTADO de um registro visível (mock ou demo). */
export function atualizarRegistroDemo(
  entidade: EntidadeDemo,
  id: string,
  patch: Record<string, unknown>,
  {
    por = null,
    descricao = 'Registro alterado na demonstração',
    operacao = 'editar' as EventoDemo['operacao'],
  }: { por?: string | null; descricao?: string; operacao?: EventoDemo['operacao'] } = {}
): EstadoRegistrosDemo {
  const estado = lerRegistrosDemo();
  const chave = String(id ?? '').trim();
  if (!chave) return estado;

  const criado = estado.criados[entidade][chave];
  const criados = criado
    ? { ...estado.criados, [entidade]: { ...estado.criados[entidade], [chave]: { ...criado, ...patch } } }
    : estado.criados;

  const novo = registrar(
    {
      ...estado,
      criados,
      patches: {
        ...estado.patches,
        [entidade]: { ...estado.patches[entidade], [chave]: { ...(estado.patches[entidade][chave] ?? {}), ...patch } },
      },
    },
    { entidade, operacao, id: chave, descricao, dados: patch, por }
  );
  return gravarRegistrosDemo(novo);
}

/** EXCLUI da vitrine (registro criado sai; registro-base entra em `removidos`). */
export function excluirRegistroDemo(
  entidade: EntidadeDemo,
  id: string,
  { por = null, descricao = 'Registro excluído na demonstração' }: { por?: string | null; descricao?: string } = {}
): EstadoRegistrosDemo {
  const estado = lerRegistrosDemo();
  const chave = String(id ?? '').trim();
  if (!chave) return estado;

  const criados = { ...estado.criados[entidade] };
  const eraCriado = !!criados[chave];
  delete criados[chave];
  const patches = { ...estado.patches[entidade] };
  delete patches[chave];

  const novo = registrar(
    {
      ...estado,
      criados: { ...estado.criados, [entidade]: criados },
      patches: { ...estado.patches, [entidade]: patches },
      removidos: eraCriado
        ? estado.removidos
        : { ...estado.removidos, [entidade]: [...new Set([...estado.removidos[entidade], chave])] },
    },
    { entidade, operacao: 'excluir', id: chave, descricao, por }
  );
  return gravarRegistrosDemo(novo);
}

/**
 * Aplica o estado demonstrativo sobre uma lista (mocks + reais): esconde os
 * removidos, sobrepõe os patches e ACRESCENTA os criados — sem mutar a entrada.
 */
export function aplicarEstadoDemo<T extends Record<string, unknown>>(
  lista: T[],
  entidade: EntidadeDemo,
  estado: EstadoRegistrosDemo
): T[] {
  const removidos = new Set(estado.removidos[entidade] ?? []);
  const patches = estado.patches[entidade] ?? {};
  const idDe = (x: unknown) => String((x as { id?: unknown })?.id ?? '');
  const comPatch = (x: T): T => {
    const patch = patches[idDe(x)];
    return patch ? ({ ...x, ...patch } as T) : x;
  };

  const base = (lista ?? []).filter((x) => !removidos.has(idDe(x))).map(comPatch);
  const idsExistentes = new Set(base.map(idDe));
  const extras = (Object.values(estado.criados[entidade] ?? {}) as T[])
    .filter((x) => !removidos.has(idDe(x)) && !idsExistentes.has(idDe(x)))
    .map(comPatch);

  return [...base, ...extras];
}

/** Histórico demonstrativo (mais recente primeiro) — leitura da aba Auditoria. */
export function historicoDemo(estado: EstadoRegistrosDemo): EventoDemo[] {
  return [...estado.historico].reverse();
}

/** Última alteração da vitrine para um id (usada no diagnostic/depuração). */
export function patchDe(estado: EstadoRegistrosDemo, entidade: EntidadeDemo, id: unknown): Record<string, unknown> {
  return estado.patches[entidade]?.[String(id ?? '').trim()] ?? {};
}
