import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, ShieldBan, ShieldCheck, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { safeErrorMessage } from '@/utils/safeError';

const IP_V4_REGEX = /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
const IP_V4_CIDR_REGEX = /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)\/(3[0-2]|[12]?\d)$/;

function isValidIP(value: string): boolean {
  const trimmed = value.trim();
  return IP_V4_REGEX.test(trimmed) || IP_V4_CIDR_REGEX.test(trimmed);
}

export function IPBlockingTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ip_address: '', reason: '', permanent: true, hours: '24' });

  const { data: blockedIps = [], isLoading } = useQuery({
    queryKey: ['blocked-ips'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blocked_ips')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const bloquear = useMutation({
    mutationFn: async () => {
      const ip = form.ip_address.trim();
      if (!isValidIP(ip)) throw new Error('Endereço IP inválido. Use formato IPv4 (ex: 192.168.1.1) ou CIDR (ex: 10.0.0.0/24).');
      const reason = form.reason.trim().slice(0, 200);
      const hours = Math.max(1, Math.min(8760, Number(form.hours) || 24));

      const payload: any = {
        ip_address: ip,
        reason: reason || null,
        permanent: form.permanent,
        blocked_at: new Date().toISOString(),
      };
      if (!form.permanent) {
        const expires = new Date();
        expires.setHours(expires.getHours() + hours);
        payload.expires_at = expires.toISOString();
      }
      const { error } = await supabase.from('blocked_ips').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blocked-ips'] });
      toast.success('IP bloqueado com sucesso');
      setOpen(false);
      setForm({ ip_address: '', reason: '', permanent: true, hours: '24' });
    },
    onError: (err: any) => toast.error(safeErrorMessage(err, 'Erro ao bloquear IP.')),
  });

  const desbloquear = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blocked_ips').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blocked-ips'] });
      toast.success('IP desbloqueado');
    },
  });

  const ativos = blockedIps.filter((ip: any) => ip.permanent || !ip.expires_at || new Date(ip.expires_at) > new Date());
  const expirados = blockedIps.length - ativos.length;

  if (isLoading) return <div className="flex justify-center p-8"><Spinner size="lg" /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Bloqueados', value: blockedIps.length, icon: ShieldBan, gradient: 'from-destructive to-destructive/70' },
          { label: 'Ativos', value: ativos.length, icon: ShieldBan, gradient: 'from-warning to-warning/70' },
          { label: 'Expirados', value: expirados, icon: Clock, gradient: 'from-muted-foreground to-muted-foreground/70' },
        ].map(({ label, value, icon: Icon, gradient }) => (
          <Card key={label} className="border-border/30 rounded-2xl overflow-hidden">
            <div className={cn("h-[2px] bg-gradient-to-r", gradient)} />
            <CardContent className="p-3 flex items-center gap-3">
              <div className={cn("p-2 rounded-xl bg-gradient-to-br", gradient)}><Icon className="h-4 w-4 text-primary-foreground" /></div>
              <div><p className="text-lg font-bold font-display">{value}</p><p className="text-[10px] text-muted-foreground font-body">{label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden">
        <div className="h-[2px] bg-gradient-to-r from-destructive to-warning" />
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display">IPs Bloqueados</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl bg-gradient-to-r from-destructive to-warning font-body">
                <Plus className="h-4 w-4 mr-1" />Bloquear IP
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader><DialogTitle className="font-display">Bloquear IP</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="font-body">Endereço IP</Label>
                  <Input value={form.ip_address} onChange={e => setForm(p => ({ ...p, ip_address: e.target.value }))} placeholder="192.168.1.1" className="rounded-xl font-mono" />
                </div>
                <div>
                  <Label className="font-body">Motivo</Label>
                  <Input value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} placeholder="Tentativas de acesso suspeitas" className="rounded-xl" />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="font-body">Bloqueio permanente?</Label>
                  <Switch checked={form.permanent} onCheckedChange={v => setForm(p => ({ ...p, permanent: v }))} />
                </div>
                {!form.permanent && (
                  <div>
                    <Label className="font-body">Duração (horas)</Label>
                    <Input type="number" value={form.hours} onChange={e => setForm(p => ({ ...p, hours: e.target.value }))} className="rounded-xl" />
                  </div>
                )}
                <Button className="w-full rounded-xl bg-gradient-to-r from-destructive to-warning" onClick={() => bloquear.mutate()} disabled={!form.ip_address || bloquear.isPending}>
                  {bloquear.isPending ? 'Bloqueando...' : 'Bloquear IP'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {blockedIps.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground font-body">
              <ShieldCheck className="mx-auto h-10 w-10 mb-3 opacity-30" />
              <p>Nenhum IP bloqueado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-display">IP</TableHead>
                  <TableHead className="font-display">Motivo</TableHead>
                  <TableHead className="font-display">Tipo</TableHead>
                  <TableHead className="font-display">Expira em</TableHead>
                  <TableHead className="font-display">Status</TableHead>
                  <TableHead className="font-display">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blockedIps.map((ip: any) => {
                  const ativo = ip.permanent || !ip.expires_at || new Date(ip.expires_at) > new Date();
                  return (
                    <TableRow key={ip.id} className={cn("hover:bg-accent/30 transition-colors", !ativo && "opacity-50")}>
                      <TableCell className="font-mono font-medium text-sm">{ip.ip_address}</TableCell>
                      <TableCell className="font-body text-sm text-muted-foreground">{ip.reason || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-xs font-body", ip.permanent ? "border-destructive/30 text-destructive" : "border-warning/30 text-warning")}>
                          {ip.permanent ? 'Permanente' : 'Temporário'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-body text-xs">
                        {ip.permanent ? '—' : ip.expires_at ? new Date(ip.expires_at).toLocaleString('pt-BR') : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("border-0 text-xs font-body", ativo ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground")}>
                          {ativo ? 'Ativo' : 'Expirado'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" aria-label="Remover" className="h-7 w-7 text-success" onClick={() => desbloquear.mutate(ip.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
