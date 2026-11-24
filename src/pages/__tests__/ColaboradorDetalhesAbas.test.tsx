import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Resíduo visual da PR #546 (muri), AnimatedDossieTabs.tsx: as abas do dossiê do
 * colaborador trocavam sem o indicador deslizante que Avaliação e Premiações já
 * têm, deixando o app visualmente inconsistente.
 *
 * A muri trazia um componente NOVO; a main já tem o mesmo recurso em
 * ui/animated-tabs.tsx — então o resgate APLICA o que existe em vez de duplicar.
 * Montar a página inteira num teste exigiria dezenas de mocks de serviço sem
 * ganho: o que importa é que a faixa de abas mestra use o componente animado e
 * mantenha as 9 abas, e isso se prova lendo o módulo.
 */
describe('ColaboradorDetalhesPage — abas do dossiê', () => {
  const fonte = readFileSync('src/pages/ColaboradorDetalhesPage.tsx', 'utf8');

  it('usa o indicador deslizante compartilhado, não TabsList cru', () => {
    expect(fonte).toContain("from '@/components/ui/animated-tabs'");
    expect(fonte).toContain('<AnimatedTabsList');
    // a faixa MESTRA não pode mais ser TabsList cru
    expect(fonte).not.toContain(
      '<TabsList className="bg-muted/50 rounded-xl p-1 border border-border/30 w-full justify-start overflow-x-auto no-scrollbar">'
    );
  });

  it('mantém as 9 abas do dossiê, com os mesmos valores', () => {
    const valores = [...fonte.matchAll(/<AnimatedTabsTrigger value="([^"]+)"/g)].map((m) => m[1]);
    expect(valores).toEqual([
      'geral',
      'pessoal',
      'profissional',
      'jornada',
      'financeiro',
      'documentos',
      'beneficios',
      'historico',
      'timeline',
    ]);
  });

  it('o estado da aba continua ligado ao mesmo setter', () => {
    expect(fonte).toContain('value={activeMainTab}');
    expect(fonte).toContain('onValueChange={setActiveMainTab}');
  });
});
