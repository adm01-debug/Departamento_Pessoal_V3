/**
 * Ações de feedback — camada de decisão dos controles (pura).
 * Garante as regras pedidas: RH também gerencia (admin+rh), Validação de
 * Potencial EXCLUSIVA do RH e situação da validação comparada com a versão
 * canônica vinda do banco.
 */
import { describe, it, expect } from 'vitest';
import {
  acoesDisponiveis,
  ehAvaliadorDesignado,
  ehGestorResponsavel,
  exigeJustificativa,
  perfisOperadorEfetivos,
  perfilOperador,
  podeConcluirFeedback,
  podeValidarPotencial,
  rotuloStatus,
  situacaoPotencial,
} from '../avaliacao/acoesFeedback';

function acao(acoes: ReturnType<typeof acoesDisponiveis>, nome: string) {
  return acoes.find((a) => a.acao === nome)!;
}

describe('perfilOperador (app_role real: admin|gestor|rh|user)', () => {
  it('mapeia os papéis administrativos e operacionais', () => {
    expect(perfilOperador('admin')).toBe('admin_rh');
    expect(perfilOperador('rh')).toBe('admin_rh');
    expect(perfilOperador('gestor')).toBe('gestor');
    expect(perfilOperador('user')).toBe('avaliador');
    expect(perfilOperador(' RH ')).toBe('admin_rh');
  });

  it('papel ausente/desconhecido não vira permissão', () => {
    expect(perfilOperador(null)).toBe('desconhecido');
    expect(perfilOperador(undefined)).toBe('desconhecido');
    expect(perfilOperador('financeiro')).toBe('desconhecido');
  });
});

describe('podeValidarPotencial — exclusivo do RH', () => {
  it('somente o papel rh pode validar Potencial', () => {
    expect(podeValidarPotencial('rh')).toBe(true);
    expect(podeValidarPotencial(' RH ')).toBe(true);
  });

  it('admin, gestor e user NÃO validam Potencial (decisão do RH)', () => {
    expect(podeValidarPotencial('admin')).toBe(false);
    expect(podeValidarPotencial('gestor')).toBe(false);
    expect(podeValidarPotencial('user')).toBe(false);
    expect(podeValidarPotencial(null)).toBe(false);
  });
});

describe('acoesDisponiveis por status e papel', () => {
  it('pendente + admin/rh: CANCELA e, com autorização efetiva, conclui', () => {
    const semAutorizacao = acoesDisponiveis({ statusAtual: 'pendente', papel: 'rh' });
    expect(acao(semAutorizacao, 'concluir').disponivel).toBe(false);
    expect(acao(semAutorizacao, 'concluir').motivoBloqueio).toContain('autorização');

    const acoes = acoesDisponiveis({ statusAtual: 'pendente', papel: 'rh', autorizadoConcluir: true });
    expect(acao(acoes, 'concluir').disponivel).toBe(true);
    expect(acao(acoes, 'cancelar').disponivel).toBe(true);
    expect(acao(acoes, 'reabrir').disponivel).toBe(false);
    expect(acao(acoes, 'reabrir').motivoBloqueio).toBeTruthy();
  });

  it('concluido: cancelar bloqueado (exige reabrir antes); reabrir só admin/rh', () => {
    const admin = acoesDisponiveis({ statusAtual: 'concluido', papel: 'admin' });
    expect(acao(admin, 'cancelar').disponivel).toBe(false);
    expect(acao(admin, 'cancelar').motivoBloqueio).toContain('reabrir');
    expect(acao(admin, 'reabrir').disponivel).toBe(true);

    const gestor = acoesDisponiveis({ statusAtual: 'concluido', papel: 'gestor', responsavel: true });
    expect(acao(gestor, 'reabrir').disponivel).toBe(false);
  });

  it('avaliador (user) designado conclui; sem designação não vê o controle', () => {
    const designado = acoesDisponiveis({
      statusAtual: 'pendente',
      papel: 'user',
      autorizadoConcluir: true,
    });
    expect(acao(designado, 'concluir').disponivel).toBe(true);
    expect(acao(designado, 'cancelar').disponivel).toBe(false);

    const semDesignacao = acoesDisponiveis({ statusAtual: 'pendente', papel: 'user' });
    expect(acao(semDesignacao, 'concluir').disponivel).toBe(false);
    expect(acao(semDesignacao, 'cancelar').disponivel).toBe(false);
  });

  it('gestor SEM supervisor ainda conclui quando é o avaliador designado', () => {
    const semVinculo = acoesDisponiveis({
      statusAtual: 'pendente',
      papel: 'gestor',
      autorizadoConcluir: true,
    });
    expect(acao(semVinculo, 'concluir').disponivel).toBe(true);
    expect(acao(semVinculo, 'concluir').motivoBloqueio).toBeNull();

    const semAutorizacao = acoesDisponiveis({ statusAtual: 'pendente', papel: 'gestor' });
    expect(acao(semAutorizacao, 'concluir').disponivel).toBe(false);
    expect(acao(semAutorizacao, 'concluir').motivoBloqueio).toContain('autorização');
  });

  it('gestor RESPONSÁVEL recebe a conclusão quando o estado permite', () => {
    const comVinculo = acoesDisponiveis({ statusAtual: 'pendente', papel: 'gestor', responsavel: true });
    expect(acao(comVinculo, 'concluir').disponivel).toBe(true);
    expect(acao(comVinculo, 'concluir').motivoBloqueio).toBeNull();
    // Já concluída: não há o que concluir, mesmo sendo o responsável.
    const jaConcluida = acoesDisponiveis({ statusAtual: 'concluido', papel: 'gestor', responsavel: true });
    expect(acao(jaConcluida, 'concluir').disponivel).toBe(false);
  });

  it('status desconhecido não oferece nenhum controle', () => {
    const acoes = acoesDisponiveis({ statusAtual: 'em_analise', papel: 'admin' });
    expect(acoes.every((a) => a.disponivel === false)).toBe(true);
    expect(acao(acoes, 'concluir').motivoBloqueio).toContain('não reconhecido');
  });

  it('rótulos e obrigatoriedade de motivo vêm da camada pura', () => {
    const acoes = acoesDisponiveis({ statusAtual: 'pendente', papel: 'gestor', responsavel: true });
    expect(acao(acoes, 'concluir').rotulo).toBe('Concluir avaliação');
    expect(acao(acoes, 'concluir').exigeJustificativa).toBe(false);
    expect(acao(acoes, 'cancelar').exigeJustificativa).toBe(true);
    expect(acao(acoes, 'cancelar').destrutiva).toBe(true);
    expect(exigeJustificativa('reabrir')).toBe(true);
    expect(exigeJustificativa('concluir')).toBe(false);
  });
});

describe('conclusão — autorização do REGISTRO, não do tipo', () => {
  const usuarioId = 'u-1';
  const vinculos = [
    { id: 'c-gestor', user_id: 'u-1', supervisor_id: 'c-diretor' },
    { id: 'c-equipe', user_id: 'u-9', supervisor_id: 'c-gestor' },
    { id: 'c-par', user_id: 'u-2', supervisor_id: 'c-outro' },
  ];

  it('avaliador designado conclui mesmo SEM supervisor atribuído', () => {
    expect(
      podeConcluirFeedback({
        papeis: ['gestor'],
        avaliadorId: 'c-gestor',
        vinculos,
        usuarioId,
        responsavel: false,
      })
    ).toBe(true);
    // O tipo não participa da decisão: o mesmo avaliador vale para Par/Auto/etc.
    expect(ehAvaliadorDesignado({ avaliadorId: 'c-gestor', vinculos, usuarioId })).toBe(true);
  });

  it('gestor responsável conclui pelo vínculo de supervisão', () => {
    expect(
      podeConcluirFeedback({
        papeis: ['gestor'],
        avaliadorId: 'c-equipe',
        vinculos,
        usuarioId,
        responsavel: true,
      })
    ).toBe(true);
  });

  it('RH/admin conclui pela capacidade administrativa', () => {
    expect(
      podeConcluirFeedback({
        papeis: ['rh'],
        avaliadorId: 'c-outro',
        vinculos,
        usuarioId,
        responsavel: false,
      })
    ).toBe(true);
    expect(
      podeConcluirFeedback({
        papeis: ['admin'],
        avaliadorId: 'c-outro',
        vinculos,
        usuarioId,
      })
    ).toBe(true);
  });

  it('ser supervisor sem o papel gestor NÃO basta para concluir', () => {
    expect(
      podeConcluirFeedback({
        papeis: ['user'],
        avaliadorId: 'c-outro',
        vinculos,
        usuarioId,
        responsavel: true,
      })
    ).toBe(false);
  });

  it('sem designação, sem vínculo e sem papel administrativo NÃO conclui', () => {
    expect(
      podeConcluirFeedback({
        papeis: ['gestor'],
        avaliadorId: 'c-par',
        vinculos,
        usuarioId,
        responsavel: false,
      })
    ).toBe(false);
    expect(
      podeConcluirFeedback({
        papeis: ['user'],
        avaliadorId: 'c-par',
        vinculos,
        usuarioId,
        responsavel: false,
      })
    ).toBe(false);
  });

  it('perfis efetivos mantêm gestor + admin/rh sem exigir supervisor', () => {
    expect(perfisOperadorEfetivos(['admin', 'gestor'], false)).toEqual(['admin_rh', 'gestor']);
    expect(perfisOperadorEfetivos(['gestor'], false)).toEqual(['gestor']);
    expect(perfisOperadorEfetivos(['user'], false)).toEqual(['avaliador']);
  });
});

describe('ehGestorResponsavel — vínculo, não o tipo da avaliação', () => {
  const usuarioId = 'u-1';
  const vinculos = [
    { id: 'c-gestor', user_id: 'u-1', supervisor_id: 'c-diretor' },
    { id: 'c-equipe', user_id: 'u-9', supervisor_id: 'c-gestor' },
    { id: 'c-outro', user_id: 'u-8', supervisor_id: 'c-outro-gestor' },
  ];

  it('é responsável pelo subordinado direto e por si próprio', () => {
    expect(ehGestorResponsavel({ avaliadoId: 'c-equipe', vinculos, usuarioId })).toBe(true);
    expect(ehGestorResponsavel({ avaliadoId: 'c-gestor', vinculos, usuarioId })).toBe(true);
  });

  it('NÃO é responsável por quem tem outro supervisor', () => {
    expect(ehGestorResponsavel({ avaliadoId: 'c-outro', vinculos, usuarioId })).toBe(false);
  });

  it('fail-closed: sem usuário, sem colaborador do usuário ou sem o avaliado', () => {
    expect(ehGestorResponsavel({ avaliadoId: 'c-equipe', vinculos, usuarioId: null })).toBe(false);
    expect(ehGestorResponsavel({ avaliadoId: 'c-equipe', vinculos, usuarioId: 'u-404' })).toBe(false);
    expect(ehGestorResponsavel({ avaliadoId: 'c-inexistente', vinculos, usuarioId })).toBe(false);
    expect(ehGestorResponsavel({ avaliadoId: '', vinculos, usuarioId })).toBe(false);
    expect(ehGestorResponsavel({ avaliadoId: 'c-equipe', vinculos: [], usuarioId })).toBe(false);
  });
});

describe('situacaoPotencial (comparação com a versão do banco)', () => {
  it('sem validação registrada', () => {
    expect(situacaoPotencial(null, 'h1')).toBe('sem_validacao');
    expect(situacaoPotencial(undefined, null)).toBe('sem_validacao');
  });

  it('validada quando a versão casa com a atual', () => {
    expect(situacaoPotencial({ versao_avaliacao: 'h1', potencial_validado: 4 }, 'h1')).toBe('validada');
  });

  it('desatualizada quando a avaliação mudou depois da validação', () => {
    expect(situacaoPotencial({ versao_avaliacao: 'h1', potencial_validado: 4 }, 'h2')).toBe('desatualizada');
  });

  it('sem versão canônica disponível, não inventa "desatualizada"', () => {
    expect(situacaoPotencial({ versao_avaliacao: 'h1' }, null)).toBe('validada');
  });
});

describe('rotuloStatus', () => {
  it('traduz os três estados oficiais e o desconhecido', () => {
    expect(rotuloStatus('pendente')).toBe('Pendente');
    expect(rotuloStatus('concluido')).toBe('Concluída');
    expect(rotuloStatus('cancelado')).toBe('Cancelada');
    expect(rotuloStatus('outro')).toBe('Status desconhecido');
  });
});
