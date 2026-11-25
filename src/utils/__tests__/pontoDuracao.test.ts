import { describe, it, expect } from 'vitest';
import { MINUTOS_POR_HORA, minutosDeDuracao, formatarMinutosDuracao, horasDecimaisDeMinutos } from '../pontoDuracao';

describe('pontoDuracao', () => {
  describe('minutosDeDuracao', () => {
    it('converte HH:MM em minutos', () => {
      expect(minutosDeDuracao('08:30')).toBe(510);
      expect(minutosDeDuracao('00:00')).toBe(0);
      expect(minutosDeDuracao('1:05')).toBe(65);
    });

    it('ignora os segundos de HH:MM:SS (formato gravado pela edge function)', () => {
      expect(minutosDeDuracao('08:30:15')).toBe(510);
    });

    it('interpreta débito com sinal negativo', () => {
      expect(minutosDeDuracao('-01:45')).toBe(-105);
    });

    it('interpreta número como horas decimais', () => {
      expect(minutosDeDuracao(7.5)).toBe(450);
      expect(minutosDeDuracao(0)).toBe(0);
    });

    it('devolve 0 para entrada ausente ou inválida (contrato defensivo)', () => {
      expect(minutosDeDuracao(null)).toBe(0);
      expect(minutosDeDuracao(undefined)).toBe(0);
      expect(minutosDeDuracao('')).toBe(0);
      expect(minutosDeDuracao('sem hora')).toBe(0);
      expect(minutosDeDuracao(Number.NaN)).toBe(0);
    });

    it('mantém 60 minutos por hora', () => {
      expect(MINUTOS_POR_HORA).toBe(60);
      expect(minutosDeDuracao('01:00')).toBe(MINUTOS_POR_HORA);
    });
  });

  describe('formatarMinutosDuracao', () => {
    it('formata minutos como HH:MM com zero-padding', () => {
      expect(formatarMinutosDuracao(510)).toBe('08:30');
      expect(formatarMinutosDuracao(65)).toBe('01:05');
      expect(formatarMinutosDuracao(0)).toBe('00:00');
    });

    it('prefixa o sinal negativo e nunca mostra "-00:00"', () => {
      expect(formatarMinutosDuracao(-105)).toBe('-01:45');
      expect(formatarMinutosDuracao(-30)).toBe('-00:30');
      expect(formatarMinutosDuracao(-0.4)).toBe('00:00');
    });

    it('prefixa "+" só quando o sinal é pedido e o valor é positivo', () => {
      expect(formatarMinutosDuracao(125, { sinal: true })).toBe('+02:05');
      expect(formatarMinutosDuracao(0, { sinal: true })).toBe('00:00');
      expect(formatarMinutosDuracao(-125, { sinal: true })).toBe('-02:05');
      expect(formatarMinutosDuracao(125)).toBe('02:05');
    });

    it('devolve --:-- para valor não finito em vez de NaN:NaN', () => {
      expect(formatarMinutosDuracao(Number.NaN)).toBe('--:--');
      expect(formatarMinutosDuracao(Number.POSITIVE_INFINITY)).toBe('--:--');
    });

    it('arredonda a fração de minuto', () => {
      expect(formatarMinutosDuracao(59.6)).toBe('01:00');
    });
  });

  describe('horasDecimaisDeMinutos', () => {
    it('converte minutos em horas decimais com 2 casas', () => {
      expect(horasDecimaisDeMinutos(510)).toBe(8.5);
      expect(horasDecimaisDeMinutos(90)).toBe(1.5);
      expect(horasDecimaisDeMinutos(10)).toBe(0.17);
    });

    it('devolve 0 para valor não finito (eixo do gráfico nunca recebe NaN)', () => {
      expect(horasDecimaisDeMinutos(Number.NaN)).toBe(0);
    });
  });

  it('faz ida e volta minutos → HH:MM → minutos', () => {
    [0, 30, 65, 510, 1439].forEach((minutos) => {
      expect(minutosDeDuracao(formatarMinutosDuracao(minutos))).toBe(minutos);
    });
  });
});
