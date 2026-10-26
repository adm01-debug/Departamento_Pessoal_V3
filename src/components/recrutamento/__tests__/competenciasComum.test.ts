import { describe, expect, it } from 'vitest';
import { normalizarCompetencia, temaDaCompetencia } from '../competenciasComum';

describe('competenciasComum — cores determinísticas das tags', () => {
  it('usa o hex aprovado para as nove competências da referência', () => {
    expect(temaDaCompetencia('SQL').texto).toBe('text-[#38bdf8]');
    expect(temaDaCompetencia('Power BI').texto).toBe('text-[#facc15]');
    expect(temaDaCompetencia('Python').texto).toBe('text-[#a78bfa]');
    expect(temaDaCompetencia('React').texto).toBe('text-[#22d3ee]');
    expect(temaDaCompetencia('TypeScript').texto).toBe('text-[#60a5fa]');
    expect(temaDaCompetencia('Node.js').texto).toBe('text-[#4ade80]');
    expect(temaDaCompetencia('Recrutamento').texto).toBe('text-[#c084fc]');
    expect(temaDaCompetencia('People Analytics').texto).toBe('text-[#2dd4bf]');
    expect(temaDaCompetencia('Excel avançado').texto).toBe('text-[#34d399]');
  });

  it('fundo e borda vêm da MESMA família do texto', () => {
    const tema = temaDaCompetencia('SQL');
    expect(tema.fundo).toBe('bg-[#38bdf8]/12');
    expect(tema.borda).toBe('border-[#38bdf8]/30');
  });

  it('normaliza caixa, acentos e espaços extras', () => {
    expect(normalizarCompetencia('  PEOPLE   Analytics ')).toBe('people analytics');
    expect(temaDaCompetencia('EXCEL AVANÇADO')).toEqual(temaDaCompetencia('Excel avançado'));
    expect(temaDaCompetencia('people  analytics')).toEqual(temaDaCompetencia('People Analytics'));
  });

  it('é determinístico para competências fora da tabela (nunca por índice)', () => {
    const primeira = temaDaCompetencia('Kotlin');
    const segunda = temaDaCompetencia('Kotlin');
    expect(segunda).toBe(primeira);
    // A mesma competência em vagas diferentes mantém a cor, independente da ordem.
    expect(temaDaCompetencia('Gestão de Projetos')).toEqual(temaDaCompetencia('gestao de projetos'));
  });

  it('nenhum tema carrega glow, sombra ou gradiente', () => {
    for (const nome of ['SQL', 'Power BI', 'Kotlin', '+2']) {
      const tema = temaDaCompetencia(nome);
      expect(`${tema.texto} ${tema.fundo} ${tema.borda}`).not.toMatch(/shadow|glow|gradient/);
    }
  });
});
