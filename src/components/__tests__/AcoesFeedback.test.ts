/**
 * Ações de feedback — camada de decisão dos controles (pura).
 * Garante as regras pedidas: RH também gerencia (admin+rh), Validação de
 * Potencial EXCLUSIVA do RH e situação da validação comparada com a versão
 * canônica vinda do banco.
 */
import { describe, it, expect } from 'vitest';
import {
  acoesDisponiveis,
  ehGestorResponsavel,
  exigeJustificativa,
  perfilOperador,
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
  it('pendente + admin/rh: CANCELA, mas NÃO conclui (a conclusão não é do RH)', () => {
    const acoes = acoesDisponiveis({ statusAtual: 'pendente', papel: 'rh' });
    expect(acao(acoes, 'concluir').disponivel).toBe(false);
    expect(acao(acoes, 'concluir').motivoBloqueio).toContain('perfil');
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

  it('avaliador (user) NÃO conclui e não cancela', () => {
    const acoes = acoesDisponiveis({ statusAtual: 'pendente', papel: 'user' });
    expect(acao(acoes, 'concluir').disponivel).toBe(false);
    expect(acao(acoes, 'cancelar').disponivel).toBe(false);
    expect(acao(acoes, 'cancelar').motivoBloqueio).toContain('perfil');
  });

  it('gestor SEM o vínculo (responsável) não recebe a conclusão', () => {
    const semVinculo = acoesDisponiveis({ statusAtual: 'pendente', papel: 'gestor' });
    expect(acao(semVinculo, 'concluir').disponivel).toBe(false);
    expect(acao(semVinculo, 'concluir').motivoBloqueio).toContain('gestor responsável');
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
