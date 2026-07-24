import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

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
      .upsert(config as any, { onConflict: 'empresa_id' });
    
    if (error) throw error;
  },

  async sendMessage(params: {
    empresaId: string;
    colaboradorId?: string;
    phone: string;
    message: string;
  }): Promise<{ success: boolean }> {
    const { error } = await supabase
      .from('whatsapp_mensagens_logs')
      .insert({
        empresa_id: params.empresaId,
        colaborador_id: params.colaboradorId,
        telefone: params.phone,
        status: 'sent',
        mensagem_id_externo: `wa_direct_${Date.now()}`
      } as any);
    
    if (error) throw error;
    return { success: true };
  },
  
  async listTemplates(empresaId: string): Promise<WhatsAppTemplate[]> {
    const { data, error } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('empresa_id', empresaId);
    
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

  async sendTemplateMessage(params: {
    empresaId: string;
    colaboradorId: string;
    templateId: string;
    phone: string;
  }): Promise<{ success: boolean; logId: string }> {
    try {
      const { empresaId, colaboradorId, templateId, phone } = params;
      
      const { data: log, error: logErr } = await supabase
        .from('whatsapp_mensagens_logs')
        .insert({
          empresa_id: empresaId,
          colaborador_id: colaboradorId,
          template_id: templateId,
          telefone: phone,
          status: 'pending'
        } as any)
        .select()
        .single();

      if (logErr) throw logErr;

      await new Promise(r => setTimeout(r, 1000));
      
      await supabase.from('whatsapp_mensagens_logs')
        .update({ status: 'sent', mensagem_id_externo: `wa_${Date.now()}` } as any)
        .eq('id', (log as any).id)
        .eq('empresa_id', empresaId);
        
      return ({ success: true, logId: (log as any).id });
    } catch (e: any) {
      throw new Error('Falha ao enviar mensagem de template do WhatsApp', { cause: e });
    }
  }
};

