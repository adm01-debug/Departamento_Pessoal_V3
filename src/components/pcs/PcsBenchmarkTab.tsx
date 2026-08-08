import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { usePcsBenchmark } from '@/hooks/usePcs';
import { todayLocalISO } from '@/utils/dateLocal';

const brl = (v: number | null) => (v === null ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));

const FORM_INICIAL = {
  cargo_referencia: '',
  fonte: '',
  regiao: '',
  data_referencia: todayLocalISO(),
  p25: '',
  p50: '',
  p75: '',
  p90: '',
  amostra: '',
};

/** Benchmarking de mercado — percentis por cargo de referência. */
export function PcsBenchmarkTab() {
  const { pesquisas, isLoading, criar, excluir } = usePcsBenchmark();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);

  const num = (v: string): number | null => {
    if (v.trim() === '') return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  const submit = () => {
    if (form.cargo_referencia.trim().length < 2 || form.fonte.trim().length < 2) return;
    criar.mutate(
      {
        cargo_referencia: form.cargo_referencia.trim(),
        fonte: form.fonte.trim(),
        regiao: form.regiao.trim() || null,
        data_referencia: form.data_referencia,
        p25: num(form.p25),
        p50: num(form.p50),
        p75: num(form.p75),
        p90: num(form.p90),
        amostra: num(form.amostra),
      },
      { onSuccess: () => { setForm(FORM_INICIAL); setOpen(false); } },
    );
  };

  const campo = (key: keyof typeof FORM_INICIAL, label: string, type = 'text') => (
    <div className="space-y-1.5">
      <Label htmlFor={`bm-${key}`}>{label}</Label>
      <Input id={`bm-${key}`} type={type} value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
    </div>
  );

  return (
    <div className="space-y-4">
      <Card className="border-border/30 rounded-2xl bg-card/50">
        <CardContent className="flex items-center justify-between gap-4 p-4">
          <p className="text-xs text-muted-foreground">
            Registre pesquisas salariais para comparar as faixas internas com o mercado (P25 a P90).
          </p>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Nova referência</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Nova referência de mercado</DialogTitle></DialogHeader>
              <div className="space-y-4">
                {campo('cargo_referencia', 'Cargo de referência')}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {campo('fonte', 'Fonte da pesquisa')}
                  {campo('regiao', 'Região')}
                </div>
                {campo('data_referencia', 'Data de referência', 'date')}
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {campo('p25', 'P25', 'number')}
                  {campo('p50', 'P50', 'number')}
                  {campo('p75', 'P75', 'number')}
                  {campo('p90', 'P90', 'number')}
                </div>
                {campo('amostra', 'Tamanho da amostra', 'number')}
                <Button className="w-full" onClick={submit} disabled={criar.isPending}>Salvar referência</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center p-8"><Spinner size="lg" /></div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/30">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Cargo</TableHead>
                <TableHead>Fonte</TableHead>
                <TableHead>Região</TableHead>
                <TableHead>Referência</TableHead>
                <TableHead className="text-right">P25</TableHead>
                <TableHead className="text-right">P50</TableHead>
                <TableHead className="text-right">P75</TableHead>
                <TableHead className="text-right">P90</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pesquisas.map((p) => (
                <TableRow key={p.id} className="border-b border-border/10 last:border-0">
                  <TableCell className="py-3 pl-6 text-sm font-bold">{p.cargo_referencia}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.fonte}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.regiao || '—'}</TableCell>
                  <TableCell className="font-mono text-[11px]">
                    {new Date(`${p.data_referencia}T00:00:00`).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right text-sm">{brl(p.p25)}</TableCell>
                  <TableCell className="text-right text-sm font-bold">{brl(p.p50)}</TableCell>
                  <TableCell className="text-right text-sm">{brl(p.p75)}</TableCell>
                  <TableCell className="text-right text-sm">{brl(p.p90)}</TableCell>
                  <TableCell className="pr-4 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remover referência ${p.cargo_referencia}`}
                      className="h-8 w-8"
                      onClick={() => excluir.mutate(p.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {pesquisas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhuma pesquisa registrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
