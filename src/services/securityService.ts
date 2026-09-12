// Tabelas de segurança estão deliberadamente fora do gateway genérico. Este
// cliente fala com o PostgREST canônico usando o JWT do usuário, portanto as
// policies RLS admin-only continuam sendo a fronteira de autorização.
import { supabase } from '@/integrations/supabase/client.base';
import { loggerService } from './loggerService';

export interface SecurityAlert {
  id: string;
  type: string;
  severity: string;
  ip_address: string;
  user_id: string | null;
  details: any;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface BlockedIp {
  id: string;
  ip_address: string;
  reason: string;
  blocked_by: string | null;
  blocked_at: string;
  expires_at: string | null;
  permanent: boolean;
  created_at: string;
}

export interface LoginAttempt {
  id: string;
  email: string;
  ip_address: string;
  user_agent: string | null;
  success: boolean;
  failure_reason: string | null;
  mfa_required: boolean;
  mfa_passed: boolean;
  created_at: string;
}

export interface GeoBlockedAttempt {
  id: string;
  ip_address: string;
  country_code: string;
  country_name: string;
  user_agent: string | null;
  created_at: string;
}

export const securityService = {
  async getBlockedIps(): Promise<BlockedIp[]> {
    const { data, error } = await supabase
      .from('blocked_ips')
      .select('id,ip_address,reason,blocked_by,blocked_at,expires_at,permanent,created_at')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) {
      loggerService.error('Error fetching blocked IPs', {}, error);
      throw error;
    }
    return (data || []) as unknown as BlockedIp[];
  },

  async unblockIp(id: string) {
    if (!id) throw new Error('ID é obrigatório');
    const { error } = await supabase.from('blocked_ips').delete().eq('id', id);
    if (error) {
      loggerService.error('Error unblocking IP', { id }, error);
      throw error;
    }
    loggerService.info('IP unblocked', { id });
  },

  async getLoginAttempts(): Promise<LoginAttempt[]> {
    const { data, error } = await supabase
      .from('login_attempts')
      .select('id,email,ip_address,user_agent,success,failure_reason,mfa_required,mfa_passed,created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      loggerService.error('Error fetching login attempts', {}, error);
      throw error;
    }
    return (data || []) as unknown as LoginAttempt[];
  },

  async getSecurityAlerts(): Promise<SecurityAlert[]> {
    const { data, error } = await supabase
      .from('security_alerts')
      .select('id,type,severity,ip_address,user_id,details,resolved,resolved_by,resolved_at,created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      loggerService.error('Error fetching security alerts', {}, error);
      throw error;
    }
    return (data || []) as unknown as SecurityAlert[];
  },

  async getGeoBlockedAttempts(): Promise<GeoBlockedAttempt[]> {
    const { data, error } = await supabase
      .from('geo_blocked_attempts')
      .select('id,ip_address,country_code,country_name,user_agent,created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      loggerService.error('Error fetching geo blocked attempts', {}, error);
      throw error;
    }
    return (data || []) as unknown as GeoBlockedAttempt[];
  },

  async getRateLimitLogs() {
    const { data, error } = await supabase
      .from('rate_limit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      loggerService.error('Error fetching rate limit logs', {}, error);
      throw error;
    }
    return data || [];
  },

  async resolveAlert(id: string, note?: string) {
    if (!id) throw new Error('ID do alerta é obrigatório');
    // A autoria é derivada de auth.uid() dentro da RPC. Aceitar `resolved_by`
    // vindo do browser permitiria a um admin forjar o autor da resolução.
    const { error } = await supabase.rpc('resolve_security_alert', {
      _alert_id: id,
      _note: note || undefined,
    });
    if (error) {
      loggerService.error('Error resolving alert', { id }, error);
      throw error;
    }
    loggerService.info('Security alert resolved', { alertId: id });
  },
};
