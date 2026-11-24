import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetaCard } from '@/components/avaliacao/MetaCard';
import {
  CLASSE_NEUTRA,
  CLASSE_SITUACAO,
  CLASSE_TIPO,
  ETIQUETA_BASE,
  tomTipo,
  type MetaDerivada,
} from '@/components/avaliacao/metasComum';

/**
 * Prova do MAPEAMENTO VISUAL das etiquetas do card (tipo + situação).
 *
 * Cobre, de forma determinística, os tons que os dados de tela não exercem
 * (OKR, tipo desconhecido/vazio, status atrasada e o tom neutro reservado) e
 * confere que tipo e situação compartilham a MESMA base geométrica — que é o
 * que garante altura, padding e peso iguais no card.
 */

/** Meta mínima com os campos que o card realmente consome. */
function metaDerivada(extra: Partial<MetaDerivada> = {}): MetaDerivada {
  return {
    meta: {
      id: 'm1',
      titulo: 'Meta de teste',
      descricao: 'Descrição',
      tipo: 'individual',
      status: 'ativo',
      data_limite: '2026-12-31',
      progresso: 50,
    },
    percentual: 50,
    situacao: 'emdia',
    dias: 10,
    prazo: '31/12/2026',
    responsavel: 'Ana Souza',
    departamento: 'TI',
    evolucao: null,
    ...extra,
  };
}

describe('metasComum — tom do TIPO da meta', () => {
  it('mapeia cada tipo real para o tom da sua família de cor', () => {
    expect(tomTipo('individual')).toBe(CLASSE_TIPO.individual);
    expect(tomTipo('equipe')).toBe(CLASSE_TIPO.equipe);
    expect(tomTipo('empresa')).toBe(CLASSE_TIPO.empresa);
    expect(tomTipo('okr')).toBe(CLASSE_TIPO.okr);
  });

  it('trata o tipo como texto livre: caixa/espaços não mudam o tom', () => {
    expect(tomTipo(' Equipe ')).toBe(CLASSE_TIPO.equipe);
    expect(tomTipo('EMPRESA')).toBe(CLASSE_TIPO.empresa);
  });

  it('joga o composto "okr - equipe" na família de OKR (mesma regra do rótulo/ícone)', () => {
    expect(tomTipo('okr - equipe')).toBe(CLASSE_TIPO.okr);
    expect(tomTipo('OKR + Equipe')).toBe(CLASSE_TIPO.okr);
  });

  it('cai no tom NEUTRO sem valor utilizável ou com valor desconhecido', () => {
    expect(tomTipo(undefined)).toBe(CLASSE_NEUTRA);
    expect(tomTipo('')).toBe(CLASSE_NEUTRA);
    expect(tomTipo('   ')).toBe(CLASSE_NEUTRA);
    expect(tomTipo('departamento')).toBe(CLASSE_NEUTRA);
  });

  it('usa uma cor do sistema por família (sem cor solta)', () => {
    expect(CLASSE_TIPO.individual).toContain('text-info');
    expect(CLASSE_TIPO.okr).toContain('text-primary');
    expect(CLASSE_TIPO.equipe).toContain('hsl(var(--chart-4))');
    expect(CLASSE_TIPO.empresa).toContain('hsl(var(--chart-2))');
    expect(CLASSE_NEUTRA).toContain('text-muted-foreground');
  });
});

describe('metasComum — pele do STATUS da meta', () => {
  it('cobre as quatro situações derivadas com cores semânticas distintas', () => {
    expect(CLASSE_SITUACAO.emdia).toContain('success');
    expect(CLASSE_SITUACAO.risco).toContain('warning');
    expect(CLASSE_SITUACAO.atrasada).toContain('destructive-vivid');
    expect(CLASSE_SITUACAO.concluida).toContain('info');
    // Concluída NÃO pode repetir o verde de "Em dia": dividem a mesma posição.
    expect(CLASSE_SITUACAO.concluida).not.toContain('success');
    expect(new Set(Object.values(CLASSE_SITUACAO)).size).toBe(4);
  });

  it('dá ao status MAIS intensidade que ao tipo (20 %/45 % contra 10 %/25 %)', () => {
    Object.values(CLASSE_SITUACAO).forEach((tom) => {
      expect(tom).toMatch(/\/0?\.?20/);
      expect(tom).toMatch(/\/0?\.?45/);
    });
    Object.values(CLASSE_TIPO).forEach((tom) => {
      expect(tom).toMatch(/\/0?\.?10/);
      expect(tom).toMatch(/\/0?\.?25/);
    });
  });
});

describe('MetaCard — padronização das etiquetas', () => {
  it('aplica a MESMA base geométrica no tipo e na situação', () => {
    render(<MetaCard item={metaDerivada()} indice={0} reduzirMovimento />);

    // O texto do tipo vive dentro de um `span.truncate`; a etiqueta é o pai.
    const tipo = screen.getByText('Individual').parentElement!;
    const status = screen.getByText('Em dia');

    [tipo, status].forEach((el) => {
      ETIQUETA_BASE.split(' ').forEach((cls) => expect(el.className).toContain(cls));
    });
    // ...e cada um com o tom da sua categoria.
    expect(tipo.className).toContain('text-info');
    expect(status.className).toContain('text-success');
  });

  it('usa o tom neutro na etiqueta de tipo sem valor utilizável', () => {
    render(<MetaCard item={metaDerivada({ meta: { tipo: '' } })} indice={0} reduzirMovimento />);
    const tipo = screen.getByText('Meta').parentElement!;
    ETIQUETA_BASE.split(' ').forEach((cls) => expect(tipo.className).toContain(cls));
    expect(tipo.className).toContain('text-muted-foreground');
    expect(tipo.className).not.toContain('text-info');
  });

  it('pinta o status ATRASADA com o vermelho do sistema', () => {
    render(<MetaCard item={metaDerivada({ situacao: 'atrasada', dias: -6 })} indice={0} reduzirMovimento />);
    const status = screen.getByText('Atrasada');
    expect(status.className).toContain('text-destructive-vivid');
  });
});
