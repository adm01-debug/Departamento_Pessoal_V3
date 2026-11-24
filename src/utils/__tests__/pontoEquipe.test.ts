import { describe, it, expect } from 'vitest';
import { resumirEquipeDoDia, temSaidaPendente, type BatidaEquipe } from '../pontoEquipe';

/** Atalho: batida do colaborador em um tipo qualquer. */
function batida(colaborador_id: string, tipo: string): BatidaEquipe {
  return { colaborador_id, tipo };
}

describe('pontoEquipe', () => {
  describe('resumirEquipeDoDia', () => {
    it('devolve zeros quando não há batidas nem colaboradores', () => {
      expect(resumirEquipeDoDia([], 0)).toEqual({
        comBatida: 0,
        encerraram: 0,
        emJornada: 0,
        emIntervalo: 0,
        semBatida: 0,
        cobertura: 0,
      });
    });

    it('separa quem está em intervalo de almoço (subconjunto de emJornada)', () => {
      const resumo = resumirEquipeDoDia(
        [batida('a', 'entrada'), batida('b', 'entrada'), batida('b', 'saida_almoco')],
        2
      );

      expect(resumo.emJornada).toBe(2);
      expect(resumo.emIntervalo).toBe(1);
      // Voltar do almoço tira o colaborador do intervalo, mas não da jornada.
      expect(resumirEquipeDoDia([batida('b', 'saida_almoco'), batida('b', 'retorno_almoco')], 1).emIntervalo).toBe(0);
    });

    it('conta cada colaborador uma única vez', () => {
      const resumo = resumirEquipeDoDia(
        [
          batida('a', 'entrada'),
          batida('a', 'saida_almoco'),
          batida('a', 'retorno_almoco'),
          batida('b', 'entrada'),
          batida('b', 'saida'),
        ],
        2
      );

      expect(resumo.comBatida).toBe(2);
      expect(resumo.encerraram).toBe(1);
      expect(resumo.emJornada).toBe(1);
    });

    it('não considera jornada encerrada quando a última batida é saida_almoco', () => {
      const resumo = resumirEquipeDoDia([batida('a', 'entrada'), batida('a', 'saida_almoco')], 1);

      expect(resumo.encerraram).toBe(0);
      expect(resumo.emJornada).toBe(1);
    });

    it('volta a contar o colaborador em jornada se ele bateu entrada depois da saída', () => {
      const resumo = resumirEquipeDoDia([batida('a', 'entrada'), batida('a', 'saida'), batida('a', 'entrada')], 1);

      expect(resumo.encerraram).toBe(0);
      expect(resumo.emJornada).toBe(1);
    });

    it('assume a última batida da lista como a válida (ordem cronológica)', () => {
      const resumo = resumirEquipeDoDia([batida('a', 'saida'), batida('a', 'entrada')], 1);
      expect(resumo.emJornada).toBe(1);

      const invertido = resumirEquipeDoDia([batida('a', 'entrada'), batida('a', 'saida')], 1);
      expect(invertido.emJornada).toBe(0);
      expect(invertido.encerraram).toBe(1);
    });

    it('normaliza o tipo antes de comparar (maiúsculas e espaços)', () => {
      const resumo = resumirEquipeDoDia([batida('a', ' SAIDA ')], 1);
      expect(resumo.encerraram).toBe(1);
    });

    it('calcula cobertura e colaboradores sem batida', () => {
      const resumo = resumirEquipeDoDia([batida('a', 'entrada'), batida('b', 'entrada')], 4);

      expect(resumo.comBatida).toBe(2);
      expect(resumo.semBatida).toBe(2);
      expect(resumo.cobertura).toBe(50);
    });

    it('limita a cobertura a 100% quando há mais batidas que colaboradores ativos', () => {
      const resumo = resumirEquipeDoDia([batida('a', 'entrada'), batida('b', 'entrada')], 1);
      expect(resumo.cobertura).toBe(100);
      expect(resumo.semBatida).toBe(0);
    });

    it('ignora batidas sem colaborador_id', () => {
      const resumo = resumirEquipeDoDia([{ tipo: 'entrada' }, batida('a', 'entrada')], 1);
      expect(resumo.comBatida).toBe(1);
    });

    it('nunca devolve número negativo', () => {
      const resumo = resumirEquipeDoDia([], 3);
      expect(resumo.emJornada).toBe(0);
      expect(resumo.semBatida).toBe(3);
    });
  });

  describe('temSaidaPendente', () => {
    it('marca pendência quando há entrada e nenhuma saída', () => {
      expect(temSaidaPendente({ entrada_1: '08:00', saida_1: null })).toBe(true);
    });

    it('não marca pendência quando a saída foi registrada', () => {
      expect(temSaidaPendente({ entrada_1: '08:00', saida_1: '17:00' })).toBe(false);
    });

    it('não marca pendência em dia sem entrada (folga, feriado, falta)', () => {
      expect(temSaidaPendente({ entrada_1: null, saida_1: null })).toBe(false);
    });
  });
});
