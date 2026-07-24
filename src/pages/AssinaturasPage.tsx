import { PageTitle } from '@/components/PageTitle';
import { useState } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PenTool, FileText, CheckCircle2, Clock, AlertCircle, Search,
  Send, Eye, Download, XCircle, Users, RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAssinaturas } from '@/hooks/useAssinaturas';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pendente: { label: 'Pendente', color: 'bg-warning/10 text-warning border-warning/30', icon: Clock },
  assinado: { label: 'Assinado', color: 'bg-success/10 text-success border-success/30', icon: CheckCircle2 },
  expirado: { label: 'Expirado', color: 'bg-muted text-muted-foreground border-border', icon: AlertCircle },
  recusado: { label: 'Recusado', color: 'bg-destructive/10 text-destructive border-destructive/30', icon: XCircle },
};

export default function AssinaturasPage(): React.ReactElement {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('todos');
  const { documentos, stats, isLoading, refetch } = useAssinaturas();

  const filtered = documentos
    .filter(d => filter === 'todos' || d.status === filter)
    .filter(d =>
      d.titulo.toLowerCase().includes(search.toLowerCase()) ||
      d.colaborador.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <>
      <PageTitle title="Assinaturas" description="Gestão de assinaturas digitais" />
      <PageLayout
        title="Assinaturas Digitais"
        description="Gerencie documentos para assinatura eletrônica"
        icon={<PenTool className="w-6 h-6 text-primary" />}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => refetch()} aria-label="Atualizar">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button><Send className="w-4 h-4 mr-2" /> Enviar para Assinatura</Button>
          </div>
        }
      >
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, icon: FileText, color: 'text-primary' },
            { label: 'Pendentes', value: stats.pendentes, icon: Clock, color: 'text-warning' },
            { label: 'Assinados', value: stats.assinados, icon: CheckCircle2, color: 'text-success' },
            { label: 'Expirados', value: stats.expirados, icon: AlertCircle, color: 'text-muted-foreground' },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className={cn("w-8 h-8", s.color)} />
                <div>
                  {isLoading ? (
                    <Skeleton className="h-7 w-10" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar documento ou colaborador..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['todos', 'pendente', 'assinado', 'expirado', 'recusado'].map(f => (
              <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)} className="capitalize">
                {f === 'todos' ? 'Todos' : statusConfig[f]?.label || f}
              </Button>
            ))}
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardContent className="p-4 flex items-center gap-4">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Documents */}
        {!isLoading && (
          <div className="space-y-3">
            {filtered.map(doc => {
              const sc = statusConfig[doc.status];
              const StatusIcon = sc.icon;
              return (
                <Card key={doc.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground truncate">{doc.titulo}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" />
                        <span>{doc.colaborador}</span>
                        <span>·</span>
                        <span>{doc.tipo}</span>
                        <span>·</span>
                        <span>{new Date(doc.criadoEm).toLocaleDateString('pt-BR')}</span>
                        {doc.assinadoEm && (
                          <>
                            <span>·</span>
                            <span className="text-success">Assinado em {new Date(doc.assinadoEm).toLocaleDateString('pt-BR')}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("shrink-0", sc.color)}>
                      <StatusIcon className="w-3 h-3 mr-1" />{sc.label}
                    </Badge>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Visualizar documento"><Eye className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Baixar documento"><Download className="w-4 h-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <PenTool className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum documento encontrado</p>
          </div>
        )}
      </PageLayout>
    </>
  );
}
