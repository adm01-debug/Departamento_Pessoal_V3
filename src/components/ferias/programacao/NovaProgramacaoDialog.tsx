import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useColaboradores } from '@/hooks/useColaboradores';
import { usePeriodosAquisitivos } from '@/hooks/usePeriodosAquisitivos';
import { useProgramacaoMutations } from '@/hooks/ferias/useProgramacaoFerias';

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ano: number;
  mesInicial?: number;
}

export function NovaProgramacaoDialog({ open, onOpenChange, ano, mesInicial }: Props) {
  const { colaboradores } = useColaboradores();
  const [colaboradorId, setColaboradorId] = useState<string>('');
  const [mes, setMes] = useState<number>(mesInicial ?? new Date().getMonth() + 1);
  const [dias, setDias] = useState<number>(30);
  const [obs, setObs] = useState('');
  const { periodos } = usePeriodosAquisitivos(colaboradorId || undefined);
  const [periodoId, setPeriodoId] = useState<string>('');

  const { criar } = useProgramacaoMutations(ano);

  useEffect(() => {
    // Seleciona automaticamente o período aquisitivo mais antigo em aberto
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza período selecionado com a lista carregada (mount/prop)
    if (!periodos?.length) { setPeriodoId(''); return; }
    const aberto = periodos.find((p: any) => p.status !== 'gozado') ?? periodos[0];
    setPeriodoId(aberto.id);
  }, [periodos]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza mês com a prop mesInicial
  useEffect(() => { if (mesInicial) setMes(mesInicial); }, [mesInicial]);

  const handleSalvar = async () => {
    if (!colaboradorId) return;
    await criar.mutateAsync({
      colaborador_id: colaboradorId,
      ano,
      mes_previsto: mes,
      dias_previstos: dias,
      periodo_aquisitivo_id: periodoId || null,
      observacoes: obs || undefined,
    });
    onOpenChange(false);
    setColaboradorId(''); setDias(30); setObs('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova programação de férias</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Colaborador</Label>
            <Select value={colaboradorId} onValueChange={setColaboradorId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {(colaboradores ?? []).map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Mês</Label>
              <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MESES.map((n, i) => (
                    <SelectItem key={i} value={String(i + 1)}>{n}/{ano}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Dias</Label>
              <Input
                type="number" min={5} max={30}
                value={dias}
                onChange={(e) => setDias(Math.max(5, Math.min(30, Number(e.target.value) || 0)))}
              />
            </div>
          </div>
          {periodos?.length > 0 && (
            <div>
              <Label>Período aquisitivo</Label>
              <Select value={periodoId} onValueChange={setPeriodoId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {periodos.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.data_inicio} — {p.data_fim} {p.status ? `(${p.status})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Observações</Label>
            <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={!colaboradorId || criar.isPending}>
            {criar.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
