import { describe, expect, it } from 'vitest';
import { VAGA_GRADIENTS, gradienteDaVaga } from '../vagasGradients';

describe('vagasGradients — configuração dos cinco degradês', () => {
  it('cobre as cinco identidades, uma por família', () => {
    expect(Object.keys(VAGA_GRADIENTS)).toEqual(['info', 'chart-4', 'warning', 'success', 'aqua']);
    const familias = Object.values(VAGA_GRADIENTS).map((g) => g.familia);
    expect(new Set(familias)).toEqual(
      new Set(['tecnologia', 'recursosHumanos', 'administrativo', 'comercial', 'dados'])
    );
    expect(familias).toHaveLength(5);
  });

  it('usa exatamente 2 radiais + 1 linear por card (camadas independentes)', () => {
    for (const gradiente of Object.values(VAGA_GRADIENTS)) {
      expect(gradiente.fundo.match(/radial-gradient\(/g)).toHaveLength(2);
      expect(gradiente.fundo.match(/linear-gradient\(/g)).toHaveLength(1);
    }
  });

  it('mantém borda translúcida e um passo mais forte no hover', () => {
    for (const gradiente of Object.values(VAGA_GRADIENTS)) {
      expect(gradiente.borda).toMatch(/^rgba\(\d+, \d+, \d+, 0\.\d+\)$/);
      expect(gradiente.bordaHover).toMatch(/^rgba\(\d+, \d+, \d+, 0\.\d+\)$/);
      const alpha = (cor: string) => Number(cor.match(/, (0\.\d+)\)$/)?.[1] ?? 0);
      expect(alpha(gradiente.bordaHover)).toBeGreaterThan(alpha(gradiente.borda));
    }
  });

  it('não usa glow, sombra nem imagem rasterizada', () => {
    for (const gradiente of Object.values(VAGA_GRADIENTS)) {
      const css = `${gradiente.fundo} ${gradiente.borda} ${gradiente.bordaHover}`;
      expect(css).not.toMatch(/shadow|glow|url\(/);
    }
  });

  it('devolve a configuração pelo token de identidade', () => {
    expect(gradienteDaVaga('info')).toBe(VAGA_GRADIENTS.info);
    expect(gradienteDaVaga('aqua')).toBe(VAGA_GRADIENTS.aqua);
  });
});
