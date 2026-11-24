import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuditoriaDetalheDialog } from '@/components/avaliacao/AuditoriaDetalheDialog';
import { derivarEvento, normalizarEvento } from '@/components/avaliacao/auditoriaComum';

/**
 * ============================================================================
 * AUDITORIA — o "Copiar ID do registro" sobreviveu à remoção do menu de 3 pontos.
 *
 * O menu da linha tinha duas ações: "Abrir detalhes do evento" (que era o próprio
 * botão "Ver detalhes" — redundante) e "Copiar ID do registro" (ação exclusiva).
 * A exclusiva foi MOVIDA para a janela de detalhes, junto do próprio ID. Este
 * teste prova que ela continua acessível e copiando o valor REAL do registro.
 * ============================================================================
 */

const derivado = derivarEvento(
  normalizarEvento({
    id: 'log-1',
    tabela: 'feedbacks_360',
    acao: 'INSERT',
    user_email: 'gestor@empresa.com',
    registro_id: 'reg-123',
    created_at: '2026-07-01T10:00:00Z',
    dados_novos: { avaliado: 'Carlos Eduardo Lima', nota_geral: 5, tipo: 'gestor' },
  })
);

describe('AuditoriaDetalheDialog — copiar ID do registro', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it('mostra o botão de copiar junto do ID e copia o valor real', () => {
    render(<AuditoriaDetalheDialog derivado={derivado} aberto onOpenChange={() => {}} />);

    expect(screen.getByText('reg-123')).toBeInTheDocument();
    const botao = screen.getByRole('button', { name: /Copiar ID do registro/i });
    fireEvent.click(botao);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('reg-123');
  });
});
