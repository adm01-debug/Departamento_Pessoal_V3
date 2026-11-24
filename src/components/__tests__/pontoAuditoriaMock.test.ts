/**
 * Mock demonstrativo da Central de Auditoria — invariantes que a vitrine precisa
 * manter para não mentir na tela.
 *
 * O mock não inventa selo: ele grava o `hash_integridade` com a receita REAL e
 * deixa UMA linha com o digest trocado, para a tela exibir "Divergente". O teste
 * garante que essa linha continua divergindo em qualquer dia do calendário — foi
 * exatamente aqui que a troca cega do primeiro caractere (`'0' + resto`) falhou:
 * quando o SHA-256 já começava em '0', o "hash corrompido" era o próprio digest
 * válido e a demonstração perdia o único caso de fraude.
 */
import { describe, expect, it } from 'vitest';
import { trilhaAuditoriaDemonstrativa } from '@/mocks/pontoAuditoriaMock';
import { evidenciaDoEvento, normalizarEventos } from '../ponto/centralAuditoria';

/** Base fixa: o teste não pode depender do dia em que roda. */
const BASE = new Date('2026-01-05T12:00:00.000Z');

function dias(quantidade: number): Date[] {
  return Array.from(
    { length: quantidade },
    (_, indice) => new Date(BASE.getTime() + indice * 24 * 60 * 60 * 1000)
  );
}

function pareceres(agora: Date) {
  const eventos = normalizarEventos(trilhaAuditoriaDemonstrativa(agora));
  return eventos.map((evento) => ({
    tabela: evento.tabela,
    operacao: evento.operacao,
    ...evidenciaDoEvento(evento),
  }));
}

describe('trilha demonstrativa de auditoria', () => {
  it('mantém exatamente uma linha divergente em qualquer dia do calendário', () => {
    for (const agora of dias(120)) {
      const divergentes = pareceres(agora).filter((parecer) => parecer.estado === 'divergente');
      expect(divergentes).toHaveLength(1);
    }
  });

  it('o digest corrompido difere do recalculado só no primeiro caractere', () => {
    for (const agora of dias(120)) {
      const divergente = pareceres(agora).find((parecer) => parecer.estado === 'divergente');
      if (!divergente) throw new Error('nenhuma linha divergente na trilha demonstrativa');
      const { hashRegistrado, hashCalculado } = divergente;
      if (!hashRegistrado || !hashCalculado) throw new Error('parecer divergente sem os dois hashes');
      expect(hashRegistrado).not.toBe(hashCalculado);
      expect(hashRegistrado.slice(1)).toBe(hashCalculado.slice(1));
      expect(hashRegistrado.slice(0, 1)).not.toBe(hashCalculado.slice(0, 1));
    }
  });

  it('as batidas de ponto com receita continuam verificadas', () => {
    // A única batida fora da receita é a de DELETE (exclusão não tem digest),
    // que por regra cai em "Revisão recomendada" — não em "Não verificada".
    const batidas = pareceres(BASE).filter(
      (parecer) => parecer.tabela === 'batidas_ponto' && parecer.operacao !== 'DELETE'
    );
    expect(batidas.length).toBeGreaterThan(4);
    for (const batida of batidas) {
      expect(['verificada', 'divergente']).toContain(batida.estado);
    }
    expect(batidas.filter((batida) => batida.estado === 'verificada').length).toBeGreaterThan(3);
  });

  it('a exclusão de batida sem digest pede revisão, nunca "verificada"', () => {
    const exclusao = pareceres(BASE).find(
      (parecer) => parecer.tabela === 'batidas_ponto' && parecer.operacao === 'DELETE'
    );
    if (!exclusao) throw new Error('a trilha demonstrativa precisa manter uma exclusão de batida');
    expect(exclusao.estado).toBe('revisao');
    expect(exclusao.rotulo).toBe('Revisão recomendada');
  });
});
