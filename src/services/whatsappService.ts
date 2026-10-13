import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { validateTablePayload } from '@/schemas/validate';

type WhatsAppConfigTable = Database['public']['Tables']['whatsapp_config'];
type WhatsAppLogTable = Database['public']['Tables']['whatsapp_mensagens_logs'];
type WhatsAppTemplateTable = Database['public']['Tables']['whatsapp_templates'];

export type WhatsAppConfig = WhatsAppConfigTable['Row'];
export type WhatsAppLog = WhatsAppLogTable['Row'];
export type WhatsAppTemplate = WhatsAppTemplateTable['Row'];

export interface WhatsAppConfigData {
  empresa_id: string;
  webhook_url?: string;
  api_key?: string;
  telefone_origem?: string;
  habilitado: boolean;
  instancia_url?: string;
  instancia_nome?: string;
  notificar_ponto?: boolean;
  notificar_ferias?: boolean;
  notificar_holerite?: boolean;
}

export const whatsappService = {
  async getConfig(empresaId: string): Promise<WhatsAppConfig | null> {
    const { data, error } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('empresa_id', empresaId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async saveConfig(config: WhatsAppConfigTable['Insert']): Promise<void> {
    const { error } = await supabase
      .from('whatsapp_config')
      .upsert(validateTablePayload('whatsapp_config', config, 'whatsappService:whatsapp_config'), {
        onConflict: 'empresa_id',
      });

    if (error) throw error;
  },

  // O envio real é feito pela edge function `whatsapp-send`, que chama a
  // Evolution API no servidor (api_key nunca vai para o browser) e grava o
  // status verdadeiro no log. Erros propagam para o caller decidir o
  // fallback (ex.: wa.me no envio de link de admissão).
  async sendMessage(params: {
    empresaId: string;
    colaboradorId?: string;
    phone: string;
    message: string;
  }): Promise<{ success: boolean; logId?: string }> {
    const { data, error } = await supabase.functions.invoke('whatsapp-send', {
      body: {
        empresa_id: params.empresaId,
        colaborador_id: params.colaboradorId,
        telefone: params.phone,
        mensagem: params.message,
      },
    });

    if (error) throw new Error(error.message || 'Falha ao enviar WhatsApp');
    const result = data as { success?: boolean; status?: string; log_id?: string; error?: string } | null;
    if (!result?.success) {
      throw new Error(result?.error || 'Envio de WhatsApp falhou');
    }
    return { success: true, logId: result.log_id };
  },

  async listTemplates(empresaId: string): Promise<WhatsAppTemplate[]> {
    const { data, error } = await supabase.from('whatsapp_templates').select('*').eq('empresa_id', empresaId);

    if (error) throw error;
    return (data || []) as WhatsAppTemplate[];
  },

  async listLogs(empresaId: string): Promise<WhatsAppLog[]> {
    const { data, error } = await supabase
      .from('whatsapp_mensagens_logs')
      .select('*, colaborador:colaboradores(nome_completo)')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as WhatsAppLog[];
  },

  // A edge function resolve o conteúdo do template no servidor e envia de
  // verdade — nada de marcar 'sent' sem entrega (o UPDATE que fingia isso
  // além de tudo era bloqueado pela trilha append-only do banco).
  async sendTemplateMessage(params: {
    empresaId: string;
    colaboradorId: string;
    templateId: string;
    phone: string;
  }): Promise<{ success: boolean; logId?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          empresa_id: params.empresaId,
          colaborador_id: params.colaboradorId,
          telefone: params.phone,
          template_id: params.templateId,
        },
      });

      if (error) throw new Error(error.message || 'Falha ao enviar WhatsApp');
      const result = data as { success?: boolean; log_id?: string; error?: string } | null;
      // Entrega e persistência do log são desfechos independentes na edge:
      // success:true pode vir com log_id null (insert falhou pós-entrega) e
      // a mensagem JÁ foi entregue — tratar como erro faria o caller reenviar.
      if (!result?.success) {
        throw new Error(result?.error || 'Envio de WhatsApp falhou');
      }
      return { success: true, logId: result.log_id };
    } catch (e) {
      throw new Error('Falha ao enviar mensagem de template do WhatsApp', { cause: e });
    }
  },
};
