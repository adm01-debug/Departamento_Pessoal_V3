import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks/useEmpresas';
import {
  contratoTemplateService,
  type ContratoGerado,
} from '@/services/contratoTemplateService';
import { toast } from 'sonner';
import {
  Copy,
  Download,
  ExternalLink,
  FileText,
  ShieldCheck,
  Search,
  RefreshCw,
  FileSpreadsheet,
  Send,
  History,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type EventoContrato = {
  id: string;
  evento: string;
  detalhes: Record<string, unknown> | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
};

const EVENTO_LABELS: Record<string, string> = {
  token_gerado: 'Token de assinatura gerado',
  token_revogado: 'Token revogado',
  token_expiracao_estendida: 'Prazo estendido',
  assinatura_visualizada: 'Página de assinatura acessada',
  assinatura_concluida: 'Contrato assinado',
  cpf_invalido: 'Tentativa com CPF inválido',
  lembrete_enviado: 'Lembrete enviado ao gestor',
};

type StatusFilter = 'todos' | ContratoGerado['status'];

const STATUS_META: Record<
  ContratoGerado['status'],
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  rascunho: { label: 'Rascunho', variant: 'outline' },
  gerado: { label: 'Gerado', variant: 'secondary' },
  enviado: { label: 'Enviado', variant: 'default' },
  assinado: { label: 'Assinado', variant: 'default' },
  cancelado: { label: 'Cancelado', variant: 'destructive' },
};

interface ColaboradorLite {
  id: string;
  nome_completo: string | null;
  cpf: string | null;
}

export default function ContratosGeradosPage() {
  const { empresaAtual } = useEmpresas();
  const [contratos, setContratos] = useState<ContratoGerado[]>([]);
  const [colaboradores, setColaboradores] = useState<Record<string, ColaboradorLite>>({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusFilter>('todos');
  const [busca, setBusca] = useState('');
  const [periodo, setPeriodo] = useState<'todos' | '30' | '90' | '365'>('todos');
  const [drawerContrato, setDrawerContrato] = useState<ContratoGerado | null>(null);
  const [eventos, setEventos] = useState<EventoContrato[]>([]);
  const [loadingEventos, setLoadingEventos] = useState(false);

  const abrirTimeline = async (c: ContratoGerado) => {
    setDrawerContrato(c);
    setLoadingEventos(true);
    setEventos([]);
    try {
      const data = await contratoTemplateService.listarEventos(c.id);
      setEventos(data);
    } catch (e) {
      console.error('[eventos-contrato]', e);
      toast.error('Falha ao carregar histórico');
    } finally {
      setLoadingEventos(false);
    }
  };

  const carregar = async () => {
    if (!empresaAtual) return;
    setLoading(true);
    try {
      const gerados = await contratoTemplateService.listarGerados(empresaAtual.id);
      setContratos(gerados);
      const ids = Array.from(
        new Set(gerados.map((g) => g.colaborador_id).filter((v): v is string => !!v)),
      ).slice(0, 500);
      if (ids.length) {
        const { data } = await supabase
          .from('colaboradores')
          .select('id, nome_completo, cpf')
          .in('id', ids)
          .limit(500);
        const map: Record<string, ColaboradorLite> = {};
        (data ?? []).forEach((c) => {
          map[c.id] = c as ColaboradorLite;
        });
        setColaboradores(map);
      }
    } catch (e) {
      console.error('[contratos-gerados]', e);
      toast.error('Falha ao carregar contratos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial no mount
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaAtual?.id]);

  const filtrados = useMemo(() => {
    const term = busca.trim().toLowerCase();
    // eslint-disable-next-line react-hooks/purity -- filtro por janela de tempo relativa ao agora
    const cutoff = periodo === 'todos' ? null : Date.now() - Number(periodo) * 86400_000;
    return contratos.filter((c) => {
      if (status !== 'todos' && c.status !== status) return false;
      if (cutoff && new Date(c.created_at).getTime() < cutoff) return false;
      if (term) {
        const col = c.colaborador_id ? colaboradores[c.colaborador_id] : undefined;
        const alvo = `${col?.nome_completo ?? ''} ${col?.cpf ?? ''} ${c.sha256 ?? ''}`.toLowerCase();
        if (!alvo.includes(term)) return false;
      }
      return true;
    });
  }, [contratos, status, busca, colaboradores, periodo]);

  const [pagina, setPagina] = useState(1);
  const PAGE_SIZE = 25;
  // eslint-disable-next-line react-hooks/set-state-in-effect -- reseta paginação ao trocar filtros
  useEffect(() => setPagina(1), [status, busca, periodo]);
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const paginados = useMemo(
    () => filtrados.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE),
    [filtrados, pagina],
  );

  const kpis = useMemo(() => {
    const total = contratos.length;
    const assinados = contratos.filter((c) => c.status === 'assinado').length;
    const enviados = contratos.filter((c) => c.status === 'enviado').length;
    const conversao = enviados + assinados > 0 ? Math.round((assinados / (enviados + assinados)) * 100) : 0;
    return { total, assinados, enviados, conversao };
  }, [contratos]);

  const copiarLinkVerificacao = async (hash: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/verificar-contrato/${hash}`);
    toast.success('Link de verificação copiado');
  };

  const baixarPdf = async (path: string) => {
    try {
      const url = await contratoTemplateService.downloadUrl(path);
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      console.error('[download-contrato]', e);
      toast.error('Não foi possível gerar o link de download');
    }
  };

  const reenviarLink = async (contratoId: string) => {
    try {
      const { url } = await contratoTemplateService.gerarTokenAssinatura(contratoId, { validadeDias: 7 });
      await navigator.clipboard.writeText(url);
      toast.success('Novo link gerado e copiado (válido por 7 dias)');
      void carregar();
    } catch (e) {
      console.error('[reenviar-link]', e);
      toast.error('Falha ao gerar link de assinatura');
    }
  };

  const exportarCsv = () => {
    if (!filtrados.length) {
      toast.error('Nenhum contrato para exportar');
      return;
    }
    const headers = [
      'Colaborador',
      'CPF',
      'Status',
      'Gerado em',
      'Assinado em',
      'Hash SHA-256',
      'Link Público',
    ];
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const linhas = filtrados.map((c) => {
      const col = c.colaborador_id ? colaboradores[c.colaborador_id] : undefined;
      const linkPublico = c.sha256 && c.status === 'assinado'
        ? `${window.location.origin}/verificar-contrato/${c.sha256}`
        : '';
      return [
        col?.nome_completo ?? '',
        col?.cpf ?? '',
        STATUS_META[c.status].label,
        format(new Date(c.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
        c.assinado_em ? format(new Date(c.assinado_em), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '',
        c.sha256 ?? '',
        linkPublico,
      ].map(escape).join(';');
    });
    const csv = '\uFEFF' + [headers.map(escape).join(';'), ...linhas].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contratos-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtrados.length} contrato(s) exportado(s)`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" /> Contratos Gerados
          </h1>
          <p className="text-muted-foreground text-sm">
            Auditoria e acompanhamento de contratos emitidos, assinados e verificáveis publicamente.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportarCsv} disabled={loading || !filtrados.length}>
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Exportar CSV
          </Button>
          <Button variant="outline" onClick={() => void carregar()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-3xl">{kpis.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Assinados</CardDescription>
            <CardTitle className="text-3xl text-primary">{kpis.assinados}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Aguardando assinatura</CardDescription>
            <CardTitle className="text-3xl">{kpis.enviados}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Conversão</CardDescription>
            <CardTitle className="text-3xl">{kpis.conversao}%</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CPF ou hash"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {(['todos', 'rascunho', 'gerado', 'enviado', 'assinado', 'cancelado'] as const).map(
                (s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={status === s ? 'default' : 'outline'}
                    onClick={() => setStatus(s)}
                  >
                    {s === 'todos' ? 'Todos' : STATUS_META[s].label}
                  </Button>
                ),
              )}
            </div>
            <div className="flex gap-1 flex-wrap ml-auto">
              {(['todos', '30', '90', '365'] as const).map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={periodo === p ? 'default' : 'outline'}
                  onClick={() => setPeriodo(p)}
                >
                  {p === 'todos' ? 'Todo período' : `${p} dias`}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtrados.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-10">
              Nenhum contrato encontrado com os filtros atuais.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Gerado em</TableHead>
                    <TableHead>Assinado em</TableHead>
                    <TableHead className="font-mono text-xs">Hash</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginados.map((c) => {
                    const col = c.colaborador_id ? colaboradores[c.colaborador_id] : undefined;
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div className="font-medium">{col?.nome_completo ?? '—'}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {col?.cpf ?? ''}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_META[c.status].variant}>
                            {STATUS_META[c.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {format(new Date(c.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-xs">
                          {c.assinado_em
                            ? format(new Date(c.assinado_em), "dd/MM/yy HH:mm", { locale: ptBR })
                            : '—'}
                        </TableCell>
                        <TableCell className="font-mono text-[10px]">
                          {c.sha256 ? `${c.sha256.substring(0, 12)}…` : '—'}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Ver histórico de eventos"
                            onClick={() => void abrirTimeline(c)}
                          >
                            <History className="h-4 w-4" />
                          </Button>
                          {c.storage_path && (
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Baixar PDF"
                              onClick={() => void baixarPdf(c.storage_path!)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          {(c.status === 'gerado' || c.status === 'enviado') && (
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Gerar/reenviar link de assinatura"
                              onClick={() => void reenviarLink(c.id)}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                          {c.status === 'assinado' && c.sha256 && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Copiar link de verificação"
                                onClick={() => void copiarLinkVerificacao(c.sha256!)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Abrir portal público"
                                asChild
                              >
                                <a
                                  href={`/verificar-contrato/${c.sha256}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {!loading && filtrados.length > PAGE_SIZE && (
            <div className="flex items-center justify-between mt-4 text-xs">
              <span className="text-muted-foreground">
                Mostrando {(pagina - 1) * PAGE_SIZE + 1}–
                {Math.min(pagina * PAGE_SIZE, filtrados.length)} de {filtrados.length}
              </span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagina === 1}
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </Button>
                <span className="px-3 py-1 rounded-md border bg-muted/30">
                  {pagina} / {totalPaginas}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagina >= totalPaginas}
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center">
        <ShieldCheck className="h-3 w-3" /> Contratos assinados possuem verificação pública por hash
        SHA-256 (MP 2.200-2/2001)
      </p>

      <Sheet open={!!drawerContrato} onOpenChange={(o) => !o && setDrawerContrato(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5" /> Histórico de Eventos
            </SheetTitle>
            <SheetDescription>
              Trilha de auditoria completa (últimos 200 eventos).
            </SheetDescription>
          </SheetHeader>
          {drawerContrato && (
            <div className="mt-4 space-y-4">
              <div className="rounded-md border p-3 text-xs space-y-1 bg-muted/30">
                <div>
                  <span className="text-muted-foreground">Colaborador: </span>
                  <span className="font-medium">
                    {drawerContrato.colaborador_id
                      ? colaboradores[drawerContrato.colaborador_id]?.nome_completo ?? '—'
                      : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status: </span>
                  <Badge variant={STATUS_META[drawerContrato.status].variant}>
                    {STATUS_META[drawerContrato.status].label}
                  </Badge>
                </div>
                {drawerContrato.sha256 && (
                  <div className="font-mono break-all">
                    <span className="text-muted-foreground">SHA-256: </span>
                    {drawerContrato.sha256}
                  </div>
                )}
              </div>

              {loadingEventos ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : eventos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum evento registrado ainda.
                </p>
              ) : (
                <ol className="relative border-l border-border pl-4 space-y-3">
                  {eventos.map((ev) => (
                    <li key={ev.id} className="relative">
                      <span className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-primary ring-2 ring-background" />
                      <div className="text-sm font-medium">
                        {EVENTO_LABELS[ev.evento] ?? ev.evento}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {format(new Date(ev.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                        {ev.ip && <> · IP {ev.ip}</>}
                      </div>
                      {ev.detalhes && Object.keys(ev.detalhes).length > 0 && (
                        <pre className="mt-1 text-[10px] bg-muted/40 rounded p-2 overflow-x-auto max-h-32">
                          {JSON.stringify(ev.detalhes, null, 2)}
                        </pre>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
