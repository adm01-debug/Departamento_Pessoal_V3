import { describe, expect, it } from 'vitest';
import { destinoEvento, destinoPendencia } from '@/components/colaborador-detalhes/destinosDossie';
import type { PendenciaChave } from '@/hooks/usePendenciasColaborador';

// Devin e Codex acharam, cada um por conta própria, que os atalhos do dossiê
// trocavam só a aba PRINCIPAL e deixavam a sub-aba no padrão — então o botão
// prometia um destino e entregava outro. Os dois notaram também que os testes
// dos diálogos só provam que o callback foi chamado, não para onde ele leva.
// Estes casos travam o destino.

describe('destinoPendencia', () => {
  it('ajuste de ponto vai para Jornada > Ponto', () => {
    expect(destinoPendencia('ponto')).toEqual({ principal: 'jornada', sub: 'ponto' });
  });

  it('onboarding atrasado vai para Profissional > Desenvolvimento, não Trabalho', () => {
    expect(destinoPendencia('onboarding')).toEqual({
      principal: 'profissional',
      sub: 'desenvolvimento',
    });
  });

  it('ASO vencido fica no dossiê, em Profissional > ASO', () => {
    expect(destinoPendencia('aso')).toEqual({ principal: 'profissional', sub: 'aso' });
  });

  it('documento vencido vai para Documentos > Documentos Pessoais, NÃO para a aba Pessoal', () => {
    const d = destinoPendencia('documentos');
    expect(d).toEqual({ principal: 'documentos', sub: 'pessoais' });
    // A aba "pessoal" é dependentes/emergência/PCD/estrangeiro — era o destino
    // errado do código original.
    expect(d.principal).not.toBe('pessoal');
  });

  it('toda chave de pendência tem destino com sub-aba', () => {
    const chaves: PendenciaChave[] = ['ponto', 'onboarding', 'aso', 'documentos'];
    for (const c of chaves) {
      const d = destinoPendencia(c);
      expect(d.principal).toBeTruthy();
      expect(d.sub).toBeTruthy();
    }
  });
});

describe('destinoEvento', () => {
  it('as duas variantes de férias vão para Jornada > Férias, não Ponto', () => {
    expect(destinoEvento('ferias_vencimento')).toEqual({ principal: 'jornada', sub: 'ferias' });
    expect(destinoEvento('ferias_inicio')).toEqual({ principal: 'jornada', sub: 'ferias' });
  });

  it('ASO vai para Profissional > ASO', () => {
    expect(destinoEvento('aso')).toEqual({ principal: 'profissional', sub: 'aso' });
  });

  it('onboarding vai para Profissional > Desenvolvimento', () => {
    expect(destinoEvento('onboarding')).toEqual({
      principal: 'profissional',
      sub: 'desenvolvimento',
    });
  });

  it('documento vai para Documentos > Documentos Pessoais', () => {
    expect(destinoEvento('documento')).toEqual({ principal: 'documentos', sub: 'pessoais' });
  });

  it('fim de experiência vai para Profissional > Experiência', () => {
    expect(destinoEvento('experiencia')).toEqual({
      principal: 'profissional',
      sub: 'experiencia',
    });
  });

  // Os 6 tipos que useProximosEventos de fato emite hoje.
  it('cobre os 6 tipos emitidos pelo hook, sem cair no padrão', () => {
    const tipos = ['experiencia', 'ferias_vencimento', 'ferias_inicio', 'aso', 'documento', 'onboarding'];
    const padrao = destinoEvento('__tipo_que_nao_existe__');
    const comDestinoProprio = tipos.filter((t) => {
      const d = destinoEvento(t);
      return !(d.principal === padrao.principal && d.sub === padrao.sub);
    });
    // 'onboarding' coincide com o padrão de propósito, então 5 dos 6 diferem.
    expect(comDestinoProprio).toHaveLength(5);
  });

  it('tipo desconhecido não quebra nem manda para lugar aleatório', () => {
    const d = destinoEvento('tipo_novo_do_futuro');
    expect(d.principal).toBe('profissional');
    expect(d.sub).toBe('desenvolvimento');
  });
});
