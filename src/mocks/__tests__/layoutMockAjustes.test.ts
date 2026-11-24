/**
 * Vitrine da **Central de Ajustes** (`layoutMock/dados.ts`).
 *
 * O mock é a fonte da demonstração aprovada: a tabela, os quatro KPIs e os
 * contadores dos chips leem ESTAS linhas. O teste trava os números que a tela
 * promete — 6 pendentes, 3 aprovadas, 1 rejeitada e 2 em risco alto nos últimos
 * 30 dias — e garante que o período ANTERIOR (35–47 dias atrás) existe apenas
 * como base de comparação, sem inflar a listagem nem os contadores do presente.
 */
import { describe, it, expect } from 'vitest';
import { construirTabelas } from '../layoutMock/dados';
import { addDaysLocal, formatDateLocalISO } from '@/utils/dateLocal';
import {
  contarAjustes,
  resumoAjustes,
  variacoesAjustes,
  type SolicitacaoAjustePonto,
} from '@/components/ponto/centralAjustes';

const tabelas = construirTabelas();
const linhas = (tabelas.solicitacoes_ajuste_ponto ?? []) as unknown as SolicitacaoAjustePonto[];

const dia = (offset: number) => formatDateLocalISO(addDaysLocal(new Date(), offset));

/** Janela `[inicio, fim]` em datas locais, inclusive nas pontas. */
const janela = (inicio: number, fim: number) => ({ inicio: dia(inicio), fim: dia(fim) });

const dentro = (inicio: number, fim: number) =>
  linhas.filter((l) => String(l.data_ponto) >= dia(inicio) && String(l.data_ponto) <= dia(fim));

describe('vitrine de solicitações de ajuste', () => {
  it('tem 10 solicitações nos últimos 30 dias (a tela nunca nasce vazia)', () => {
    expect(dentro(-29, 0)).toHaveLength(10);
  });

  it('bate os números da referência: 6 pendentes, 3 aprovadas, 1 rejeitada', () => {
    const periodo = dentro(-29, 0);
    expect(contarAjustes(periodo)).toEqual({ todos: 10, pendentes: 6, aprovadas: 3, rejeitadas: 1 });
  });

  it('marca 2 solicitações em risco alto', () => {
    expect(resumoAjustes(dentro(-29, 0)).riscoElevado).toBe(2);
  });

  it('as linhas do período anterior ficam FORA da listagem atual', () => {
    const anteriores = dentro(-59, -30);
    expect(anteriores).toHaveLength(3);
    expect(resumoAjustes(anteriores)).toEqual({
      todos: 3,
      pendentes: 0,
      aprovadas: 2,
      rejeitadas: 1,
      riscoElevado: 1,
    });
  });

  it('a variação dos KPIs contra o período anterior é calculável', () => {
    expect(variacoesAjustes(resumoAjustes(dentro(-29, 0)), resumoAjustes(dentro(-59, -30)))).toEqual({
      pendentes: null, // sem pendentes na base — o card esconde o selo
      aprovadas: 50,
      rejeitadas: 0,
      riscoElevado: 100,
    });
  });

  it('toda solicitação traz justificativa, horário pedido e relatório de conformidade', () => {
    linhas.forEach((linha) => {
      expect(String(linha.motivo ?? '').length).toBeGreaterThan(20);
      expect(String(linha.hora_sugerida ?? '')).toMatch(/^\d{2}:\d{2}$/);
      expect(linha.relatorio_conformidade?.portaria_671_conformidade).toBe(true);
      expect(String(linha.relatorio_conformidade?.sha256_integridade ?? '')).toMatch(/^[0-9a-f]{64}$/);
      expect(linha.relatorio_conformidade?.ia_risco?.nivel).toMatch(/^(baixo|medio|alto)$/);
    });
  });

  it('as datas caem dentro das janelas esperadas (7, 30 e 60 dias)', () => {
    expect(janela(-29, 0).inicio < janela(-6, 0).inicio).toBe(true);
    expect(dentro(-6, 0).length).toBeGreaterThanOrEqual(6);
    expect(dentro(-90, 0)).toHaveLength(linhas.length);
  });
});
