import { useMemo, useState } from 'react';
import { Calendar, CheckCircle2, Plus, ShieldCheck, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useColaboradores } from '@/hooks/useColaboradores';
import {
  useProgramacaoFerias,
  useProgramacaoMutations,
  type ProgramacaoFerias,
  type ProgramacaoStatus,
} from '@/hooks/ferias/useProgramacaoFerias';
import { KanbanMes } from '@/components/ferias/programacao/KanbanMes';
import { NovaProgramacaoDialog } from '@/components/ferias/programacao/NovaProgramacaoDialog';
import { RejeitarDialog } from '@/components/ferias/programacao/RejeitarDialog';

const ANOS = [new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1];
const STATUS_OPTIONS: Array<{ value: ProgramacaoStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'sugerido_gestor', label: 'Sugerido' },
  { value: 'aprovado_gestor', label: 'Aprovado Gestor' },
  { value: 'aprovado_rh', label: 'Aprovado RH' },
  { value: 'convertido', label: 'Convertido' },
  { value: 'rejeitado', label: 'Rejeitado' },
];

export default function FeriasProgramacaoPage() {
  const { hasRole } = useAuth();
  const isRH = hasRole('rh' as any) || hasRole('admin');
  const canManage = isRH || hasRole('gestor' as any);

  const [ano, setAno] = useState<number>(new Date().getFullYear());
  const [status, setStatus] = useState<ProgramacaoStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [novoOpen, setNovoOpen] = useState(false);
  const [rejeitarAlvo, setRejeitarAlvo] = useState<ProgramacaoFerias | null>(null);

  const { colaboradores } = useColaboradores();
  const { data, isLoading } = useProgramacaoFerias(ano, { status, search });
  const { mover, aprovarGestor, aprovarRH, rejeitar, converter } = useProgramacaoMutations(ano);

  const kpis = useMemo(() => {
    return {
      total: data.length,
      gestor: data.filter((p) => p.status === 'aprovado_gestor').length,
      rh: data.filter((p) => p.status === 'aprovado_rh').length,
      convertido: data.filter((p) => p.status === 'convertido').length,
    };
  }, [data]);

  return (
    <div className="space-y-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Programação Anual de Férias</h1>
          <p className="text-sm text-muted-foreground">
            Planeje as férias do time por mês. Fluxo: gestor sugere → gestor aprova → RH aprova → converte em solicitação.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setNovoOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nova programação
          </Button>
        )}
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard icon={<Calendar className="h-4 w-4" />} label="Planejadas" value={kpis.total} />
        <KpiCard icon={<UserCheck className="h-4 w-4" />} label="Aprov. Gestor" value={kpis.gestor} />
        <KpiCard icon={<ShieldCheck className="h-4 w-4" />} label="Aprov. RH" value={kpis.rh} />
        <KpiCard icon={<CheckCircle2 className="h-4 w-4" />} label="Convertidas" value={kpis.convertido} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ANOS.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as ProgramacaoStatus | 'all')}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input
          className="w-64"
          placeholder="Buscar colaborador..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="rounded-xl border bg-muted/20 p-10 text-center text-muted-foreground">
          Carregando programação...
        </div>
      ) : (
        <KanbanMes
          programacoes={data}
          totalColaboradores={colaboradores?.length ?? 0}
          canManage={canManage}
          isRH={isRH}
          onMove={(id, novoMes) => mover.mutate({ id, novo_mes: novoMes })}
          onAprovarGestor={(id) => aprovarGestor.mutate(id)}
          onAprovarRH={(id) => aprovarRH.mutate(id)}
          onRejeitar={(p) => setRejeitarAlvo(p)}
          onConverter={(p) => {
            if (window.confirm(`Converter em solicitação de férias formal para ${p.colaborador?.nome_completo}?`)) {
              converter.mutate(p.id);
            }
          }}
        />
      )}

      <NovaProgramacaoDialog open={novoOpen} onOpenChange={setNovoOpen} ano={ano} />
      <RejeitarDialog
        open={!!rejeitarAlvo}
        onOpenChange={(v) => !v && setRejeitarAlvo(null)}
        isPending={rejeitar.isPending}
        onConfirm={async (motivo) => {
          if (rejeitarAlvo) await rejeitar.mutateAsync({ id: rejeitarAlvo.id, motivo });
        }}
      />
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
        <div className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</div>
      </CardContent>
    </Card>
  );
}
