import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks/useEmpresas';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Props {
  competencia: string; // YYYY-MM
}

const CANAIS = [
  { key: 'portal', label: 'Portal do Colaborador', description: 'Notificação in-app (imediato)' },
  { key: 'email', label: 'E-mail', description: 'Envio pelo provedor configurado' },
  { key: 'whatsapp', label: 'WhatsApp', description: 'Requer integração ativa' },
] as const;

export function DistribuirHoleritesButton({ competencia }: Props) {
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({ portal: true });

  const { data: folha } = useQuery({
    queryKey: ['folha-por-competencia', empresaId, competencia],
    queryFn: async () => {
      if (!empresaId) return null;
      const { data, error } = await supabase
        .from('folhas_pagamento')
        .select('id, status, competencia')
        .eq('empresa_id', empresaId)
        .eq('competencia', competencia)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!empresaId && !!competencia,
  });

  const { data: stats } = useQuery({
    queryKey: ['dist-stats', folha?.id],
    queryFn: async () => {
      if (!folha?.id) return null;
      const { data, error } = await supabase
        .from('holerite_distribuicoes')
        .select('canal, status')
        .eq('folha_id', folha.id);
      if (error) throw error;
      const byCanal: Record<string, { enviado: number; falhou: number }> = {};
      for (const r of data ?? []) {
        byCanal[r.canal] ??= { enviado: 0, falhou: 0 };
        if (r.status === 'enviado') byCanal[r.canal].enviado++;
        if (r.status === 'falhou') byCanal[r.canal].falhou++;
      }
      return byCanal;
    },
    enabled: !!folha?.id,
  });

  const canaisSelecionados = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([k]) => k),
    [selected]
  );

  const distribuir = useMutation({
    mutationFn: async () => {
      if (!folha?.id) throw new Error('Folha não encontrada para essa competência');
      if (!canaisSelecionados.length) throw new Error('Selecione ao menos um canal');
      const { data, error } = await supabase.functions.invoke('distribuir-holerites', {
        body: { folha_id: folha.id, canais: canaisSelecionados },
      });
      if (error) throw error;
      return data as { novos: number; total: number; ja_distribuidos: number };
    },
    onSuccess: (res) => {
      toast.success(
        `Distribuição enfileirada: ${res.novos} novos (${res.ja_distribuidos} já haviam sido enviados de ${res.total} holerites).`
      );
      qc.invalidateQueries({ queryKey: ['dist-stats', folha?.id] });
      qc.invalidateQueries({ queryKey: ['notificacoes'] });
      setOpen(false);
    },
    onError: (err: any) => toast.error(safeErrorMessage(err, 'Falha na distribuição de holerites.')),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="gap-2" disabled={!folha}>
          <Send className="h-4 w-4" />
          Distribuir em massa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Distribuir holerites — {competencia}</DialogTitle>
          <DialogDescription>
            {folha
              ? 'Selecione os canais para envio a todos os colaboradores desta folha.'
              : 'Nenhuma folha encontrada para essa competência.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {CANAIS.map((c) => {
            const s = stats?.[c.key];
            return (
              <label
                key={c.key}
                className="flex items-start gap-3 rounded-lg border border-border/40 p-3 cursor-pointer hover:bg-muted/30 transition-colors"
              >
                <Checkbox
                  checked={!!selected[c.key]}
                  onCheckedChange={(v) => setSelected((s) => ({ ...s, [c.key]: !!v }))}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{c.label}</p>
                  <p className="text-xs text-muted-foreground">{c.description}</p>
                  {s && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Já enviados: <span className="text-success font-medium">{s.enviado}</span>
                      {s.falhou > 0 && <> · Falhas: <span className="text-destructive">{s.falhou}</span></>}
                    </p>
                  )}
                </div>
              </label>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={distribuir.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={() => distribuir.mutate()}
            disabled={distribuir.isPending || !folha || !canaisSelecionados.length}
            className="gap-2"
          >
            {distribuir.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Distribuir agora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
