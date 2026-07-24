import { useEffect, useMemo, useState } from 'react';
import { todayLocalISO } from '@/utils/dateLocal';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks/useEmpresas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { Loader2, FileText, ShieldCheck, Users, CheckCircle2, Plus, Send, Bell, UserX, Download } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Documento = {
  id: string;
  titulo: string;
  conteudo_html: string;
  versao: number;
  status: 'RASCUNHO' | 'PUBLICADO' | 'ARQUIVADO';
  hash_sha256: string | null;
  publicado_em: string | null;
  created_at: string;
};

type Dashboard = {
  documento: { id: string; titulo: string; versao: number; publicado_em: string; hash: string } | null;
  total_colaboradores: number;
  assinados: number;
  pendentes: number;
  adesao_pct: number;
};

type Pendente = {
  colaborador_id: string;
  nome: string;
  email: string | null;
  cargo: string | null;
  departamento: string | null;
  tem_usuario: boolean;
  ultima_notificacao: string | null;
};

const AdminRegimentoInternoPage = () => {
  const { empresaAtual } = useEmpresas();
  const [loading, setLoading] = useState(true);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [pendentes, setPendentes] = useState<Pendente[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novoConteudo, setNovoConteudo] = useState('');
  const [saving, setSaving] = useState(false);
  const [notificando, setNotificando] = useState(false);

  const proximaVersao = useMemo(
    () => (documentos.length ? Math.max(...documentos.map((d) => d.versao)) + 1 : 1),
    [documentos]
  );

  const carregar = async () => {
    if (!empresaAtual?.id) return;
    setLoading(true);
    try {
      const [docsRes, dashRes, pendRes] = await Promise.all([
        supabase
          .from('sst_regimento_documentos')
          .select('*')
          .eq('empresa_id', empresaAtual.id)
          .order('versao', { ascending: false })
          .limit(50),
        supabase.rpc('sst_regimento_dashboard', { p_empresa_id: empresaAtual.id }),
        supabase.rpc('sst_regimento_pendentes_lista', { p_empresa_id: empresaAtual.id }),
      ]);
      if (docsRes.error) throw docsRes.error;
      if (dashRes.error) throw dashRes.error;
      setDocumentos((docsRes.data ?? []) as Documento[]);
      setDash(dashRes.data as unknown as Dashboard);
      setPendentes((pendRes.error ? [] : (pendRes.data ?? [])) as Pendente[]);
    } catch (err) {
      console.error(err);
      toast.error('Falha ao carregar Regimento Interno');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaAtual?.id]);

  const criarDocumento = async () => {
    if (!empresaAtual?.id) return;
    if (!novoTitulo.trim() || !novoConteudo.trim()) {
      toast.error('Título e conteúdo são obrigatórios');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('sst_regimento_documentos').insert({
        empresa_id: empresaAtual.id,
        titulo: novoTitulo.trim(),
        conteudo_html: novoConteudo,
        versao: proximaVersao,
        status: 'RASCUNHO',
      });
      if (error) throw error;
      toast.success('Rascunho criado');
      setShowNew(false);
      setNovoTitulo('');
      setNovoConteudo('');
      carregar();
    } catch (err) {
      console.error(err);
      toast.error('Falha ao criar documento');
    } finally {
      setSaving(false);
    }
  };

  const publicar = async (id: string) => {
    try {
      const { error } = await supabase.rpc('sst_regimento_publicar', { p_documento_id: id });
      if (error) throw error;
      toast.success('Documento publicado e vigente');
      carregar();
    } catch (err) {
      console.error(err);
      toast.error('Falha ao publicar');
    }
  };
  const notificarPendentes = async () => {
    if (!empresaAtual?.id || notificando) return;
    setNotificando(true);
    try {
      const { data, error } = await supabase.rpc('sst_regimento_notificar_pendentes', {
        p_empresa_id: empresaAtual.id,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : (data as any);
      const notif = row?.notificados ?? 0;
      const semUser = row?.sem_user ?? 0;
      if (notif === 0) {
        toast.info('Nenhum colaborador pendente para notificar agora (dedupe de 7 dias).');
      } else {
        toast.success(`${notif} colaborador(es) notificado(s)${semUser ? ` · ${semUser} sem usuário` : ''}`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(safeErrorMessage(err, 'Falha ao notificar pendentes.'));
    } finally {
      setNotificando(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" /> Regimento Interno de SST
          </h1>
          <p className="text-sm text-muted-foreground">
            Publique e colete assinaturas eletrônicas com cadeia de integridade SHA-256.
          </p>
        </div>
        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Novo Documento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Novo Rascunho — v{proximaVersao}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="Título (ex.: Regimento Interno de SST 2026)"
                value={novoTitulo}
                onChange={(e) => setNovoTitulo(e.target.value)}
              />
              <Textarea
                placeholder="Conteúdo (HTML permitido)"
                value={novoConteudo}
                onChange={(e) => setNovoConteudo(e.target.value)}
                rows={16}
              />
              <div className="flex justify-end">
                <Button onClick={criarDocumento} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  Salvar Rascunho
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Vigente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold truncate">{dash?.documento?.titulo ?? '—'}</div>
            {dash?.documento && <Badge variant="secondary">v{dash.documento.versao}</Badge>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> Colaboradores Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dash?.total_colaboradores ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" /> Assinaram
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dash?.assinados ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Adesão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-bold">{dash?.adesao_pct ?? 0}%</div>
            <Button
              size="sm"
              variant="outline"
              className="w-full gap-1"
              onClick={notificarPendentes}
              disabled={notificando || !dash?.documento}
            >
              {notificando ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bell className="h-3 w-3" />}
              Notificar pendentes
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <UserX className="h-4 w-4 text-destructive" /> Colaboradores Pendentes ({pendentes.length})
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            disabled={pendentes.length === 0}
            onClick={() => {
              const header = 'Nome;Email;Cargo;Departamento;Tem Usuário;Última Notificação\n';
              const rows = pendentes
                .map((p) =>
                  [
                    (p.nome ?? '').replace(/;/g, ','),
                    (p.email ?? '').replace(/;/g, ','),
                    (p.cargo ?? '').replace(/;/g, ','),
                    (p.departamento ?? '').replace(/;/g, ','),
                    p.tem_usuario ? 'Sim' : 'Não',
                    p.ultima_notificacao ? new Date(p.ultima_notificacao).toLocaleString('pt-BR') : '—',
                  ].join(';')
                )
                .join('\n');
              const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `regimento-pendentes-${todayLocalISO()}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="h-3 w-3" /> Exportar CSV
          </Button>
        </CardHeader>
        <CardContent>
          {!dash?.documento ? (
            <div className="text-sm text-muted-foreground">Publique um documento para acompanhar as pendências.</div>
          ) : pendentes.length === 0 ? (
            <div className="text-sm text-muted-foreground">🎉 Todos os colaboradores ativos já assinaram.</div>
          ) : (
            <div className="max-h-[420px] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Última Notificação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendentes.map((p) => (
                    <TableRow key={p.colaborador_id}>
                      <TableCell>
                        <div className="font-medium">{p.nome}</div>
                        <div className="text-xs text-muted-foreground">{p.email ?? '—'}</div>
                      </TableCell>
                      <TableCell className="text-sm">{p.cargo ?? '—'}</TableCell>
                      <TableCell className="text-sm">{p.departamento ?? '—'}</TableCell>
                      <TableCell>
                        {p.tem_usuario ? (
                          <Badge variant="secondary">Vinculado</Badge>
                        ) : (
                          <Badge variant="outline" className="text-destructive border-destructive">
                            Sem acesso
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.ultima_notificacao ? new Date(p.ultima_notificacao).toLocaleString('pt-BR') : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Versões</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : documentos.length === 0 ? (
            <div className="text-muted-foreground text-sm">Nenhum documento criado ainda.</div>
          ) : (
            <div className="space-y-2">
              {documentos.map((d) => (
                <div key={d.id} className="flex items-center justify-between border rounded-md p-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{d.titulo}</div>
                    <div className="text-xs text-muted-foreground">
                      v{d.versao} · {new Date(d.created_at).toLocaleDateString('pt-BR')}
                      {d.hash_sha256 && <> · hash {d.hash_sha256.slice(0, 12)}…</>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={
                        d.status === 'PUBLICADO' ? 'default' : d.status === 'ARQUIVADO' ? 'outline' : 'secondary'
                      }
                    >
                      {d.status}
                    </Badge>
                    {d.status === 'RASCUNHO' && (
                      <Button size="sm" onClick={() => publicar(d.id)} className="gap-1">
                        <Send className="h-3 w-3" /> Publicar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminRegimentoInternoPage;
