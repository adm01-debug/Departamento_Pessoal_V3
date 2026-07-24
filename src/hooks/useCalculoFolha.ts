import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { folhaCalc, CalculoResultado } from '@/utils/folhaCalc';
import { calculoLoteService, BatchProgress } from '@/services/folha/calculoLoteService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';

export function useCalculoFolha() {
  const [resultado, setResultado] = useState<CalculoResultado | null>(null);
  const [isCalculando, setIsCalculando] = useState(false);
  const [progressoLote, setProgressoLote] = useState<BatchProgress | null>(null);
  const queryClient = useQueryClient();

  const calcularEGuardar = useMutation({
    mutationFn: async ({ 
      colaboradorId, 
      empresaId, 
      competencia, 
      salarioBase,
      params 
    }: { 
      colaboradorId: string; 
      empresaId: string; 
      competencia: string;
      salarioBase: number;
      params?: any;
    }) => {
      setIsCalculando(true);
      
      try {
        const res = folhaCalc.processar(salarioBase, params);
        setResultado(res);

        // 1. Garantir que o header da folha existe
        const { data: header, error: headerError } = await supabase
          .from('folhas_pagamento')
          .select('id')
          .eq('empresa_id', empresaId)
          .eq('competencia', competencia)
          .maybeSingle();

        if (headerError) throw headerError;

        let folhaId = header?.id;

        if (!folhaId) {
          const { data: newHeader, error: createError } = await supabase
            .from('folhas_pagamento')
            .insert({
              empresa_id: empresaId,
              competencia,
              status: 'aberta',
              tipo: 'Mensal'
            })
            .select('id')
            .single();
          
          if (createError) throw createError;
          folhaId = newHeader.id;
        }

        // 2. Salvar ou atualizar o item da folha
        const { data, error } = await supabase
          .from('folha_itens')
          .upsert({
            folha_id: folhaId,
            colaborador_id: colaboradorId,
            salario_base: salarioBase,
            total_proventos: res.proventos,
            total_descontos: res.descontos,
            total_liquido: res.liquido,
            inss_mes: res.inss,
            irrf_mes: res.irrf,
            fgts_mes: res.fgts,
            detalhes: res as any
          })
          .select()
          .single();

        if (error) throw error;

        // 3. Registrar auditoria
        await supabase.from('folha_auditoria').insert({
          folha_id: folhaId,
          colaborador_id: colaboradorId,
          tipo_evento: 'CALCULO',
          mensagem: 'Cálculo de folha individual realizado com sucesso',
          severidade: 'INFO',
          detalhes: { 
            liquido: res.liquido, 
            base: salarioBase,
            params_used: params 
          } as any
        });

        return data;
      } catch (err: unknown) {
        console.error('Erro no cálculo de folha:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folhas'] });
      queryClient.invalidateQueries({ queryKey: ['folha_itens'] });
      toast.success('Folha calculada e salva com sucesso.');
    },
    onError: (error: Error) => {
      toast.error(safeErrorMessage(error, 'Falha no processamento da folha.'));
    },
    onSettled: () => setIsCalculando(false)
  });

  const calcularLote = useMutation({
    mutationFn: async ({ empresaId, competencia }: { empresaId: string; competencia: string }) => {
      setIsCalculando(true);
      return await calculoLoteService.processarLote(empresaId, competencia, (p) => {
        setProgressoLote(p);
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['folhas'] });
      toast.success(`Lote concluído: ${data.success} sucessos, ${data.errors} falhas.`);
    },
    onSettled: () => {
      setIsCalculando(false);
      setTimeout(() => setProgressoLote(null), 3000);
    }
  });

  return {
    resultado,
    isCalculando: isCalculando || calcularEGuardar.isPending || calcularLote.isPending,
    progressoLote,
    executarCalculo: calcularEGuardar.mutateAsync,
    executarCalculoLote: calcularLote.mutateAsync,
    resetResultado: () => setResultado(null)
  };
}
