/**
 * TESTES DE PARIDADE — regra ANTIGA (HEAD) × regra NOVA (domínio canônico).
 *
 * Como o código antigo foi REMOVIDO (`OnboardingPageContent.tsx`), as fórmulas
 * antigas foram recuperadas com `git show HEAD:<arquivo>` e estão reescritas
 * aqui como `antigo*()` — SOMENTE como oráculo de comparação. Nenhuma
 * arquitetura antiga foi reintroduzida: nada deste arquivo é importado pelo app.
 *
 * MESMA fixture nas duas pontas. Onde a divergência é INTENCIONAL (a próxima
 * ação passou a ser determinística por prazo — FASE 4), o teste documenta a
 * mudança em vez de esconder.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  progressoOnboarding,
  resumoOnboarding,
  situacaoOnboarding,
  projetarOnboarding,
  resumoGeralOnboarding,
  ordenarTarefas,
  ordenarLinhas,
  proximaTarefa,
  prazoDaTarefa,
  jornadaConcluida,
  jornadaCancelada,
  maiorAtrasoEmDias,
  type ColaboradorOnboarding,
  type TarefaOnboarding,
} from '@/components/admissoes/onboardingDerivacoes';
import { DIA_MS, inicioDoDia } from '@/components/admissoes/admissoesDerivacoes';

// O serviço canônico é exercitado aqui com o cliente Supabase mockado — é o
// caminho REAL (responsavel_id → profiles) sem tocar em banco.
const { consultas } = vi.hoisted(() => ({ consultas: [] as { tabela: string; filtro?: unknown }[] }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (tabela: string) => ({
      select: () => ({
        in: (coluna: string, valores: unknown[]) => {
          consultas.push({ tabela, filtro: { coluna, valores } });
          return Promise.resolve({ data: [{ user_id: 'user-1', nome: 'Ana Responsável' }], error: null });
        },
      }),
    }),
  },
}));

const HOJE = inicioDoDia(new Date());
const deslocar = (dias: number) => new Date(Date.now() + dias * DIA_MS).toISOString();

/* ─── ORÁCULO: as regras como estavam no HEAD ──────────────────────────────── */

/** ANTIGO (OnboardingPageContent.tsx:113-118): contadores do topo. */
function antigoResumoTopo(lista: ColaboradorOnboarding[]) {
  const hoje = HOJE;
  let concluidos = 0;
  let emRisco = 0;
  lista.forEach((colaborador) => {
    const progresso = progressoOnboarding(colaborador.tarefas);
    if (progresso.total > 0 && progresso.valor >= 100) concluidos += 1;
    if (resumoOnboarding(colaborador.tarefas, hoje).atrasadas > 0) emRisco += 1;
  });
  return { total: lista.length, concluidos, emRisco, emAndamento: lista.length - concluidos };
}

/** ANTIGO (OnboardingPage.tsx:121-125): divisão das abas. */
function antigoEmAndamento(lista: ColaboradorOnboarding[]) {
  return lista.filter((o) => progressoOnboarding(o.tarefas).valor < 100);
}

/** ANTIGO (onboardingDerivacoes.ts): primeira pendente na ORDEM DO ARRAY. */
function antigoProximaTarefa(tarefas?: TarefaOnboarding[] | null) {
  return (tarefas ?? []).find((t) => t.concluida !== true) ?? null;
}

/* ─── FIXTURE ÚNICA (a mesma para as duas pontas) ──────────────────────────── */

const FIXTURE: ColaboradorOnboarding[] = [
  {
    // EM DIA: 1 de 2 concluídas (50%), próxima ação com prazo futuro.
    id: 'col-1',
    nome: 'Ana Em Dia',
    cargo: 'Analista',
    departamento: 'RH',
    created_at: deslocar(-5),
    tarefas: [
      { id: 'a1', titulo: 'Conta de e-mail', concluida: true, concluida_em: deslocar(-4) },
      { id: 'a2', titulo: 'Tour', concluida: false, prazo_dias: 30, created_at: deslocar(-5) },
    ],
  },
  {
    // ATRASADA: a PRÓXIMA ação já venceu.
    id: 'col-2',
    nome: 'Bruno Atrasado',
    cargo: 'Designer',
    departamento: 'Marketing',
    created_at: deslocar(-40),
    tarefas: [{ id: 'b1', titulo: 'Assinar termo', concluida: false, prazo_dias: 5, created_at: deslocar(-40) }],
  },
  {
    // EM RISCO: NADA vencido, mas a próxima ação vence DENTRO da janela de
    // atenção (hoje = 0 dias de folga). É o que separa "em risco" de "atrasado".
    id: 'col-3',
    nome: 'Carla Risco',
    cargo: 'Dev',
    departamento: 'TI',
    created_at: deslocar(-2),
    tarefas: [{ id: 'c1', titulo: 'Kit', concluida: false, prazo_dias: 0, created_at: deslocar(0) }],
  },
  {
    // CONCLUÍDA: 100%, tudo com `concluida_em`.
    id: 'col-4',
    nome: 'Dora Concluída',
    cargo: 'Suporte',
    departamento: 'TI',
    created_at: deslocar(-90),
    tarefas: [
      { id: 'd1', titulo: 'Tour', concluida: true, concluida_em: deslocar(-80) },
      { id: 'd2', titulo: 'Check-in', concluida: true, concluida_em: deslocar(-60) },
    ],
  },
  {
    // SEM TAREFAS: caso-limite — 0% mas NÃO concluído.
    id: 'col-5',
    nome: 'Edu Sem Tarefas',
    cargo: 'Estágio',
    departamento: 'TI',
    created_at: deslocar(-1),
    tarefas: [],
  },
];

describe('PARIDADE — progresso, conclusão e contadores (mesma fixture)', () => {
  it('percentual: a regra nova é idêntica à antiga em TODOS os registros', () => {
    const novas = projetarOnboarding(FIXTURE, HOJE);
    FIXTURE.forEach((colaborador, i) => {
      expect(novas[i].progresso).toEqual(progressoOnboarding(colaborador.tarefas));
    });
    // Valores de referência da fixture (o teste também falha se a fixture mudar).
    expect(novas.map((l) => l.progresso.valor)).toEqual([50, 0, 0, 100, 0]);
  });

  it('"concluído" usa a MESMA condição (total > 0 e 100%)', () => {
    const novas = projetarOnboarding(FIXTURE, HOJE);
    novas.forEach((linha) => {
      expect(linha.concluido).toBe(linha.progresso.total > 0 && linha.progresso.valor >= 100);
      expect(linha.concluido).toBe(jornadaConcluida(linha.progresso));
    });
    // O caso-limite (sem tarefas) NÃO é concluído em nenhuma das duas réguas.
    expect(novas[4].concluido).toBe(false);
  });

  it('contadores do topo batem com o cálculo antigo da aba de Admissões', () => {
    const novas = resumoGeralOnboarding(projetarOnboarding(FIXTURE, HOJE));
    expect(novas).toEqual(antigoResumoTopo(FIXTURE));
    expect(novas).toEqual({ total: 5, emAndamento: 4, concluidos: 1, emRisco: 1 });
  });

  it('a divisão das abas (em andamento) bate com a régua antiga da Jornada', () => {
    const novas = projetarOnboarding(FIXTURE, HOJE);
    const emAndamentoNovo = novas.filter((l) => !l.concluido).map((l) => l.colaborador.id);
    const emAndamentoAntigo = antigoEmAndamento(FIXTURE).map((c) => c.id);
    expect(emAndamentoNovo).toEqual(emAndamentoAntigo);
    // O registro SEM tarefas fica em andamento nas duas (nunca "concluído").
    expect(emAndamentoNovo).toContain('col-5');
  });

  it('tarefas concluídas/pendentes e o total batem registro a registro', () => {
    const novas = projetarOnboarding(FIXTURE, HOJE);
    novas.forEach((linha) => {
      const antigo = progressoOnboarding(linha.colaborador.tarefas);
      expect(linha.progresso.concluidas).toBe(antigo.concluidas);
      expect(linha.progresso.pendentes).toBe(antigo.pendentes);
      expect(linha.progresso.total).toBe(antigo.total);
      expect(linha.resumo.concluidas).toBe(antigo.concluidas);
      expect(linha.resumo.pendentes).toBe(antigo.pendentes);
    });
  });

  it('o MARCO atual acompanha o percentual (mesma régua de 4 marcos)', () => {
    expect(projetarOnboarding(FIXTURE, HOJE).map((l) => l.marco)).toEqual([2, 0, 0, 3, 0]);
  });
});

describe('PARIDADE — risco, atraso e situação', () => {
  it('o conjunto "em risco" do topo é o MESMO antes e depois (prova de equivalência)', () => {
    const novas = projetarOnboarding(FIXTURE, HOJE);
    // NOVO: diasDeAtraso > 0 · ANTIGO: resumo.atrasadas > 0 (mesma definição)
    const riscoNovo = novas.filter((l) => l.diasDeAtraso > 0).map((l) => l.colaborador.id);
    const riscoAntigo = FIXTURE.filter((c) => resumoOnboarding(c.tarefas, HOJE).atrasadas > 0).map((c) => c.id);
    expect(riscoNovo).toEqual(riscoAntigo);
    expect(riscoNovo).toEqual(['col-2']);
  });

  it('classifica cada situação da fixture (atrasado / em risco / em dia / concluído / sem ação)', () => {
    expect(projetarOnboarding(FIXTURE, HOJE).map((l) => l.situacao)).toEqual([
      'em_dia',
      'atrasado',
      'em_risco',
      'concluido',
      'sem_proxima_acao',
    ]);
  });

  it('dias de atraso refletem o vencimento mais antigo (0 quando nada venceu)', () => {
    expect(projetarOnboarding(FIXTURE, HOJE).map((l) => l.diasDeAtraso)).toEqual([0, 35, 0, 0, 0]);
  });

  it('"fora do prazo" (aba Concluídos) usa a data de CONCLUSÃO, não a de hoje', () => {
    // Dora concluiu tudo dentro do prazo (sem created_at → prazo não calculável).
    expect(projetarOnboarding(FIXTURE, HOJE)[3].foraDoPrazo).toBe(false);
  });

  it('o card e a tela leem a MESMA função de situação', () => {
    FIXTURE.forEach((colaborador) => {
      expect(projetarOnboarding([colaborador], HOJE)[0].situacao).toBe(situacaoOnboarding(colaborador, HOJE));
    });
  });
});



describe('PARIDADE — próxima ação (mudança INTENCIONAL documentada)', () => {
  it('a ordem do array NÃO decide mais: vale o prazo mais próximo', () => {
    const tarefas: TarefaOnboarding[] = [
      { id: 'z1', titulo: 'Prazo longo', concluida: false, prazo_dias: 90, created_at: deslocar(-1) },
      { id: 'z2', titulo: 'Prazo curto', concluida: false, prazo_dias: 2, created_at: deslocar(-1) },
    ];
    // ANTIGO: pegava a PRIMEIRA do array ("Prazo longo").
    expect(antigoProximaTarefa(tarefas)?.titulo).toBe('Prazo longo');
    // NOVO: determinístico pelo prazo ("Prazo curto").
    expect(proximaTarefa(tarefas)?.titulo).toBe('Prazo curto');
  });

  it('quando o array já vem ordenado, antigo e novo coincidem', () => {
    const ordenada = ordenarTarefas(FIXTURE[1].tarefas);
    expect(proximaTarefa(ordenada)?.id).toBe(antigoProximaTarefa(ordenada)?.id);
  });

  it('é um contrato TOTAL: embaralhar a entrada nunca muda a saída', () => {
    const tarefas: TarefaOnboarding[] = [
      { id: 'x3', concluida: false, prazo_dias: 5, created_at: deslocar(-10) },
      { id: 'x1', concluida: false, prazo_dias: 5, created_at: deslocar(-10) },
      { id: 'x2', concluida: false, prazo_dias: 5, created_at: deslocar(-10) },
      { id: 'x0', concluida: false, prazo_dias: 5, created_at: deslocar(-1) },
    ];
    const esperado = ['x1', 'x2', 'x3', 'x0']; // prazo (empate) → created_at → id
    expect(ordenarTarefas(tarefas).map((t) => t.id)).toEqual(esperado);
    expect(ordenarTarefas([...tarefas].reverse()).map((t) => t.id)).toEqual(esperado);
    expect(ordenarTarefas([tarefas[2], tarefas[0], tarefas[3], tarefas[1]]).map((t) => t.id)).toEqual(esperado);
  });

  it('tarefa sem `created_at` (prazo não calculável) vai para o FIM', () => {
    const tarefas: TarefaOnboarding[] = [
      { id: 'sem-data', concluida: false },
      { id: 'com-data', concluida: false, prazo_dias: 3, created_at: deslocar(-2) },
    ];
    expect(ordenarTarefas(tarefas).map((t) => t.id)).toEqual(['com-data', 'sem-data']);
    expect(prazoDaTarefa(tarefas[0])).toBeNull();
  });
});

describe('PARIDADE — ordenações da tela (FASE 15)', () => {
  const linhas = projetarOnboarding(FIXTURE, HOJE);

  it('"Mais críticos" segue a régua atrasado → em risco → sem ação → em dia → concluído', () => {
    expect(ordenarLinhas(linhas, 'criticos').map((l) => l.colaborador.id)).toEqual([
      'col-2', // atrasado
      'col-3', // em risco
      'col-5', // sem próxima ação
      'col-1', // em dia
      'col-4', // concluído
    ]);
  });

  it('"Mais atrasados" ordena por dias de atraso desc', () => {
    expect(ordenarLinhas(linhas, 'atrasados').map((l) => l.diasDeAtraso)).toEqual([35, 0, 0, 0, 0]);
  });

  it('progresso e nome ordenam de forma estável e determinística', () => {
    expect(ordenarLinhas(linhas, 'maior_progresso').map((l) => l.progresso.valor)).toEqual([100, 50, 0, 0, 0]);
    expect(ordenarLinhas(linhas, 'menor_progresso')[0].colaborador.id).toBe('col-2');
    expect(ordenarLinhas(linhas, 'nome')[0].colaborador.nome).toBe('Ana Em Dia');
  });

  it('nenhuma ordenação perde ou duplica registros', () => {
    const ordens = [
      'criticos',
      'atrasados',
      'inicio_recente',
      'inicio_antigo',
      'maior_progresso',
      'menor_progresso',
      'nome',
    ] as const;
    ordens.forEach((ordem) => {
      const ordenada = ordenarLinhas(linhas, ordem);
      expect(ordenada).toHaveLength(linhas.length);
      expect(new Set(ordenada.map((l) => l.colaborador.id)).size).toBe(linhas.length);
    });
  });
});


describe('CASOS-LIMITE (PENDÊNCIA 4)', () => {
  it('VÁRIAS tarefas atrasadas: o atraso reportado é o da pendência MAIS antiga', () => {
    const tarefas: TarefaOnboarding[] = [
      { id: 'v1', titulo: 'Recente', concluida: false, prazo_dias: 2, created_at: deslocar(-5) }, // venceu há 3d
      { id: 'v2', titulo: 'Antiga', concluida: false, prazo_dias: 3, created_at: deslocar(-30) }, // venceu há 27d
      { id: 'v3', titulo: 'Futura', concluida: false, prazo_dias: 30, created_at: deslocar(0) },
    ];
    expect(maiorAtrasoEmDias(tarefas, HOJE)).toBe(27);
    // A "próxima ação" é a MAIS atrasada (prazo mais próximo) — não a do array.
    expect(proximaTarefa(tarefas)?.titulo).toBe('Antiga');
    const resumo = resumoOnboarding(tarefas, HOJE);
    expect(resumo.atrasadas).toBe(2);
    expect(resumo.pendentes).toBe(3);
    expect(resumo.concluidas).toBe(0);
  });

  it('RESPONSÁVEL nulo e INEXISTENTE caem na cadeia de fallback (nunca inventa nome)', () => {
    const base: ColaboradorOnboarding = {
      id: 'r1',
      nome: 'Sem Responsável',
      departamento: 'TI',
      created_at: deslocar(-1),
      tarefas: [
        {
          id: 'r1t',
          concluida: false,
          prazo_dias: 5,
          created_at: deslocar(-1),
          responsavel_id: 'uuid-inexistente',
          responsavel_nome: null,
        },
      ],
    };
    // Sem nome resolvido e sem metadata → string vazia (o card mostra "Não atribuído").
    expect(projetarOnboarding([base], HOJE)[0].responsavel).toBe('');

    // Com `metadata.responsavel` → usa o fallback do registro.
    const comMetadata: ColaboradorOnboarding = { ...base, metadata: { responsavel: 'Gestor DP' } };
    expect(projetarOnboarding([comMetadata], HOJE)[0].responsavel).toBe('Gestor DP');

    // Com nome resolvido (o que o serviço anota) → é ele que vale.
    const comNome: ColaboradorOnboarding = {
      ...base,
      tarefas: [{ ...base.tarefas![0], responsavel_nome: 'Ana Responsável' }],
      metadata: { responsavel: 'Gestor DP' },
    };
    expect(projetarOnboarding([comNome], HOJE)[0].responsavel).toBe('Ana Responsável');
  });

  it('RESPONSÁVEL real: `responsavel_id` é resolvido em `profiles` (user_id → nome)', async () => {
    const { resolverResponsaveis } = await import('@/services/onboardingJornadaService');
    consultas.length = 0;
    const mapa = await resolverResponsaveis(['user-1', 'user-2', null, undefined, 'user-1']);

    expect(consultas).toHaveLength(1);
    expect(consultas[0].tabela).toBe('profiles');
    // Ids repetidos/nulos são normalizados antes da consulta.
    expect((consultas[0].filtro as { valores: string[] }).valores).toEqual(['user-1', 'user-2']);
    expect(mapa.get('user-1')).toBe('Ana Responsável');
    // Id desconhecido não entra no mapa → derivação cai em metadata/"Não atribuído".
    expect(mapa.has('user-2')).toBe(false);
  });
});

describe('CASOS-LIMITE — cancelamento, registro incompleto e reabertura', () => {
  it('ADMISSÃO CANCELADA: regra explícita — não conta risco, não é concluída, continua listada', () => {
    const cancelada: ColaboradorOnboarding = {
      id: 'c1',
      nome: 'Processo Cancelado',
      departamento: 'RH',
      etapa: 'cancelada',
      created_at: deslocar(-90),
      // Pendência MUITO vencida: sem a regra, entraria como "atrasado"/risco.
      tarefas: [{ id: 'c1t', titulo: 'Nunca feita', concluida: false, prazo_dias: 5, created_at: deslocar(-60) }],
    };
    const linhas = projetarOnboarding([cancelada], HOJE);

    expect(jornadaCancelada(cancelada)).toBe(true);
    expect(linhas[0].cancelada).toBe(true);
    expect(linhas[0].situacao).toBe('cancelado');
    expect(linhas[0].concluido).toBe(false);
    // Continua contando no total/andamento (como sempre contou)…
    expect(resumoGeralOnboarding(linhas)).toEqual({ total: 1, emAndamento: 1, concluidos: 0, emRisco: 0 });
    // …e continua sendo o ÚLTIMO na criticidade (não é cobrança operacional).
    const misturadas = ordenarLinhas([...projetarOnboarding(FIXTURE, HOJE), ...linhas], 'criticos');
    expect(misturadas.at(-1)?.colaborador.id).toBe('c1');
  });

  it('REGISTRO INCOMPLETO não quebra nem inventa dados', () => {
    const incompleto: ColaboradorOnboarding = {
      id: 'i1',
      nome: null,
      departamento: null,
      created_at: null,
      tarefas: [{ id: 'i1t', titulo: null, concluida: null, prazo_dias: null, created_at: null }],
    };
    const linha = projetarOnboarding([incompleto], HOJE)[0];

    expect(linha.progresso).toEqual({ total: 1, concluidas: 0, pendentes: 1, valor: 0 });
    expect(linha.inicioEm).toBeNull();
    expect(linha.ultimaConclusaoEm).toBeNull();
    expect(linha.responsavel).toBe('');
    expect(linha.diasDeAtraso).toBe(0); // sem prazo calculável não há atraso
    expect(prazoDaTarefa(incompleto.tarefas![0])).toBeNull();
    // Sem created_at a tarefa vai para o fim, mas continua sendo a próxima ação.
    expect(proximaTarefa(incompleto.tarefas)?.id).toBe('i1t');
  });

  it('TAREFA REABERTA (concluída → pendente) volta a ser a próxima ação e derruba o 100%', () => {
    const concluidas: TarefaOnboarding[] = [
      { id: 're1', titulo: 'A', concluida: true, concluida_em: deslocar(-3) },
      { id: 're2', titulo: 'B', concluida: true, concluida_em: deslocar(-2) },
    ];
    const antes: ColaboradorOnboarding = { id: 're', nome: 'Reaberta', created_at: deslocar(-10), tarefas: concluidas };
    expect(jornadaConcluida(progressoOnboarding(antes.tarefas))).toBe(true);
    expect(proximaTarefa(antes.tarefas)).toBeNull();

    // Reabertura: `concluida` volta para false (o trigger de auditoria registra a
    // mudança em `campos_alterados`).
    const reaberta: ColaboradorOnboarding = {
      ...antes,
      tarefas: [{ ...concluidas[0], concluida: false, concluida_em: null }, concluidas[1]],
    };
    expect(jornadaConcluida(progressoOnboarding(reaberta.tarefas))).toBe(false);
    expect(proximaTarefa(reaberta.tarefas)?.id).toBe('re1');
    expect(projetarOnboarding([reaberta], HOJE)[0].concluido).toBe(false);
  });

  it('DESLIGAMENTO não é inferível pela jornada: o cálculo não muda e nada é removido', () => {
    // O domínio da Jornada é a ADMISSÃO (não há `colaborador_id`); um desligamento
    // posterior não altera a jornada nem apaga histórico.
    const original = projetarOnboarding(FIXTURE, HOJE);
    const comEtapaTerminal = projetarOnboarding(
      FIXTURE.map((c) => ({ ...c, etapa: 'concluida' })),
      HOJE,
    );
    expect(comEtapaTerminal.map((l) => l.situacao)).toEqual(original.map((l) => l.situacao));
    expect(comEtapaTerminal.map((l) => l.progresso.valor)).toEqual(original.map((l) => l.progresso.valor));
    expect(comEtapaTerminal).toHaveLength(original.length);
  });
});

describe('HISTÓRICO — eventos legíveis da jornada (PENDÊNCIA 3)', () => {
  const registro = { id: 'adm-1', titulo: 'Ana', fonte: 'jornada' as const, data_inicio: '2026-01-05' };

  it('emite "jornada iniciada", uma entrada por tarefa concluída e "jornada concluída" ao fechar 100%', async () => {
    const { eventosLegiveisDaJornada } = await import('@/services/onboardingJornadaService');
    const eventos = eventosLegiveisDaJornada(registro, [
      { id: 't1', titulo: 'Docs', concluida: true, data_conclusao: '2026-01-06' },
      { id: 't2', titulo: 'Contrato', concluida: true, data_conclusao: '2026-01-10' },
    ]);

    expect(eventos.map((e) => e.title)).toEqual([
      'Onboarding: jornada iniciada',
      'Onboarding: Docs',
      'Onboarding: Contrato',
      'Onboarding: jornada concluída',
    ]);
    // O fechamento usa a data da ÚLTIMA conclusão, não a de hoje.
    expect(eventos.at(-1)?.date).toBe('2026-01-10');
    expect(eventos.every((e) => e.source === 'jornada_onboarding')).toBe(true);
    // 1 ação = 1 evento: nenhum id repetido.
    expect(new Set(eventos.map((e) => e.id)).size).toBe(eventos.length);
  });

  it('jornada em aberto NÃO emite evento de conclusão', async () => {
    const { eventosLegiveisDaJornada } = await import('@/services/onboardingJornadaService');
    const eventos = eventosLegiveisDaJornada(registro, [
      { id: 't1', titulo: 'Docs', concluida: true, data_conclusao: '2026-01-06' },
      { id: 't2', titulo: 'Contrato', concluida: false },
    ]);
    expect(eventos.map((e) => e.title)).toEqual(['Onboarding: jornada iniciada', 'Onboarding: Docs']);
  });

  it('sem registro (fallback vazio) não inventa evento', async () => {
    const { eventosLegiveisDaJornada } = await import('@/services/onboardingJornadaService');
    expect(eventosLegiveisDaJornada(null, [])).toEqual([]);
    expect(eventosLegiveisDaJornada(registro, [])).toHaveLength(1); // só o início
  });
});

