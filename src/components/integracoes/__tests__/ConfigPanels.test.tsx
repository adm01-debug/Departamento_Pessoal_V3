import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createWrapper } from '@/test/queryWrapper';

const svc = vi.hoisted(() => ({
  getConfig: vi.fn(),
  saveConfig: vi.fn(),
  getRemessas: vi.fn(),
  listar: vi.fn(),
  getLogs: vi.fn(),
  criar: vi.fn(),
  excluir: vi.fn(),
}));

vi.mock('@/services/integracaoService', () => ({
  cnabService: { getConfig: svc.getConfig, saveConfig: svc.saveConfig, getRemessas: svc.getRemessas },
  webhookService: { listar: svc.listar, getLogs: svc.getLogs, criar: svc.criar, excluir: svc.excluir },
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: () => ({ empresaAtual: { id: 'empresa-1' } }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const auth = vi.hoisted(() => ({ roles: ['rh'] as string[] }));
vi.mock('@/contexts', () => ({
  useAuth: () => ({
    isAdmin: auth.roles.includes('admin'),
    hasRole: (role: string) => auth.roles.includes(role),
  }),
}));

import { toast } from 'sonner';
import { CnabConfigPanel, WebhookConfigPanel } from '../ConfigPanels';

beforeEach(() => {
  vi.clearAllMocks();
  auth.roles = ['rh'];
  svc.getRemessas.mockResolvedValue([]);
  svc.getLogs.mockResolvedValue([]);
  svc.saveConfig.mockResolvedValue(undefined);
  svc.criar.mockResolvedValue(undefined);
  svc.excluir.mockResolvedValue(undefined);
});

describe('CnabConfigPanel', () => {
  it('Salvar Configurações grava os dados editados e invalida a configuração', async () => {
    svc.getConfig.mockResolvedValue({
      id: 'cfg-1',
      nome_empresa: 'ACME',
      banco_codigo: '341',
      agencia: '1234',
      conta: '5678',
      conta_digito: '9',
      codigo_empresa: null,
      convenio: 'CONV',
    });
    const user = userEvent.setup();
    const { wrapper, invalidateSpy } = createWrapper();
    render(<CnabConfigPanel />, { wrapper });

    await user.click(screen.getByRole('tab', { name: 'Configuração Bancária' }));
    const agencia = await screen.findByDisplayValue('1234');
    await user.clear(agencia);
    await user.type(agencia, '4321');
    await user.click(screen.getByRole('button', { name: 'Salvar Configurações' }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Configuração bancária salva!'));
    expect(svc.saveConfig).toHaveBeenCalledWith('empresa-1', {
      id: 'cfg-1',
      nome_empresa: 'ACME',
      banco_codigo: '341',
      agencia: '4321',
      conta: '5678',
      conta_digito: '9',
      codigo_empresa: null,
      convenio: 'CONV',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['cnab_config', 'empresa-1'] });
  });

  it('não salva sem os campos obrigatórios', async () => {
    svc.getConfig.mockResolvedValue(null);
    const user = userEvent.setup();
    const { wrapper } = createWrapper();
    render(<CnabConfigPanel />, { wrapper });

    await user.click(screen.getByRole('tab', { name: 'Configuração Bancária' }));
    await user.click(screen.getByRole('button', { name: 'Salvar Configurações' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(svc.saveConfig).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('Salvar Configurações fica desabilitado enquanto a config carrega', async () => {
    svc.getConfig.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    const { wrapper } = createWrapper();
    render(<CnabConfigPanel />, { wrapper });

    await user.click(screen.getByRole('tab', { name: 'Configuração Bancária' }));
    expect(screen.getByRole('button', { name: 'Salvar Configurações' })).toBeDisabled();
  });

  it('Salvar Configurações fica desabilitado se a config falhou ao carregar (evita duplicar)', async () => {
    svc.getConfig.mockRejectedValue(new Error('falhou'));
    const user = userEvent.setup();
    const { wrapper } = createWrapper();
    render(<CnabConfigPanel />, { wrapper });

    await user.click(screen.getByRole('tab', { name: 'Configuração Bancária' }));
    await waitFor(() => expect(svc.getConfig).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Salvar Configurações' })).toBeDisabled();
    expect(svc.saveConfig).not.toHaveBeenCalled();
  });

  it('Download baixa o conteúdo salvo da remessa e fica desabilitado sem arquivo', async () => {
    svc.getConfig.mockResolvedValue(null);
    svc.getRemessas.mockResolvedValue([
      {
        id: 'rem-1',
        banco_codigo: '341',
        sequencial_arquivo: 7,
        status: 'enviado',
        arquivo_remessa: 'LINHA1\r\nLINHA2',
        created_at: null,
      },
      {
        id: 'rem-2',
        banco_codigo: '341',
        sequencial_arquivo: 8,
        status: 'processando',
        arquivo_remessa: null,
        created_at: null,
      },
    ]);
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:remessa');
    const revokeObjectURL = vi.fn();
    Object.assign(window.URL, { createObjectURL, revokeObjectURL });
    let baixado: string | undefined;
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      baixado = this.download;
    });
    const user = userEvent.setup();
    const { wrapper } = createWrapper();
    render(<CnabConfigPanel />, { wrapper });

    const botoes = await screen.findAllByRole('button', { name: 'Download' });
    expect(botoes[1]).toBeDisabled();
    await user.click(botoes[0]);

    expect(baixado).toBe('REMESSA_7.txt');
    expect(await createObjectURL.mock.calls[0][0].text()).toBe('LINHA1\r\nLINHA2');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:remessa');
    clickSpy.mockRestore();
  });

  it('esconde o Download da remessa para quem não é RH nem admin', async () => {
    auth.roles = ['user'];
    svc.getConfig.mockResolvedValue(null);
    svc.getRemessas.mockResolvedValue([
      {
        id: 'rem-1',
        banco_codigo: '341',
        sequencial_arquivo: 7,
        status: 'enviado',
        arquivo_remessa: 'LINHA1\r\nLINHA2',
        created_at: null,
      },
    ]);
    const { wrapper } = createWrapper();
    render(<CnabConfigPanel />, { wrapper });

    expect(await screen.findByText('REMESSA_7.txt')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Download' })).not.toBeInTheDocument();
  });

  it('admin vê o Download da remessa', async () => {
    auth.roles = ['admin'];
    svc.getConfig.mockResolvedValue(null);
    svc.getRemessas.mockResolvedValue([
      {
        id: 'rem-1',
        banco_codigo: '341',
        sequencial_arquivo: 7,
        status: 'enviado',
        arquivo_remessa: 'LINHA1',
        created_at: null,
      },
    ]);
    const { wrapper } = createWrapper();
    render(<CnabConfigPanel />, { wrapper });

    expect(await screen.findByRole('button', { name: 'Download' })).toBeEnabled();
  });
});

describe('WebhookConfigPanel', () => {
  it('Novo Webhook fica desativado enquanto não existe disparo de webhooks', async () => {
    svc.listar.mockResolvedValue([]);
    const { wrapper } = createWrapper();
    render(<WebhookConfigPanel />, { wrapper });

    expect(screen.getByRole('button', { name: /Novo Webhook/ })).toBeDisabled();
    expect(screen.getByText(/Disparo de webhooks ainda não implementado/)).toBeInTheDocument();
    expect(svc.criar).not.toHaveBeenCalled();
  });

  it('Remover pede confirmação e exclui o webhook da empresa', async () => {
    svc.listar.mockResolvedValue([{ id: 'w1', url: 'https://hooks.test/rh', eventos: ['colaborador.criado'] }]);
    const user = userEvent.setup();
    const { wrapper } = createWrapper();
    render(<WebhookConfigPanel />, { wrapper });

    await user.click(await screen.findByRole('button', { name: 'Remover' }));
    expect(screen.getByText('Remover webhook?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remover' }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Webhook removido.'));
    expect(svc.excluir).toHaveBeenCalledWith('empresa-1', 'w1');
  });
});
