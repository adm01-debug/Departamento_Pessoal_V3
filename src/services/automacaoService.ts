import { supabase } from '@/integrations/supabase/client';
import { whatsappService } from './whatsappService';
import { criarNotificacao } from './notificacoesService';
import { formatDateLocalISO } from '@/utils/dateLocal';

export const automacaoService = {
  /**
   * Monitora eventos críticos e dispara automações (Notificações + WhatsApp)
   */
  async processarAutomacoes(empresaId: string) {
    
    // 1. Notificar Aniversariantes do Dia
    await this.notificarAniversariantes(empresaId);
    
    // 2. Notificar Exames Médicos (ASO) Vencendo
    await this.notificarASOVencendo(empresaId);
    
    // 3. Notificar Término de Experiência
    await this.notificarTerminoExperiencia(empresaId);
  },

  async notificarAniversariantes(empresaId: string) {
    const hoje = new Date();
    const diaMes = `${String(hoje.getDate()).padStart(2, '0')}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    
    const { data: aniversariantes } = await supabase
      .from('colaboradores')
      .select('id, nome_completo, telefone, empresa_id')
      .eq('empresa_id', empresaId)
      .eq('status', 'ativo')
      .filter('data_nascimento', 'ilike', `%-${diaMes}`);

    if (!aniversariantes) return;

    for (const colab of aniversariantes) {
      const mensagem = `Parabéns, ${colab.nome_completo}! 🎂 A equipe da empresa deseja a você um feliz aniversário e muito sucesso!`;
      
      // Notificação no sistema
      await criarNotificacao({
        titulo: 'Aniversariante do Dia',
        mensagem: `Hoje é aniversário de ${colab.nome_completo}.`,
        tipo: 'info',
        empresa_id: empresaId,
        entidade_tipo: 'colaborador',
        entidade_id: colab.id
      });

      // WhatsApp (se configurado)
      if (colab.telefone) {
        await whatsappService.sendMessage({ empresaId, colaboradorId: colab.id, phone: colab.telefone, message: mensagem });
      }
    }
  },

  async notificarASOVencendo(empresaId: string) {
    const dataAlerta = new Date();
    dataAlerta.setDate(dataAlerta.getDate() + 30); // 30 dias de antecedência
    const dataFormatada = formatDateLocalISO(dataAlerta);

    const { data: asos } = await (supabase as any)
      .from('asos')
      .select('*, colaborador:colaboradores(id, nome_completo, telefone)')
      .eq('empresa_id', empresaId)
      .eq('data_validade', dataFormatada);

    if (!asos) return;

    for (const aso of asos) {
      const colab = (aso as any).colaborador;
      if (!colab) continue;
      
      const mensagem = `Olá ${colab.nome_completo}, seu exame médico (ASO) vence em 30 dias (${dataAlerta.toLocaleDateString('pt-BR')}). Favor agendar com o RH.`;
      
      await criarNotificacao({
        titulo: 'ASO Vencendo',
        mensagem: `O exame médico de ${colab.nome_completo} vence em 30 dias.`,
        tipo: 'alerta',
        empresa_id: empresaId,
        entidade_tipo: 'colaborador',
        entidade_id: colab.id
      });

      if (colab.telefone) {
        await whatsappService.sendMessage({ empresaId, colaboradorId: colab.id, phone: colab.telefone, message: mensagem });
      }
    }
  },

  async notificarTerminoExperiencia(empresaId: string) {
    if (!empresaId) return;
    const dataAlerta = new Date();
    dataAlerta.setDate(dataAlerta.getDate() + 7);
    const dataFormatada = formatDateLocalISO(dataAlerta);

    const { data: periodos } = await supabase
      .from('periodos_experiencia')
      .select('*, colaborador:colaboradores!inner(id, nome_completo, empresa_id)')
      .eq('colaborador.empresa_id' as any, empresaId)
      .or(`primeira_etapa_fim.eq.${dataFormatada},segunda_etapa_fim.eq.${dataFormatada}` as any);

    if (!periodos) return;

    for (const periodo of periodos) {
      const colab = (periodo as any).colaborador;
      if (!colab) continue;

      await criarNotificacao({
        titulo: 'Término de Experiência Próximo',
        mensagem: `O período de experiência de ${colab.nome_completo} encerra em 7 dias. Avalie a continuidade.`,
        tipo: 'alerta',
        empresa_id: empresaId,
        entidade_tipo: 'colaborador',
        entidade_id: colab.id
      });
    }
  }
};
