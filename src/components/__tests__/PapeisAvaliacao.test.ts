import { describe, it, expect } from 'vitest';
import {
  capacidadesAvaliacao,
  normalizarPapeis,
  temPapel,
} from '@/components/avaliacao/papeisAvaliacao';
import { podeDecidirAprovacao, podeEnviarParaGestor } from '@/components/avaliacao/aprovacaoGestor';
import {
  perfilOperador,
  perfilOperadorComVinculo,
  podeGerirAvaliacoes,
  podeValidarPotencial,
  temPerfilGestor,
} from '@/components/avaliacao/acoesFeedback';

/**
 * UMA CONTA, VÁRIOS PAPÉIS — regressão que este módulo corrige:
 * a conta `admin`+`gestor` (Abner) era tratada SÓ como administrador porque o
 * front reduzia a lista a um papel único (precedência) e testava IGUALDADE.
 * Ter `admin` NÃO pode anular `gestor`.
 */

const ALVO = ['admin', 'gestor'];

describe('normalização da lista de papéis', () => {
  it('aceita a lista do `get_user_roles` e um papel único (compatibilidade)', () => {
    expect(normalizarPapeis(['admin', 'gestor'])).toEqual(['admin', 'gestor']);
    expect(normalizarPapeis(' admin ')).toEqual(['admin']);
    expect(normalizarPapeis(['ADMIN', 'Gestor'])).toEqual(['admin', 'gestor']);
    expect(normalizarPapeis(['admin', 'admin'])).toEqual(['admin']);
    expect(normalizarPapeis(undefined)).toEqual([]);
    expect(normalizarPapeis(null)).toEqual([]);
  });

  it('`temPapel` enxerga o papel em qualquer posição da lista', () => {
    expect(temPapel(ALVO, 'gestor')).toBe(true);
    expect(temPapel(ALVO, 'GESTOR')).toBe(true);
    expect(temPapel(ALVO, 'rh')).toBe(false);
    expect(temPapel('gestor', 'gestor')).toBe(true);
  });
});

describe('capacidades da conta admin+gestor (a conta Abner)', () => {
  it('mantém o admin E o gestor — um não anula o outro', () => {
    const c = capacidadesAvaliacao(ALVO);
    expect(c).toMatchObject({
      admin: true,
      gestor: true,
      podeGerirAvaliacoes: true, // admin/RH enviam ao gestor
      podeDecidirAprovacao: true, // GESTOR aprova/devolve (o defeito corrigido)
      podeValidarPotencial: false, // Potencial é exclusivo do RH
    });
  });

  it('a fila e as permissões do módulo refletem as duas capacidades', () => {
    // Antes: `papel = 'admin'` → `podeDecidirAprovacao('admin') === false`.
    expect(podeDecidirAprovacao(ALVO)).toBe(true);
    expect(podeEnviarParaGestor(ALVO)).toBe(true);
    expect(temPerfilGestor(ALVO)).toBe(true);
    expect(podeGerirAvaliacoes(ALVO)).toBe(true);
    expect(podeValidarPotencial(ALVO)).toBe(false);
  });

  it('não abre nada além do que os papéis concedem', () => {
    expect(podeDecidirAprovacao(['admin'])).toBe(false); // admin NÃO substitui o gestor
    expect(podeValidarPotencial(['admin', 'gestor'])).toBe(false); // nem o admin valida Potencial
    expect(podeValidarPotencial(['rh'])).toBe(true);
    expect(podeDecidirAprovacao(['rh'])).toBe(false); // RH não decide
    expect(podeGerirAvaliacoes(['gestor'])).toBe(false); // gestor não envia em nome do RH
    expect(podeDecidirAprovacao(null)).toBe(false); // fail-closed
    expect(podeDecidirAprovacao([])).toBe(false);
  });

  it('aceita o formato antigo (papel único) sem mudar o resultado', () => {
    expect(podeEnviarParaGestor('admin')).toBe(true);
    expect(podeEnviarParaGestor('rh')).toBe(true);
    expect(podeEnviarParaGestor('gestor')).toBe(false);
    expect(podeDecidirAprovacao('gestor')).toBe(true);
    expect(podeValidarPotencial('rh')).toBe(true);
  });
});

describe('perfil das ações de status com vínculo provado', () => {
  it('admin+gestor RESPONSÁVEL opera como gestor (concluir); sem vínculo, segue admin_rh', () => {
    expect(perfilOperadorComVinculo('admin', true, true)).toBe('gestor');
    expect(perfilOperadorComVinculo('admin', true, false)).toBe('admin_rh');
    expect(perfilOperadorComVinculo('admin', false, true)).toBe('admin_rh');
    expect(perfilOperadorComVinculo('rh', true, true)).toBe('gestor');
  });

  it('sem `gestor` na conta o vínculo não promove ninguém', () => {
    expect(perfilOperadorComVinculo('rh', false, true)).toBe('admin_rh');
    expect(perfilOperadorComVinculo(null, false, false)).toBe('desconhecido');
    expect(perfilOperador('admin')).toBe('admin_rh');
    expect(perfilOperador('gestor')).toBe('gestor');
  });
});
