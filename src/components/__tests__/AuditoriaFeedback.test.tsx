import { describe, it, expect } from 'vitest';
import {
  CAMPOS_IGNORADOS_AUDITORIA,
  calcularCamposAlterados,
  montarRegistroAuditoria,
  recortarAlterados,
  validarRegistroAuditoria,
} from '@/components/avaliacao/auditoriaFeedback';

/**
 * ============================================================================
 * Prova da INTERFACE DE AUDITORIA — montagem e validação PURAS.
 *
 * Nenhuma gravação acontece aqui (a escrita é do backend, na mesma transação do
 * UPDATE de status). Os testes garantem que o payload chega correto, porque
 * `audit_log` é append-only: um registro errado é irreversível.
 * ============================================================================
 */

describe('auditoria — diff de campos', () => {
  it('detecta somente os campos que mudaram', () => {
    const campos = calcularCamposAlterados(
      { status: 'pendente', nota_geral: 4, comentarios: 'ok' },
      { status: 'concluido', nota_geral: 4, comentarios: 'ok' }
    );
    expect(campos).toEqual(['status']);
  });

  it('ignora campos de ruído (updated_at) e ordena o resultado', () => {
    const campos = calcularCamposAlterados(
      { status: 'pendente', updated_at: '10:00' },
      { status: 'cancelado', updated_at: '10:05' }
    );
    expect(campos).toEqual(['status']);
    expect(CAMPOS_IGNORADOS_AUDITORIA).toContain('updated_at');
  });

  it('campo criado do zero também aparece', () => {
    expect(calcularCamposAlterados({ status: 'pendente' }, { status: 'pendente', potencial: 4 })).toEqual([
      'potencial',
    ]);
  });

  it('sem os dois lados, não há diff', () => {
    expect(calcularCamposAlterados(null, { status: 'concluido' })).toEqual([]);
    expect(calcularCamposAlterados({ status: 'pendente' }, null)).toEqual([]);
  });

  it('recorta apenas os campos alterados de cada lado', () => {
    const antes = { status: 'pendente', nota_geral: 4 };
    const depois = { status: 'concluido', nota_geral: 4 };
    const campos = calcularCamposAlterados(antes, depois);
    expect(recortarAlterados(antes, campos)).toEqual({ status: 'pendente' });
    expect(recortarAlterados(depois, campos)).toEqual({ status: 'concluido' });
  });
});

describe('auditoria — montagem do registro', () => {
  it('monta UPDATE com antes/depois recortados e exige backend', () => {
    const r = montarRegistroAuditoria({
      registroId: 'fb-1',
      anteriores: { status: 'pendente', nota_geral: 4 },
      novos: { status: 'concluido', nota_geral: 4 },
      usuarioEmail: 'rh@empresa.com',
    });
    expect(r.tabela).toBe('feedbacks_360');
    expect(r.acao).toBe('UPDATE');
    expect(r.camposAlterados).toEqual(['status']);
    expect(r.dadosAnteriores).toEqual({ status: 'pendente' });
    expect(r.dadosNovos).toEqual({ status: 'concluido' });
    expect(r.usuarioEmail).toBe('rh@empresa.com');
    expect(r.exigeBackend).toBe(true);
  });

  it('sem alteração, o registro sai sem campos (e a validação acusa)', () => {
    const r = montarRegistroAuditoria({
      registroId: 'fb-1',
      anteriores: { status: 'concluido' },
      novos: { status: 'concluido' },
    });
    expect(r.camposAlterados).toEqual([]);
    expect(validarRegistroAuditoria(r)).toEqual({ valido: false, impedimentos: ['sem_campos_alterados'] });
  });
});

describe('auditoria — validação antes da gravação', () => {
  it('registro bem formado é válido', () => {
    const r = montarRegistroAuditoria({
      registroId: 'fb-1',
      anteriores: { status: 'pendente' },
      novos: { status: 'cancelado' },
    });
    expect(validarRegistroAuditoria(r).valido).toBe(true);
  });

  it('exige registro, tabela e ao menos um campo alterado', () => {
    const dados = { dadosAnteriores: { status: 'pendente' }, dadosNovos: { status: 'concluido' } };
    expect(
      validarRegistroAuditoria({ ...dados, tabela: 'feedbacks_360', camposAlterados: ['status'] }).impedimentos
    ).toEqual(['registro_ausente']);
    expect(
      validarRegistroAuditoria({ ...dados, registroId: 'fb-1', camposAlterados: ['status'] }).impedimentos
    ).toEqual(['tabela_ausente']);
    expect(validarRegistroAuditoria({ registroId: 'fb-1', tabela: 'feedbacks_360' }).impedimentos).toEqual([
      'sem_campos_alterados',
    ]);
  });

  it('campo declarado como alterado precisa existir em um dos lados', () => {
    const r = validarRegistroAuditoria({
      registroId: 'fb-1',
      tabela: 'feedbacks_360',
      camposAlterados: ['status', 'campo_fantasma'],
      dadosAnteriores: { status: 'pendente' },
      dadosNovos: { status: 'concluido' },
    });
    expect(r.valido).toBe(false);
    expect(r.impedimentos).toEqual(['campos_divergentes']);
  });
});
