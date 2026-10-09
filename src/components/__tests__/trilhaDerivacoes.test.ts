/**
 * Testes das derivações da Trilha de Auditoria de Desligamentos.
 *
 * O que está sendo protegido aqui:
 *  - `categoriaDoEvento` é MUTUAMENTE EXCLUSIVA (a soma dos chips é o total);
 *  - o payload cru NUNCA vira JSON na linha (vira rótulo/valor legível);
 *  - a linha mostra no MÁXIMO 2 metadados e o detalhe mostra tudo;
 *  - o agrupamento/rótulo do dia ("Hoje"/"Ontem") e os filtros combinam por AND.
 *
 * Datas fixas e SEM `Z`: o módulo trabalha no fuso LOCAL (`dataValida` →
 * `parseDateLocalISO`), então escrever o horário local mantém o teste estável em
 * qualquer fuso do CI.
 */
import { describe, it, expect } from 'vitest';
import {
  acoesDaTrilha,
  agruparPorDia,
  alteracoesDoEvento,
  categoriaDoEvento,
  descricaoDoEvento,
  filtrarTrilha,
  formatarDataHora,
  formatarHora,
  formatarValor,
  iniciaisDoAutor,
  metadadosDoEvento,
  nivelDoEvento,
  normalizarEvento,
  ordenarTrilha,
  origemDoAutor,
  responsavelDoEvento,
  resultadoDoEvento,
  resumoTrilha,
  rotuloDoDia,
  textoDoEvento,
  tituloDoEvento,
  usuariosDaTrilha,
  type EventoTrilha,
} from '../desligamentos/trilhaDerivacoes';
import { CATEGORIAS_TRILHA, TINTAS_AVATAR, rotuloRecurso, tintaAvatar } from '../desligamentos/trilhaComum';
import { DIA_MS, inicioDoDia } from '../desligamentos/desligamentosDerivacoes';

/** Evento normalizado com padrões realistas (só o que o teste quer muda). */
const evento = (parcial: Partial<EventoTrilha> = {}): EventoTrilha => ({
  id: 'ev-1',
  criadoEm: '2026-10-08T09:00:00',
  tabela: 'desligamentos',
  registroId: 'dsl-2026-0041',
  acao: 'UPDATE',
  userId: 'usr-1',
  userEmail: 'ana.martins@empresa.com',
  ip: '189.5.77.14',
  userAgent: 'Mozilla/5.0',
  antes: null,
  depois: null,
  ...parcial,
});

/** 08/10/2026 no início do dia — a régua do agrupamento. */
const HOJE = inicioDoDia(new Date('2026-10-08T12:00:00'));

describe('normalizarEvento', () => {
  it('lê a linha crua do audit_log (payload achatado)', () => {
    const eventoNormalizado = normalizarEvento({
      id: 7,
      created_at: '2026-10-08T09:00:00',
      tabela: 'desligamentos',
      registro_id: 'dsl-1',
      acao: 'UPDATE',
      user_id: 'usr-1',
      user_email: 'ana@empresa.com',
      ip_address: '10.0.0.1',
      user_agent: 'Mozilla/5.0',
      dados_anteriores: { status: 'pagamento' },
      dados_novos: { status: 'finalizado' },
    });

    expect(eventoNormalizado).toMatchObject({
      id: '7',
      tabela: 'desligamentos',
      registroId: 'dsl-1',
      acao: 'UPDATE',
      userId: 'usr-1',
      userEmail: 'ana@empresa.com',
      ip: '10.0.0.1',
      antes: { status: 'pagamento' },
      depois: { status: 'finalizado' },
    });
  });

  it('lê o registro do RPC com o payload aninhado', () => {
    expect(
      normalizarEvento({
        id: 'log-1',
        payload: {
          user_email: 'ana@empresa.com',
          ip_address: '10.0.0.2',
          anteriores: { responsavel: 'Camila' },
          novos: { responsavel: 'Bruno' },
        },
      })
    ).toMatchObject({
      userEmail: 'ana@empresa.com',
      ip: '10.0.0.2',
      antes: { responsavel: 'Camila' },
      depois: { responsavel: 'Bruno' },
    });
  });

  it('não quebra com linha vazia e recusa payload que não é objeto', () => {
    expect(normalizarEvento({})).toMatchObject({ id: '', tabela: null, acao: null, antes: null, depois: null });
    expect(normalizarEvento({ dados_novos: [1, 2] }).depois).toBeNull();
    expect(normalizarEvento({ dados_novos: 'texto' }).depois).toBeNull();
  });
});

describe('formatação de data e hora', () => {
  it('formata o carimbo no fuso local', () => {
    expect(formatarHora('2026-10-08T09:30:00')).toBe('09:30');
    expect(formatarDataHora('2026-10-08T09:30:00')).toBe('08/10/2026 · 09:30:00');
  });

  it('devolve "—" para data ausente ou inválida', () => {
    expect(formatarHora('')).toBe('—');
    expect(formatarDataHora('nao-e-data')).toBe('—');
  });
});

describe('formatarValor', () => {
  it('traduz o payload para linguagem humana (nunca JSON)', () => {
    expect(formatarValor('status', 'pagamento')).toBe('Em Pagamento');
    expect(formatarValor('etapa', 'documentacao')).toBe('Documentos');
    expect(formatarValor('tipo', 'sem_justa_causa')).toBe('Sem Justa Causa');
    expect(formatarValor('data_pagamento', '2026-10-01')).toBe('01/10/2026');
    expect(formatarValor('competencia', '2026-09')).toBe('09/2026');
    expect(formatarValor('ativo', true)).toBe('Sim');
    expect(formatarValor('ativo', false)).toBe('Não');
  });

  it('formata dinheiro, contagem de documentos e coleções', () => {
    expect(formatarValor('valor_liquido', 5102.33)).toContain('5.102,33');
    expect(formatarValor('documentos', 1)).toBe('1 validado');
    expect(formatarValor('documentos_validados', 6)).toBe('6 validados');
    expect(formatarValor('lista', [1, 2, 3])).toBe('3 itens');
    expect(formatarValor('objeto', { a: 1, b: 2 })).toBe('2 campos');
  });

  it('devolve "—" para valor vazio e humaniza chave desconhecida', () => {
    expect(formatarValor('valor_liquido', null)).toBe('—');
    expect(formatarValor('campo_novo', 'abc')).toBe('abc');
  });
});

describe('categoriaDoEvento', () => {
  it('classifica cada evento em exatamente UMA categoria', () => {
    expect(categoriaDoEvento(evento({ acao: 'EXECUTE_CALC' }))).toBe('calculos');
    expect(categoriaDoEvento(evento({ acao: 'SIMULATION_CALC' }))).toBe('calculos');
    expect(categoriaDoEvento(evento({ acao: 'GENERATE_DOC', userId: null, userEmail: null }))).toBe('sistema');
    expect(categoriaDoEvento(evento({ acao: 'VIEW' }))).toBe('documentos');
    expect(categoriaDoEvento(evento({ acao: 'EXPORT' }))).toBe('documentos');
    expect(
      categoriaDoEvento(evento({ antes: { documentos_validados: 4 }, depois: { documentos_validados: 6 } }))
    ).toBe('documentos');
    expect(categoriaDoEvento(evento({ antes: { status: 'pagamento' }, depois: { status: 'finalizado' } }))).toBe(
      'status'
    );
    expect(categoriaDoEvento(evento({ acao: 'INSERT', depois: { status: 'pendente' } }))).toBe('alteracoes');
    expect(categoriaDoEvento(evento({ antes: { responsavel: 'Camila' }, depois: { responsavel: 'Bruno' } }))).toBe(
      'alteracoes'
    );
  });

  it('a precedência é cálculo → sistema → documento → status → alteração', () => {
    // Cálculo executado pela própria aplicação continua sendo "Cálculos".
    expect(categoriaDoEvento(evento({ acao: 'EXECUTE_CALC', userId: null, userEmail: null }))).toBe('calculos');
    // Mudança de status carimbada pelo sistema continua sendo "Sistema".
    expect(
      categoriaDoEvento(
        evento({ antes: { status: 'pagamento' }, depois: { status: 'cancelado' }, userId: null, userEmail: null })
      )
    ).toBe('sistema');
  });

  it('a soma das categorias é o total do resumo', () => {
    const trilha = [
      evento({ id: 'a', acao: 'EXECUTE_CALC' }),
      evento({ id: 'b', acao: 'VIEW' }),
      evento({ id: 'c', antes: { status: 'pagamento' }, depois: { status: 'finalizado' } }),
      evento({ id: 'd', acao: 'INSERT' }),
      evento({ id: 'e', acao: 'GENERATE_DOC', userId: null, userEmail: null }),
    ];
    const resumo = resumoTrilha(trilha);
    const soma = CATEGORIAS_TRILHA.reduce((total, meta) => total + resumo.porCategoria[meta.chave], 0);

    expect(resumo.total).toBe(5);
    expect(soma).toBe(resumo.total);
    expect(resumo.porCategoria).toMatchObject({
      calculos: 1,
      documentos: 1,
      status: 1,
      alteracoes: 1,
      sistema: 1,
    });
  });
});


describe('nivelDoEvento', () => {
  it('marca exclusão e cancelamento como crítico', () => {
    expect(nivelDoEvento(evento({ acao: 'DELETE' }))).toBe('critico');
    expect(nivelDoEvento(evento({ antes: { status: 'calculado' }, depois: { status: 'cancelado' } }))).toBe('critico');
  });

  it('marca alteração não terminal como atenção e o resto como informativo', () => {
    expect(nivelDoEvento(evento({ antes: { status: 'calculado' }, depois: { status: 'pagamento' } }))).toBe('atencao');
    expect(nivelDoEvento(evento({ antes: { status: 'pagamento' }, depois: { status: 'finalizado' } }))).toBe(
      'informativo'
    );
    expect(nivelDoEvento(evento({ acao: 'INSERT', depois: { status: 'pendente' } }))).toBe('informativo');
  });
});

describe('alteracoesDoEvento e metadadosDoEvento', () => {
  it('lista o diff real na ordem de relevância (núcleo primeiro)', () => {
    const alteracoes = alteracoesDoEvento(
      evento({
        antes: { data_pagamento: '2026-10-01', status: 'pagamento' },
        depois: { data_pagamento: '2026-10-03', status: 'finalizado' },
      })
    );

    expect(alteracoes.map((a) => a.chave)).toEqual(['status', 'data_pagamento']);
    expect(alteracoes[0]).toMatchObject({ label: 'Status', de: 'Em Pagamento', para: 'Finalizado' });
    expect(alteracoes[1]).toMatchObject({ label: 'Data de pagamento', de: '01/10/2026', para: '03/10/2026' });
  });

  it('não inventa transição em criação/exclusão (payload único)', () => {
    expect(alteracoesDoEvento(evento({ acao: 'INSERT', depois: { status: 'pendente' } }))).toEqual([]);
    expect(alteracoesDoEvento(evento({ acao: 'DELETE', antes: { status: 'pendente' } }))).toEqual([]);
  });

  it('mostra no máximo dois metadados, sem repetir rótulo', () => {
    const metas = metadadosDoEvento(
      evento({
        antes: { status: 'pagamento', data_pagamento: '2026-10-01' },
        depois: { status: 'finalizado', data_pagamento: '2026-10-03', valor_liquido: 5102.33 },
      })
    );

    expect(metas).toHaveLength(2);
    expect(metas[0]).toMatchObject({ chave: 'status', de: 'Em Pagamento', valor: 'Finalizado', transicao: true });
    expect(metas[1].chave).toBe('data_pagamento');
  });

  it('destaca valor em R$ e mostra o código técnico da ação do app', () => {
    const [valor] = metadadosDoEvento(evento({ depois: { valor_liquido: 5102.33 } }));
    expect(valor).toMatchObject({ label: 'Valor líquido', destaque: true });
    expect(valor.valor).toContain('5.102,33');

    const metasExport = metadadosDoEvento(evento({ acao: 'EXPORT', depois: { formato: 'CSV' } }));
    expect(metasExport[0]).toMatchObject({ label: 'Evento técnico', valor: 'EXPORT', tecnico: true });
    expect(metasExport[1]).toMatchObject({ label: 'Formato', valor: 'CSV' });
  });

  it('não esconde payload desconhecido: cai nos pares genéricos', () => {
    const metas = metadadosDoEvento(evento({ acao: 'ACAO_RARA', depois: { campo_novo: 'x', outro: 2 } }));
    expect(metas.map((m) => m.label)).toEqual(['Campo novo', 'Outro']);
    expect(metas[0].valor).toBe('x');
  });
});

describe('título, descrição e resultado', () => {
  it('monta o título a partir da ação e do payload novo', () => {
    expect(tituloDoEvento(evento({ acao: 'INSERT' }))).toBe('Processo de desligamento iniciado');
    expect(tituloDoEvento(evento({ acao: 'DELETE' }))).toBe('Desligamento excluído');
    expect(tituloDoEvento(evento({ acao: 'UPDATE', depois: { status: 'finalizado' } }))).toBe(
      'Desligamento finalizado'
    );
    expect(tituloDoEvento(evento({ antes: { responsavel: 'Camila' }, depois: { responsavel: 'Bruno' } }))).toBe(
      'Responsável atualizado'
    );
    expect(tituloDoEvento(evento({ depois: { documentos_validados: 6 } }))).toBe('Documentos conferidos');
  });

  it('humaniza a ação desconhecida em vez de esconder o código', () => {
    // O código técnico NÃO é reescrito em minúsculas: só o `_` vira espaço.
    expect(tituloDoEvento(evento({ acao: 'ACAO_NOVA' }))).toBe('ACAO NOVA');
    expect(tituloDoEvento(evento({ acao: null }))).toBe('Evento registrado');
  });

  it('descreve a transição em uma frase legível', () => {
    expect(descricaoDoEvento(evento({ antes: { status: 'pagamento' }, depois: { status: 'finalizado' } }))).toBe(
      'Status alterado de Em Pagamento para Finalizado.'
    );
  });

  it('só dá selo de resultado para conclusão ou execução do sistema', () => {
    expect(resultadoDoEvento(evento({ depois: { status: 'finalizado' } }))?.label).toBe('Concluído');
    expect(resultadoDoEvento(evento({ depois: { status: 'concluido' } }))?.label).toBe('Concluído');
    expect(resultadoDoEvento(evento({ userId: null, userEmail: null }))?.label).toBe('Sistema');
    expect(resultadoDoEvento(evento({ antes: { status: 'calculado' }, depois: { status: 'pagamento' } }))).toBeNull();
  });
});


describe('responsável do evento', () => {
  it('resolve o nome pelo cadastro e degrada para o e-mail', () => {
    const nomePorId = new Map([['usr-1', 'Ana Martins']]);
    expect(responsavelDoEvento(evento(), nomePorId)).toMatchObject({
      chave: 'usr-1',
      nome: 'Ana Martins',
      email: 'ana.martins@empresa.com',
      sistema: false,
    });
    expect(responsavelDoEvento(evento(), null).nome).toBe('ana.martins@empresa.com');
    expect(responsavelDoEvento(evento({ userId: null, userEmail: null }))).toMatchObject({
      chave: 'sistema',
      nome: 'Sistema (Automático)',
      sistema: true,
    });
  });

  it('gera iniciais tanto de nome quanto de e-mail', () => {
    expect(iniciaisDoAutor('Ana Martins')).toBe('AM');
    expect(iniciaisDoAutor('ana.martins@empresa.com')).toBe('AM');
    expect(iniciaisDoAutor('')).toBe('—');
  });

  it('deduz a origem da sessão', () => {
    expect(origemDoAutor(evento({ userId: null, userEmail: null }))).toBe('Sistema');
    expect(origemDoAutor(evento())).toBe('Web');
    expect(origemDoAutor(evento({ userAgent: null }))).toBe('API');
    expect(origemDoAutor(evento({ depois: { departamento: 'Financeiro' } }))).toBe('Financeiro');
  });
});

describe('agrupamento e ordenação', () => {
  const trilha = [
    evento({ id: 'hoje-1', criadoEm: '2026-10-08T09:00:00' }),
    evento({ id: 'hoje-2', criadoEm: '2026-10-08T07:00:00' }),
    evento({ id: 'ontem-1', criadoEm: '2026-10-07T18:00:00' }),
    evento({ id: 'antigo-1', criadoEm: '2026-10-05T08:00:00' }),
  ];

  it('nomeia os dois primeiros dias e data os demais por extenso', () => {
    expect(rotuloDoDia(HOJE, HOJE)).toBe('Hoje');
    expect(rotuloDoDia(HOJE - DIA_MS, HOJE)).toBe('Ontem');
    expect(rotuloDoDia(HOJE - 3 * DIA_MS, HOJE)).toBe('05 de outubro de 2026');
  });

  it('agrupa por dia, do mais recente para o mais antigo', () => {
    const grupos = agruparPorDia(trilha, HOJE);
    expect(grupos.map((grupo) => grupo.rotulo)).toEqual(['Hoje', 'Ontem', '05 de outubro de 2026']);
    expect(grupos[0].eventos.map((e) => e.id)).toEqual(['hoje-1', 'hoje-2']);
    expect(resumoTrilha(trilha).dias).toBe(3);
  });

  it('não perde evento sem data válida (cai no grupo de hoje)', () => {
    const grupos = agruparPorDia([evento({ id: 'sem-data', criadoEm: '' })], HOJE);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].rotulo).toBe('Hoje');
  });

  it('ordena por carimbo nos dois sentidos', () => {
    expect(ordenarTrilha(trilha).map((e) => e.id)).toEqual(['hoje-1', 'hoje-2', 'ontem-1', 'antigo-1']);
    expect(ordenarTrilha(trilha, 'antigos').map((e) => e.id)).toEqual(['antigo-1', 'ontem-1', 'hoje-2', 'hoje-1']);
  });
});

describe('filtrarTrilha', () => {
  const nomePorId = new Map([['usr-1', 'Ana Martins']]);
  const trilha = [
    evento({
      id: 'f1',
      criadoEm: '2026-10-08T09:00:00',
      antes: { status: 'pagamento' },
      depois: { status: 'finalizado' },
    }),
    evento({
      id: 'f2',
      criadoEm: '2026-10-07T09:00:00',
      acao: 'DELETE',
      registroId: 'dsl-2026-0033',
      userId: 'usr-9',
      userEmail: 'bruno@empresa.com',
    }),
    evento({ id: 'f3', criadoEm: '2026-09-01T09:00:00', acao: 'VIEW', registroId: 'dsl-2026-0001' }),
  ];

  it('combina todas as dimensões (AND)', () => {
    expect(filtrarTrilha(trilha, { categoria: 'status' }, nomePorId).map((e) => e.id)).toEqual(['f1']);
    expect(filtrarTrilha(trilha, { categoria: 'documentos' }, nomePorId).map((e) => e.id)).toEqual(['f3']);
    expect(filtrarTrilha(trilha, { nivel: 'critico' }, nomePorId).map((e) => e.id)).toEqual(['f2']);
    expect(filtrarTrilha(trilha, { acao: 'DELETE' }, nomePorId).map((e) => e.id)).toEqual(['f2']);
    expect(filtrarTrilha(trilha, { registro: '0033' }, nomePorId).map((e) => e.id)).toEqual(['f2']);
    expect(filtrarTrilha(trilha, { usuario: 'usr-1' }, nomePorId).map((e) => e.id)).toEqual(['f1', 'f3']);
    expect(filtrarTrilha(trilha, { categoria: 'status', acao: 'VIEW' }, nomePorId)).toEqual([]);
  });

  it('filtra pelo período (limites inclusivos no fuso local)', () => {
    expect(filtrarTrilha(trilha, { de: '2026-10-07' }, nomePorId).map((e) => e.id)).toEqual(['f1', 'f2']);
    expect(filtrarTrilha(trilha, { ate: '2026-10-07' }, nomePorId).map((e) => e.id)).toEqual(['f2', 'f3']);
    expect(filtrarTrilha(trilha, { de: '2026-10-07', ate: '2026-10-07' }, nomePorId).map((e) => e.id)).toEqual(['f2']);
  });

  it('busca no título, no autor, no registro e no código da ação', () => {
    expect(filtrarTrilha(trilha, { busca: 'finalizado' }, nomePorId).map((e) => e.id)).toEqual(['f1']);
    expect(filtrarTrilha(trilha, { busca: 'bruno' }, nomePorId).map((e) => e.id)).toEqual(['f2']);
    expect(filtrarTrilha(trilha, { busca: 'dsl-2026-0001' }, nomePorId).map((e) => e.id)).toEqual(['f3']);
    expect(filtrarTrilha(trilha, { busca: 'VIEW' }, nomePorId).map((e) => e.id)).toEqual(['f3']);
    expect(filtrarTrilha(trilha, { busca: 'inexistente' }, nomePorId)).toEqual([]);
  });

  it('sem filtro devolve a trilha inteira e tolera entrada nula', () => {
    expect(filtrarTrilha(trilha, {}, nomePorId)).toHaveLength(3);
    expect(filtrarTrilha(null, {}, nomePorId)).toEqual([]);
  });
});


describe('opções dos filtros e resumo', () => {
  const trilha = [
    evento({ id: 'o1', acao: 'VIEW' }),
    evento({ id: 'o2', acao: 'VIEW' }),
    evento({ id: 'o3', acao: 'DELETE', userId: null, userEmail: null }),
  ];

  it('lista autores e ações por volume, sem inventar item', () => {
    const usuarios = usuariosDaTrilha(trilha, new Map([['usr-1', 'Ana Martins']]));
    expect(usuarios[0]).toMatchObject({ nome: 'Ana Martins', total: 2 });
    expect(usuarios.map((u) => u.chave)).toContain('sistema');

    expect(acoesDaTrilha(trilha)).toEqual([
      { acao: 'VIEW', total: 2 },
      { acao: 'DELETE', total: 1 },
    ]);
    expect(acoesDaTrilha(null)).toEqual([]);
  });

  it('zera os contadores de uma trilha vazia', () => {
    const resumo = resumoTrilha([]);
    expect(resumo).toMatchObject({ total: 0, dias: 0 });
    expect(CATEGORIAS_TRILHA.reduce((t, m) => t + resumo.porCategoria[m.chave], 0)).toBe(0);
  });
});

describe('textoDoEvento (evidência para a área de transferência)', () => {
  it('inclui o resumo humano e os dois payloads', () => {
    const texto = textoDoEvento(
      evento({ antes: { status: 'pagamento' }, depois: { status: 'finalizado', valor_liquido: 5102.33 } })
    );

    expect(texto).toContain('Evento: Desligamento finalizado');
    expect(texto).toContain('Ação: UPDATE');
    expect(texto).toContain('Autor: ana.martins@empresa.com');
    expect(texto).toContain('Payload anterior:');
    expect(texto).toContain('"status": "pagamento"');
    expect(texto).toContain('Payload novo:');
    expect(texto).toContain('5102.33');
  });
});

describe('trilhaComum (tokens de apresentação)', () => {
  it('as categorias são únicas e completas', () => {
    const chaves = CATEGORIAS_TRILHA.map((meta) => meta.chave);
    expect(new Set(chaves).size).toBe(chaves.length);
    CATEGORIAS_TRILHA.forEach((meta) => {
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.badge).toContain('bg-');
      expect(meta.ponto).toContain('bg-');
      expect(meta.anel).toContain('border-');
    });
  });

  it('a tinta do avatar é determinística e vem da paleta', () => {
    expect(tintaAvatar('usr-1')).toBe(tintaAvatar('usr-1'));
    expect(TINTAS_AVATAR).toContain(tintaAvatar('ana.martins@empresa.com'));
    expect(TINTAS_AVATAR).toContain(tintaAvatar('sistema'));
  });

  it('rotula a entidade sem inventar nome', () => {
    expect(rotuloRecurso('desligamentos')).toBe('Desligamentos');
    expect(rotuloRecurso('tabela_nova')).toBe('Tabela Nova');
    expect(rotuloRecurso(null)).toBe('—');
  });
});

