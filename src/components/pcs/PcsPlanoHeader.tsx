import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { PCS_STATUS, PCS_STATUS_LABEL, type PcsPlano, type PcsStatus } from '@/types/pcs';

interface PcsPlanoHeaderProps {
  planos: PcsPlano[];
  planoId: string | null;
  onSelect: (id: string) => void;
  onCriar: (input: { nome: string; amplitude_pct: number; overlap_pct: number; num_steps: number }) => void;
  onStatus: (status: PcsStatus) => void;
  isCriando: boolean;
}

/** Cabeçalho de contexto: escolhe o plano vigente e cria novas versões. */
export function PcsPlanoHeader({ planos, planoId, onSelect, onCriar, onStatus, isCriando }: PcsPlanoHeaderProps) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [amplitude, setAmplitude] = useState('40');
  const [overlap, setOverlap] = useState('25');
  const [steps, setSteps] = useState('5');

  const plano = planos.find((p) => p.id === planoId) ?? null;
  const statusAtual = (plano?.status ?? 'rascunho') as PcsStatus;

  const submit = () => {
    const amp = Number(amplitude);
    const ovl = Number(overlap);
    const stp = Number(steps);
    if (nome.trim().length < 3) return;
    if (!Number.isFinite(amp) || amp <= 0 || !Number.isFinite(ovl) || ovl < 0 || !Number.isFinite(stp) || stp < 1) return;
    onCriar({ nome: nome.trim(), amplitude_pct: amp, overlap_pct: ovl, num_steps: Math.trunc(stp) });
    setNome('');
    setOpen(false);
  };

  return (
    <Card className="border-border/30 rounded-2xl bg-card/50">
      <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Plano vigente</Label>
            <Select value={planoId ?? ''} onValueChange={onSelect}>
              <SelectTrigger className="w-full md:w-72">
                <SelectValue placeholder="Selecione um plano" />
              </SelectTrigger>
              <SelectContent>
                {planos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome} · v{p.versao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {plano && (
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Status</Label>
              <Select value={statusAtual} onValueChange={(v) => onStatus(v as PcsStatus)}>
                <SelectTrigger className="w-full md:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PCS_STATUS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {PCS_STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {plano && (
            <div className="flex flex-wrap gap-2 pb-1">
              <Badge variant="outline" className="text-[10px]">Amplitude {plano.amplitude_pct}%</Badge>
              <Badge variant="outline" className="text-[10px]">Overlap {plano.overlap_pct}%</Badge>
              <Badge variant="outline" className="text-[10px]">{plano.num_steps} steps</Badge>
            </div>
          )}
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo plano
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo plano de cargos e salários</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="pcs-nome">Nome do plano</Label>
                <Input id="pcs-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="PCS 2026" />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pcs-amp">Amplitude (%)</Label>
                  <Input id="pcs-amp" type="number" min={1} value={amplitude} onChange={(e) => setAmplitude(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pcs-ovl">Overlap (%)</Label>
                  <Input id="pcs-ovl" type="number" min={0} value={overlap} onChange={(e) => setOverlap(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pcs-stp">Steps</Label>
                  <Input id="pcs-stp" type="number" min={1} value={steps} onChange={(e) => setSteps(e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                O plano nasce com os 6 fatores da metodologia clássica de avaliação por pontos. Você pode ajustar pesos e graus depois.
              </p>
              <Button className="w-full" onClick={submit} disabled={isCriando}>
                Criar plano
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
