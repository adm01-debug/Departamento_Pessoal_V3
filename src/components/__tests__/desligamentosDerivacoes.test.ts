import { describe, it, expect } from 'vitest';
import {
  construirSerieMensal,
  concluido,
  emAberto,
  pendente,
  precisaAtencao,
  resumoAtencao,
  prazoRescisao,
  PRAZO_RESCISAO_DIAS,
  type DesligamentoLike,
} from '../desligamentos/desligamentosDerivacoes';

/**
 * O que este arquivo trava: o VOCABULÁRIO. As derivações são aritmética pura,
 * mas liam valores de `tipo` e `status` que não existem no banco — e o efeito
 * disso não aparece como erro, aparece como faixa zerada no gráfico e pendência
 * eterna na lista do RH.
 *
 * Os valores usados aqui são os do enum `tipo_desligamento` do banco canônico
 * (sem_justa_causa, justa_causa, pedido_demissao, acordo, fim_contrato,
 * falecimento) e os status que a produção grava (`pago` incluído,
 * rescisaoService.ts:348).
 */

const AGORA = new Date(2026, 9, 15); // 15/10/2026, local

function desligamento(tipo: string, data: string, status = 'finalizado'): DesligamentoLike {
  return { id: `${tipo}-${data}`, tipo, status, data_desligamento: data };
}

describe('construirSerieMensal — tipos do enum real', () => {
  it('cada tipo do enum cai na própria faixa; só falecimento e desconhecido vão para Outros', () => {
    const lista: DesligamentoLike[] = [
      desligamento('sem_justa_causa', '2026-10-02'),
      desligamento('sem_justa_causa', '2026-10-20'),
      desligamento('justa_causa', '2026-10-03'),
      desligamento('pedido_demissao', '2026-10-04'),
      desligamento('acordo', '2026-10-05'),
      desligamento('fim_contrato', '2026-10-06'),
      desligamento('falecimento', '2026-10-07'),
      desligamento('tipo_que_nao_existe', '2026-10-08'),
    ];

    const serie = construirSerieMensal(lista, 1, AGORA);
    expect(serie).toHaveLength(1);
    const mes = serie[0];

    expect(mes.semJusta).toBe(2);
    expect(mes.justa).toBe(1);
    expect(mes.pedido).toBe(1);
    expect(mes.acordo).toBe(1);
    expect(mes.termino).toBe(1);
    expect(mes.outros).toBe(2); // falecimento + desconhecido
    expect(mes.total).toBe(8);
  });

  it('as chaves inventadas pela branch antiga caem em Outros, não em faixa nomeada', () => {
    // Prova que o vocabulário trocou: com `com_justa_causa`/`acordo_mutuo`/
    // `termino_contrato` nada mais casa faixa nomeada.
    const serie = construirSerieMensal(
      [
        desligamento('com_justa_causa', '2026-10-02'),
        desligamento('acordo_mutuo', '2026-10-03'),
        desligamento('termino_contrato', '2026-10-04'),
      ],
      1,
      AGORA
    );
    const mes = serie[0];
    expect(mes.outros).toBe(3);
    expect(mes.semJusta + mes.justa + mes.pedido + mes.acordo + mes.termino).toBe(0);
  });

  it('agrupa pela competência da data, inclusive no dia 1º (sem day-shift de UTC)', () => {
    const serie = construirSerieMensal(
      [desligamento('sem_justa_causa', '2026-10-01'), desligamento('sem_justa_causa', '2026-09-30')],
      2,
      AGORA
    );
    expect(serie).toHaveLength(2);
    expect(serie[0].key).toBe('2026-09');
    expect(serie[0].semJusta).toBe(1);
    expect(serie[1].key).toBe('2026-10');
    expect(serie[1].semJusta).toBe(1);
  });

  it('registro sem data não entra em nenhuma competência', () => {
    const serie = construirSerieMensal([{ tipo: 'sem_justa_causa', data_desligamento: null }], 1, AGORA);
    expect(serie[0].total).toBe(0);
  });
});

describe('status terminais — `pago` encerra o processo', () => {
  it('pago não está em aberto e conta como concluído', () => {
    const pago = desligamento('sem_justa_causa', '2026-09-01', 'pago');
    expect(emAberto(pago)).toBe(false);
    expect(concluido(pago)).toBe(true);
    expect(pendente(pago)).toBe(false);
  });

  it('os demais terminais seguem terminais e os intermediários seguem em aberto', () => {
    for (const status of ['finalizado', 'concluido', 'cancelado']) {
      expect(emAberto(desligamento('acordo', '2026-09-01', status))).toBe(false);
    }
    for (const status of ['pendente', 'comunicado', 'calculado', 'homologado', 'pagamento', 'em_andamento']) {
      expect(emAberto(desligamento('acordo', '2026-09-01', status))).toBe(true);
    }
  });

  it('desligamento PAGO não aparece na faixa de atenção, mesmo com prazo vencido', () => {
    // 01/09 + 10 dias = 11/09, vencido em 15/10. Antes, com `pago` fora dos
    // terminais, ele seguia contado como atraso e a lista do RH nunca esvaziava.
    const hojeMs = AGORA.getTime();
    const vencidoPago = desligamento('sem_justa_causa', '2026-09-01', 'pago');
    const vencidoAberto = desligamento('sem_justa_causa', '2026-09-01', 'pendente');

    expect(resumoAtencao([vencidoPago], hojeMs)).toEqual({ atrasados: 0, pendentes: 0, hoje: 0, total: 0 });

    const comAberto = resumoAtencao([vencidoAberto], hojeMs);
    expect(comAberto.atrasados).toBe(1);
    expect(comAberto.total).toBe(1);
  });
});

describe('prazo do art. 477 §6º', () => {
  it('são 10 dias após a data do desligamento', () => {
    expect(PRAZO_RESCISAO_DIAS).toBe(10);
    const limite = prazoRescisao(desligamento('sem_justa_causa', '2026-10-01'));
    expect(limite?.getFullYear()).toBe(2026);
    expect(limite?.getMonth()).toBe(9);
    expect(limite?.getDate()).toBe(11);
  });

  it('sem data de desligamento não há prazo inventado', () => {
    expect(prazoRescisao({ data_desligamento: null })).toBeUndefined();
  });
});

describe('precisaAtencao x resumoAtencao — mesma régua', () => {
  const hojeMs = AGORA.getTime();

  // 01/09 + 10 dias = 11/09 → vencido em 15/10.
  const vencidoAberto = desligamento('sem_justa_causa', '2026-09-01', 'pendente');
  // 05/10 + 10 dias = 15/10 → prazo HOJE.
  const prazoHoje = desligamento('acordo', '2026-10-05', 'calculado');
  // Em aberto, prazo folgado, mas status pendente.
  const sóPendente = desligamento('pedido_demissao', '2026-10-14', 'comunicado');
  // Terminais: nunca entram.
  const pago = desligamento('sem_justa_causa', '2026-09-01', 'pago');
  const cancelado = desligamento('acordo', '2026-09-01', 'cancelado');
  // Em aberto, prazo folgado e status que não é pendente.
  const tranquilo = desligamento('fim_contrato', '2026-10-14', 'homologado');

  it('o filtro da lista aceita exatamente os processos que o banner conta', () => {
    const lista = [vencidoAberto, prazoHoje, sóPendente, pago, cancelado, tranquilo];
    const filtrados = lista.filter((d) => precisaAtencao(d, hojeMs));
    // Se as duas réguas divergissem, o banner diria um número e a lista
    // mostraria outro — foi por isso que o critério virou função única.
    expect(filtrados).toHaveLength(resumoAtencao(lista, hojeMs).total);
    expect(filtrados.map((d) => d.id)).toEqual([vencidoAberto.id, prazoHoje.id, sóPendente.id]);
  });

  it('cada critério sozinho já basta', () => {
    expect(precisaAtencao(vencidoAberto, hojeMs)).toBe(true);
    expect(precisaAtencao(prazoHoje, hojeMs)).toBe(true);
    expect(precisaAtencao(sóPendente, hojeMs)).toBe(true);
  });

  it('terminal e tranquilo ficam fora', () => {
    expect(precisaAtencao(pago, hojeMs)).toBe(false);
    expect(precisaAtencao(cancelado, hojeMs)).toBe(false);
    expect(precisaAtencao(tranquilo, hojeMs)).toBe(false);
  });

  it('as subcontagens podem se sobrepor sem inflar o total', () => {
    // `vencidoAberto` é atrasado E pendente: 1 processo, não 2.
    const r = resumoAtencao([vencidoAberto], hojeMs);
    expect(r.atrasados).toBe(1);
    expect(r.pendentes).toBe(1);
    expect(r.total).toBe(1);
  });
});
