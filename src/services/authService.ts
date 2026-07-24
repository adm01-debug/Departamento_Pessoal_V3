// V25: Auth Service - Result Pattern & Enhanced Security
import { supabase } from '@/integrations/supabase/client';
import { validatePasswordFull } from '@/utils/passwordPolicy';

export const authService = {
  /**
   * Solicita recuperação de senha
   */
  async forgotPassword(email: string): Promise<{ success: boolean }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });
      if (error) {
        throw new Error(error.message || 'Falha ao enviar email de recuperação');
      }
      return ({ success: true });
    } catch (e: any) {
      throw new Error(e.message || 'Erro inesperado no servidor de autenticação', { cause: e });
    }
  },

  /**
   * Reseta a senha do usuário (with HIBP breach check)
   */
  async resetPassword(newPassword: string): Promise<{ success: boolean; warnings?: string[] }> {
    const pwCheck = await validatePasswordFull(newPassword);
    if (!pwCheck.valid) {
      throw new Error(`Senha fraca: ${pwCheck.errors.join('; ')}`);
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        throw new Error(error.message || 'Falha ao atualizar senha');
      }
      return ({ success: true, warnings: pwCheck.warnings });
    } catch (e: any) {
      throw new Error(e.message || 'Erro inesperado ao redefinir senha', { cause: e });
    }
  },

  /**
   * Verifica a sessão atual
   */
  async getSession(): Promise<any> {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return (data.session);
    } catch (e: any) {
      throw new Error('Sessão inválida ou expirada', { cause: e });
    }
  }
};

export default authService;
