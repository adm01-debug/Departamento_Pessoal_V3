import { supabase } from '@/integrations/supabase/client';
import { pontoMonitorService } from './pontoMonitorService';
import CryptoJS from 'crypto-js';
import { format } from 'date-fns';
import { formatDateLocalISO } from '@/utils/dateLocal';

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export const pontoService = {
  async getSettings(empresaId: string): Promise<any | null> {
    
    const { data, error } = await supabase
      .from('configuracoes_ponto')
      .select('*')
      .eq('empresa_id', empresaId)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  
  },

  async registrar(
    tipo: 'entrada' | 'saida_almoco' | 'retorno_almoco' | 'saida', 
    colaboradorId: string,
    options?: {
      latitude?: number;
      longitude?: number;
      precisao?: number;
      dispositivoId?: string;
      metadata?: Record<string, any>;
      foto_biometria_url?: string | null;
    }
  ): Promise<any> {
    if (!colaboradorId) throw new Error('Colaborador é obrigatório para registrar ponto.');
    
    try {
      const now = new Date();
      const data = format(now, 'yyyy-MM-dd');
      const hora = format(now, 'HH:mm');

      const tipoMap: Record<string, string> = {
        entrada: 'entrada',
        saida_almoco: 'saida',
        retorno_almoco: 'entrada',
        saida: 'saida'
      };
      const tipoNormalizado = tipoMap[tipo] || 'entrada';

      const { data: colab, error: colabError } = await supabase
        .from('colaboradores')
        .select('id, empresa_id, local_trabalho_id, locais_trabalho(latitude, longitude)')
        .eq('id', colaboradorId)
        .maybeSingle();

      if (colabError) throw colabError;
      if (!colab) throw new Error('Colaborador não encontrado.');

      const settingsRes = await this.getSettings(colab.empresa_id || '');
      const settings = (settingsRes ?? null);
      let dentroRaio = true;

      if (settings?.exige_geolocalizacao && colab.locais_trabalho) {
        const workplace = colab.locais_trabalho as any;
        if (workplace.latitude && workplace.longitude && options?.latitude && options?.longitude) {
          const distance = getDistance(
            workplace.latitude,
            workplace.longitude,
            options.latitude,
            options.longitude
          );
          dentroRaio = distance <= (settings.raio_maximo_metros || 200);

          if (!dentroRaio && settings.exige_geolocalizacao) {
            await pontoMonitorService.trackGeofenceFailure(
              colaboradorId,
              options.latitude,
              options.longitude,
              settings.raio_maximo_metros || 200
            );
          }
        }
      }

      const hashPayload = `${colaboradorId}|${data}|${hora}|${options?.dispositivoId || 'web'}`;
      const hashIntegridade = CryptoJS.SHA256(hashPayload).toString();

      // Atomic insertion via SECURITY DEFINER RPC:
      //   - Advisory lock on (colaborador_id, data) prevents concurrent ordem collision (C44)
      //   - DB UNIQUE(colaborador_id, data, hora, tipo) catches duplicate batidas (C43)
      //     without a racy SELECT pre-check
      const { data: batida, error: rpcError } = await supabase.rpc('registrar_batida_ponto', {
        p_colaborador_id: colab.id,
        p_empresa_id: colab.empresa_id,
        p_data: data,
        p_hora: hora,
        p_tipo: tipoNormalizado,
        p_origem: 'web',
        p_latitude: options?.latitude ?? null,
        p_longitude: options?.longitude ?? null,
        p_precisao_metros: options?.precisao ?? null,
        p_dispositivo_id: options?.dispositivoId || 'web-browser',
        p_dentro_raio: dentroRaio,
        p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        p_hash_integridade: hashIntegridade,
        p_foto_biometria_url: options?.foto_biometria_url ?? null,
        p_metadata: options?.metadata ?? null,
      } as any);

      if (rpcError) {
        const pgCode = (rpcError as { code?: string }).code;
        if (pgCode === '23505') {
          throw new Error('Já existe um registro idêntico para este horário. Aguarde um minuto.');
        }
        throw rpcError;
      }
      if (!batida) throw new Error('Nenhum registro de batida de ponto foi retornado.');
      return batida;
    } catch (e: any) {
      throw new Error(e.message || 'Falha ao registrar ponto', { cause: e });
    }
  },

  async buscarRegistroHoje(colaboradorId: string): Promise<any[]> {
    
    const today = format(new Date(), 'yyyy-MM-dd');
    const { data, error } = await supabase
      .from('batidas_ponto')
      .select('*')
      .eq('colaborador_id', colaboradorId)
      .eq('data', today)
      .order('ordem', { ascending: true });
    if (error) throw error;
    return data || [];
  
  },

  async buscarRegistrosSemana(colaboradorId: string): Promise<any[]> {
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { data, error } = await supabase
      .from('registros_ponto')
      .select('*')
      .eq('colaborador_id', colaboradorId)
      .gte('data', formatDateLocalISO(weekAgo))
      .order('data', { ascending: false });
    if (error) throw error;
    return data || [];
  
  },
  
  async validarBiometria(batidaId: string, colaboradorId: string, fotoBase64: string): Promise<any> {
    
    const { data, error } = await supabase.functions.invoke('validar-biometria', {
      body: { batidaId, colaboradorId, fotoBase64 }
    });
    if (error) throw error;
    return data;
  
  }
};

