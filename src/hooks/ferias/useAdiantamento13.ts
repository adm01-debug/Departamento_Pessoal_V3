/**
 * useAdiantamento13 — Lei 4.749/65 Art. 2º §2º.
 *
 * Permite ao RH/colaborador solicitar antecipação da 1ª parcela do 13º
 * junto às férias, respeitando prazo legal (até 31/jan do ano do gozo)
 * e unicidade (1x por ano).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SolicitarAdiant13Input {
  feriasId: string;
}

export interface SolicitarAdiant13Result {
  ok: boolean;
  ano: number;
  valor: number;
  meses_avos: number;
}

export function useSolicitarAdiantamento13() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ feriasId }: SolicitarAdiant13Input): Promise<SolicitarAdiant13Result> => {
      const { data, error } = await supabase.rpc('solicitar_adiantamento_13_ferias', {
        p_ferias_id: feriasId,
      });
      if (error) throw error;
      return data as unknown as SolicitarAdiant13Result;
    },
    onSuccess: (res) => {
      toast.success(
        `Adiantamento do 13º aprovado — R$ ${res.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${res.meses_avos} avos/${res.ano}).`,
      );
      qc.invalidateQueries({ queryKey: ['ferias'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Falha ao solicitar adiantamento do 13º';
      toast.error(msg);
    },
  });
}
