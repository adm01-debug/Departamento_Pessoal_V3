import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { maskCpfDisplay, maskEmail, maskGeneric } from '@/utils/piiMask';
import type { Colaborador } from '@/types/entities';

/**
 * O que este arquivo trava: a MÁSCARA. A versão desta aba na branch `muri`
 * mostrava CPF, RG, e-mail, telefone e endereço crus — 0 usos de
 * `usePiiMask`/`registrarAcessoPII` — num repositório público. Os casos abaixo
 * falham se alguém reintroduzir isso.
 */
let podeVerPii = false;
vi.mock('@/hooks/usePiiMask', () => ({
  usePiiMask: () => ({
    canViewPii: podeVerPii,
    cpf: (v?: string | null) => (podeVerPii ? (v ?? '') : maskCpfDisplay(v)),
    rg: (v?: string | null) => (podeVerPii ? (v ?? '') : maskGeneric(v)),
    email: (v?: string | null) => (podeVerPii ? (v ?? '') : maskEmail(v)),
    phone: (v?: string | null) => (podeVerPii ? (v ?? '') : maskGeneric(v)),
    endereco: (v?: string | null) => (podeVerPii ? (v ?? '') : maskGeneric(v)),
  }),
}));

const registrarAcessoPII = vi.fn();
vi.mock('@/services/piiAccessLogService', () => ({
  registrarAcessoPII: (...args: unknown[]) => registrarAcessoPII(...args),
}));

import { DadosPessoaisTab } from '../DadosPessoaisTab';

const CPF = '123.456.789-00';
const RG = '12.345.678-9';
const EMAIL = 'pessoa@exemplo.com';
const CELULAR = '(11) 98765-4321';
const CEP = '01310-100';

const COLAB = {
  id: 'col-1',
  empresa_id: 'emp-1',
  nome_completo: 'Maria Souza',
  nome_social: 'Mari',
  cpf: CPF,
  rg: RG,
  rg_orgao_emissor: 'SSP',
  rg_uf: 'SP',
  data_nascimento: '1990-03-15',
  estado_civil: 'casado',
  email: 'maria@empresa.com',
  email_pessoal: EMAIL,
  telefone: '(11) 3333-4444',
  celular: CELULAR,
  cep: CEP,
  logradouro: 'Av. Paulista',
  numero: '1000',
  complemento: 'Sala 42',
  bairro: 'Bela Vista',
  cidade: 'São Paulo',
  uf: 'SP',
  matricula: 'M-007',
  status: 'ativo',
} as unknown as Colaborador;

describe('DadosPessoaisTab', () => {
  beforeEach(() => {
    registrarAcessoPII.mockClear();
  });
  afterEach(() => {
    podeVerPii = false;
  });

  it('SEM permissão de PII: CPF, RG, e-mail, telefone e endereço saem mascarados', () => {
    render(<DadosPessoaisTab colaborador={COLAB} />);

    // os valores crus NÃO podem aparecer em lugar nenhum
    for (const cru of [CPF, RG, EMAIL, CELULAR, CEP]) {
      expect(screen.queryByText(cru)).toBeNull();
    }
    expect(screen.getByText(maskCpfDisplay(CPF))).toBeInTheDocument();
    expect(screen.getByText(maskEmail(EMAIL))).toBeInTheDocument();
  });

  it('sem permissão, não registra acesso — não houve acesso a dado sensível', () => {
    render(<DadosPessoaisTab colaborador={COLAB} />);
    expect(registrarAcessoPII).not.toHaveBeenCalled();
  });

  it('COM permissão: mostra os valores reais e registra o acesso na trilha', () => {
    podeVerPii = true;
    render(<DadosPessoaisTab colaborador={COLAB} />);

    expect(screen.getByText(CPF)).toBeInTheDocument();
    expect(screen.getByText(RG)).toBeInTheDocument();
    expect(screen.getByText(EMAIL)).toBeInTheDocument();
    expect(screen.getByText(CELULAR)).toBeInTheDocument();

    expect(registrarAcessoPII).toHaveBeenCalledWith('colaboradores', 'select', {
      empresaId: 'emp-1',
      registroId: 'col-1',
    });
  });

  it('mostra os campos que não existiam em nenhuma tela do dossiê', () => {
    podeVerPii = true;
    render(<DadosPessoaisTab colaborador={COLAB} />);
    expect(screen.getByText('Mari')).toBeInTheDocument(); // nome social
    expect(screen.getByText('SSP')).toBeInTheDocument(); // órgão emissor do RG
    expect(screen.getByText('Casado(a)')).toBeInTheDocument(); // enum traduzido
    expect(screen.getByText('Bela Vista')).toBeInTheDocument(); // bairro
    expect(screen.getByText('15/03/1990')).toBeInTheDocument(); // data sem recuo de fuso
  });

  it('campo vazio aparece como travessão, não em branco', () => {
    podeVerPii = true;
    render(<DadosPessoaisTab colaborador={{ ...COLAB, nome_social: null, bairro: null } as Colaborador} />);
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });

  it('colaborador ainda carregando não quebra nem registra acesso', () => {
    podeVerPii = true;
    render(<DadosPessoaisTab colaborador={null} />);
    expect(screen.getByText('Identificação Pessoal')).toBeInTheDocument();
    expect(registrarAcessoPII).not.toHaveBeenCalled();
  });
});
