import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { sha256Hex } from '@/services/trainingImages';
import { sha256Hex as sha256Backend } from '../../../../supabase/functions/_shared/trainingImages/hash';

/**
 * ============================================================================
 * SHA-256 — vetores oficiais + paridade cliente/backend.
 *
 * O hash identifica o CONTEÚDO na tabela `training_images`. Se cliente e
 * backend divergirem, o claim nunca reconhece a mesma versão (geração
 * duplicada) ou reconhece demais (nunca regenera). Este teste fecha essa porta.
 * ============================================================================
 */

describe('sha256Hex — vetores conhecidos', () => {
  it('codifica corretamente os vetores canônicos', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256Hex('The quick brown fox jumps over the lazy dog')).toBe(
      'd7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592'
    );
  });

  it('confere com o crypto do Node em UTF-8 (acentos, emoji, textos longos)', () => {
    const amostras = [
      'NR-17 Ergonomia',
      'Panificação Artesanal — fermentação natural',
      'Emoji 🥖 e acentuação ção',
      'a'.repeat(1000),
      JSON.stringify({ nome: 'Trilha de Liderança', nivel: 'avancado' }),
    ];
    for (const amostra of amostras) {
      const esperado = createHash('sha256').update(amostra, 'utf8').digest('hex');
      expect(sha256Hex(amostra)).toBe(esperado);
    }
  });

  it('aceita bytes e produz o mesmo resultado da string UTF-8', () => {
    const bytes = new TextEncoder().encode('Primeiros Socorros');
    expect(sha256Hex(bytes)).toBe(sha256Hex('Primeiros Socorros'));
  });

  it('altera o resultado com qualquer mudança de conteúdo', () => {
    expect(sha256Hex('curso A')).not.toBe(sha256Hex('curso B'));
    expect(sha256Hex('curso A ')).not.toBe(sha256Hex('curso A'));
  });
});

describe('paridade cliente × backend', () => {
  it('produz exatamente o mesmo hexadecimal nos dois lados', () => {
    const amostras = ['', 'NR-35 Trabalho em Altura', 'Cultivo de Orquídeas', 'ação/emoji 🥖', 'x'.repeat(500)];
    for (const amostra of amostras) {
      expect(sha256Backend(amostra)).toBe(sha256Hex(amostra));
    }
  });
});
