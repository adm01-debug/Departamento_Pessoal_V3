import { describe, expect, it } from 'vitest';
import {
  chaveData,
  dataDaChave,
  deslocarAncora,
  ehHoje,
  gerarDatasRecorrentes,
  intervaloDoPeriodo,
  MAX_OCORRENCIAS_ESCALA,
  modoDaVisualizacao,
  periodoAnterior,
  rotuloDataCompleta,
  rotuloDiaMes,
  rotuloDiaSemana,
  rotuloDoPeriodo,
  rotuloProximidade,
} from '../turnosCalendario';

/**
 * Régua de datas do painel de Turnos & Escalas.
 *
 * As datas dos casos são fixas e explícitas (outubro/2026) para o teste não
 * depender do dia em que roda: 05/10/2026 é uma SEGUNDA-feira, 07/10/2026 uma
 * quarta e 30/09/2026 uma quarta — a semana de 30/09 é a única que vira o mês
 * dentro do recorte usado aqui.
 */
describe('turnosCalendario · período', () => {
  it('monta a semana de segunda a domingo a partir de qualquer dia dela', () => {
    const periodo = intervaloDoPeriodo('semana', new Date(2026, 9, 7));

    expect(periodo.inicio).toBe('2026-10-05');
    expect(periodo.fim).toBe('2026-10-11');
    expect(periodo.dias).toHaveLength(7);
    expect(periodo.dias[0]).toBe('2026-10-05');
    expect(periodo.dias[6]).toBe('2026-10-11');
  });

  it('monta o mês inteiro (28 a 31 dias)', () => {
    const outubro = intervaloDoPeriodo('mes', new Date(2026, 9, 15));
    expect(outubro.inicio).toBe('2026-10-01');
    expect(outubro.fim).toBe('2026-10-31');
    expect(outubro.dias).toHaveLength(31);

    const fevereiro = intervaloDoPeriodo('mes', new Date(2026, 1, 10));
    expect(fevereiro.dias).toHaveLength(28);
  });

  it('desloca a âncora por semana ou por mês', () => {
    expect(chaveData(deslocarAncora('semana', new Date(2026, 9, 7), -1))).toBe('2026-09-30');
    expect(chaveData(deslocarAncora('semana', new Date(2026, 9, 7), 1))).toBe('2026-10-14');
    expect(chaveData(deslocarAncora('mes', new Date(2026, 9, 7), 1))).toBe('2026-11-07');
  });

  it('devolve o bloco imediatamente anterior com a mesma duração', () => {
    const anterior = periodoAnterior('semana', new Date(2026, 9, 7));
    expect(anterior.inicio).toBe('2026-09-28');
    expect(anterior.fim).toBe('2026-10-04');

    const mesAnterior = periodoAnterior('mes', new Date(2026, 9, 7));
    expect(mesAnterior.inicio).toBe('2026-09-01');
    expect(mesAnterior.fim).toBe('2026-09-30');
  });

  it('a lista usa a janela do mês', () => {
    expect(modoDaVisualizacao('semana')).toBe('semana');
    expect(modoDaVisualizacao('mes')).toBe('mes');
    expect(modoDaVisualizacao('lista')).toBe('mes');
  });
});

describe('turnosCalendario · rótulos', () => {
  it('formata o intervalo da semana no mesmo mês e virando o mês', () => {
    expect(rotuloDoPeriodo(intervaloDoPeriodo('semana', new Date(2026, 9, 7)))).toBe('05 – 11 de outubro de 2026');
    expect(rotuloDoPeriodo(intervaloDoPeriodo('semana', new Date(2026, 8, 30)))).toBe(
      '28 de setembro – 04 de outubro de 2026'
    );
  });

  it('formata o mês por extenso', () => {
    expect(rotuloDoPeriodo(intervaloDoPeriodo('mes', new Date(2026, 9, 7)))).toBe('Outubro de 2026');
  });

  it('encurta o dia da semana e a data', () => {
    expect(rotuloDiaSemana('2026-10-05')).toBe('Seg');
    expect(rotuloDiaSemana('2026-10-11')).toBe('Dom');
    expect(rotuloDiaMes('2026-10-05')).toBe('05/10');
    expect(rotuloDataCompleta('2026-10-05')).toBe('05/10/2026');
  });

  it('rotula proximidade nas próximas escalas', () => {
    const referencia = new Date(2026, 9, 7);
    expect(rotuloProximidade('2026-10-07', referencia)).toBe('Hoje');
    expect(rotuloProximidade('2026-10-08', referencia)).toBe('Amanhã');
    expect(rotuloProximidade('2026-10-09', referencia)).toBe('Sex');
  });

  it('reconhece o dia de hoje', () => {
    expect(ehHoje(chaveData(new Date()))).toBe(true);
    expect(ehHoje('2000-01-01')).toBe(false);
  });

  it('lê a chave como data local (sem deslocar um dia)', () => {
    const data = dataDaChave('2026-10-05');
    expect(data.getFullYear()).toBe(2026);
    expect(data.getMonth()).toBe(9);
    expect(data.getDate()).toBe(5);
  });
});

describe('turnosCalendario · recorrência', () => {
  it('não repete quando a recorrência é única', () => {
    expect(gerarDatasRecorrentes('2026-10-05', 'unica', 10)).toEqual(['2026-10-05']);
  });

  it('gera dias seguidos na recorrência diária', () => {
    expect(gerarDatasRecorrentes('2026-10-05', 'diaria', 3)).toEqual(['2026-10-05', '2026-10-06', '2026-10-07']);
  });

  it('gera semanas seguidas na recorrência semanal', () => {
    expect(gerarDatasRecorrentes('2026-10-05', 'semanal', 3)).toEqual(['2026-10-05', '2026-10-12', '2026-10-19']);
  });

  it('limita a quantidade de ocorrências e ignora data inválida', () => {
    expect(gerarDatasRecorrentes('2026-10-05', 'diaria', 500)).toHaveLength(MAX_OCORRENCIAS_ESCALA);
    expect(gerarDatasRecorrentes('05/10/2026', 'diaria', 3)).toEqual([]);
    expect(gerarDatasRecorrentes('2026-10-05', 'diaria', 0)).toHaveLength(1);
  });
});
