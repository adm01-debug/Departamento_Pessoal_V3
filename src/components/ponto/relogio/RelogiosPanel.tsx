import { useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Clock, Copy, KeyRound, Loader2, Plus, ShieldOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import {
  useColetoresPonto,
  useGerarTokenColetor,
  useLotesColetores,
  useRevogarColetor,
} from '@/hooks/useColetoresPonto';
import type { ColetorPonto, LoteColetor } from '@/services/relogio/coletoresService';
import { statusColetor, type StatusColetor } from './statusColetor';
import { VinculosRelogioTab } from './VinculosRelogioTab';
import { JustificativasRelogioTab } from './JustificativasRelogioTab';

/** Contexto que toda aba do painel recebe. */
export interface AbaRelogioProps {
  empresaId: string;
  isAdmin: boolean;
}

export interface AbaRelogio {
  id: string;
  label: string;
  render: (props: AbaRelogioProps) => ReactNode;
}

const MAX_CAMPO = 60;

const STATUS_VISUAL: Record<StatusColetor, { label: string; className: string }> = {
  online: { label: 'Online', className: 'bg-success/10 text-success border-success/30' },
  atrasado: { label: 'Atrasado', className: 'bg-warning/10 text-warning border-warning/30' },
  nunca: { label: 'Nunca conectou', className: 'bg-muted text-muted-foreground' },
  revogado: { label: 'Revogado', className: 'bg-destructive/10 text-destructive border-destructive/30' },
};

function dataHora(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
}

/** `YYYY-MM-DD` → `DD/MM/YYYY` sem passar por Date (evita deslocar o dia pelo fuso). */
function dataCurta(d: string | null): string {
  if (!d) return '—';
  const [a, m, dia] = d.split('-');
  return `${dia}/${m}/${a}`;
}

function mensagemErro(e: unknown): string {
  return e instanceof Error ? e.message : (e as { message?: string } | null)?.message || 'Erro inesperado';
}

function EstadoCarregando() {
  return (
    <div className="space-y-2" data-testid="relogio-carregando">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
    </div>
  );
}

function EstadoErro({ erro, onTentar }: { erro: unknown; onTentar: () => void }) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm" role="alert">
      <p className="text-destructive">Não foi possível carregar: {mensagemErro(erro)}</p>
      <Button variant="outline" size="sm" className="mt-2" onClick={onTentar}>
        Tentar de novo
      </Button>
    </div>
  );
}

function TokenGeradoDialog({ token, onClose }: { token: string | null; onClose: () => void }) {
  const copiar = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      toast.success('Token copiado');
    } catch {
      toast.error('Não foi possível copiar. Selecione o texto e copie manualmente.');
    }
  };
  return (
    <Dialog open={!!token} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Token do coletor</DialogTitle>
          <DialogDescription>
            Copie agora e cole na configuração do coletor. Este token não será mostrado de novo.
          </DialogDescription>
        </DialogHeader>
        <code
          className="block break-all rounded-lg bg-muted p-3 font-mono text-xs select-all"
          data-testid="relogio-token"
        >
          {token}
        </code>
        <DialogFooter>
          <Button variant="outline" onClick={copiar} className="gap-2">
            <Copy className="h-4 w-4" /> Copiar
          </Button>
          <Button onClick={onClose}>Já copiei</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NovoColetorDialog({
  open,
  onOpenChange,
  empresaId,
  onToken,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  empresaId: string;
  onToken: (token: string) => void;
}) {
  const [unidade, setUnidade] = useState('');
  const [nome, setNome] = useState('');
  const gerar = useGerarTokenColetor(empresaId);
  const valido = unidade.trim() !== '' && nome.trim() !== '';

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (!valido) return;
    gerar.mutate(
      { unidade, nome },
      {
        onSuccess: ({ token }) => {
          setUnidade('');
          setNome('');
          onOpenChange(false);
          onToken(token);
        },
        onError: (err) => toast.error(`Falha ao gerar token: ${mensagemErro(err)}`),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={enviar} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Novo coletor</DialogTitle>
            <DialogDescription>
              Um coletor por unidade. Se a unidade já tiver coletor, o token dele é trocado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="coletor-unidade">Unidade</Label>
            <Input
              id="coletor-unidade"
              value={unidade}
              maxLength={MAX_CAMPO}
              onChange={(e) => setUnidade(e.target.value)}
              placeholder="Ex.: Matriz"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="coletor-nome">Nome</Label>
            <Input
              id="coletor-nome"
              value={nome}
              maxLength={MAX_CAMPO}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: PC da recepção"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!valido || gerar.isPending} className="gap-2">
              {gerar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Gerar token
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type Confirmacao = { tipo: 'rotacionar' | 'revogar'; coletor: ColetorPonto } | null;

function AbaColetores({ empresaId, isAdmin }: AbaRelogioProps) {
  const { data, isLoading, isError, error, refetch } = useColetoresPonto(empresaId);
  const gerar = useGerarTokenColetor(empresaId);
  const revogar = useRevogarColetor(empresaId);
  const [novoAberto, setNovoAberto] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [confirmacao, setConfirmacao] = useState<Confirmacao>(null);

  const confirmar = () => {
    if (!confirmacao) return;
    const { tipo, coletor } = confirmacao;
    setConfirmacao(null);
    if (tipo === 'rotacionar') {
      gerar.mutate(
        { unidade: coletor.unidade, nome: coletor.nome },
        {
          onSuccess: ({ token: t }) => setToken(t),
          onError: (err) => toast.error(`Falha ao gerar novo token: ${mensagemErro(err)}`),
        }
      );
    } else {
      revogar.mutate(coletor.id, {
        onSuccess: () => toast.success(`Coletor ${coletor.unidade} revogado`),
        onError: (err) => toast.error(`Falha ao revogar: ${mensagemErro(err)}`),
      });
    }
  };

  let corpo: ReactNode;
  if (isLoading) corpo = <EstadoCarregando />;
  else if (isError) corpo = <EstadoErro erro={error} onTentar={() => void refetch()} />;
  else if (!data?.length)
    corpo = (
      <p className="py-6 text-center text-sm text-muted-foreground" data-testid="relogio-coletores-vazio">
        Nenhum coletor cadastrado.{isAdmin ? ' Use "Novo coletor" para gerar o token da primeira unidade.' : ''}
      </p>
    );
  else
    corpo = (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Unidade</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Último contato</TableHead>
            <TableHead>Versão</TableHead>
            <TableHead>Token</TableHead>
            {isAdmin && <TableHead className="text-right">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((c) => {
            const st = STATUS_VISUAL[statusColetor(c)];
            const revogado = statusColetor(c) === 'revogado';
            return (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.unidade}</TableCell>
                <TableCell>{c.nome}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn('text-[11px]', st.className)}>
                    {st.label}
                  </Badge>
                </TableCell>
                <TableCell>{dataHora(c.ultimo_contato_em)}</TableCell>
                <TableCell>{c.versao_coletor || '—'}</TableCell>
                <TableCell className="font-mono text-xs">{c.token_prefixo}…</TableCell>
                {isAdmin && (
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1"
                      disabled={gerar.isPending}
                      onClick={() => setConfirmacao({ tipo: 'rotacionar', coletor: c })}
                    >
                      <KeyRound className="h-3.5 w-3.5" /> Gerar novo token
                    </Button>
                    {!revogado && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-destructive"
                        disabled={revogar.isPending}
                        onClick={() => setConfirmacao({ tipo: 'revogar', coletor: c })}
                      >
                        <ShieldOff className="h-3.5 w-3.5" /> Revogar
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );

  return (
    <div className="space-y-3">
      {isAdmin && (
        <div className="flex justify-end">
          <Button size="sm" className="gap-2" onClick={() => setNovoAberto(true)}>
            <Plus className="h-4 w-4" /> Novo coletor
          </Button>
        </div>
      )}
      {corpo}
      {isAdmin && (
        <NovoColetorDialog open={novoAberto} onOpenChange={setNovoAberto} empresaId={empresaId} onToken={setToken} />
      )}
      <TokenGeradoDialog token={token} onClose={() => setToken(null)} />
      <AlertDialog open={!!confirmacao} onOpenChange={(o) => !o && setConfirmacao(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmacao?.tipo === 'revogar' ? 'Revogar coletor' : 'Gerar novo token'} —{' '}
              {confirmacao?.coletor.unidade}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmacao?.tipo === 'revogar'
                ? 'O coletor desta unidade para de enviar marcações imediatamente. Para voltar, gere um novo token e reconfigure o coletor.'
                : 'O token atual deixa de valer agora: o coletor desta unidade para de enviar até ser reconfigurado com o novo token.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmar}>
              {confirmacao?.tipo === 'revogar' ? 'Revogar' : 'Gerar novo token'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const STATUS_LOTE: Record<string, { label: string; className: string }> = {
  recebido: { label: 'Recebido', className: 'bg-muted text-muted-foreground' },
  processado: { label: 'Processado', className: 'bg-success/10 text-success border-success/30' },
  parcial: { label: 'Parcial', className: 'bg-warning/10 text-warning border-warning/30' },
  erro: { label: 'Erro', className: 'bg-destructive/10 text-destructive border-destructive/30' },
};

function AbaEnvios({ empresaId }: AbaRelogioProps) {
  const { data, isLoading, isError, error, refetch } = useLotesColetores(empresaId);
  if (isLoading) return <EstadoCarregando />;
  if (isError) return <EstadoErro erro={error} onTentar={() => void refetch()} />;
  if (!data?.length)
    return (
      <p className="py-6 text-center text-sm text-muted-foreground" data-testid="relogio-envios-vazio">
        Nenhum envio recebido ainda.
      </p>
    );
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Recebido em</TableHead>
          <TableHead>Unidade</TableHead>
          <TableHead>Período</TableHead>
          <TableHead className="text-right">Funcionários</TableHead>
          <TableHead className="text-right">Dias recebidos</TableHead>
          <TableHead className="text-right">Dias alterados</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Erro</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((l: LoteColetor) => {
          const st = STATUS_LOTE[l.status] ?? { label: l.status, className: 'bg-muted text-muted-foreground' };
          return (
            <TableRow key={l.id}>
              <TableCell>{dataHora(l.recebido_em)}</TableCell>
              <TableCell>{l.dispositivo?.unidade ?? '—'}</TableCell>
              <TableCell>
                {dataCurta(l.periodo_inicio)} a {dataCurta(l.periodo_fim)}
              </TableCell>
              <TableCell className="text-right">{l.total_funcionarios}</TableCell>
              <TableCell className="text-right">{l.total_dias}</TableCell>
              <TableCell className="text-right">{l.dias_alterados}</TableCell>
              <TableCell>
                <Badge variant="outline" className={cn('text-[11px]', st.className)}>
                  {st.label}
                </Badge>
              </TableCell>
              <TableCell className="max-w-[280px] truncate text-xs text-destructive" title={l.mensagem_erro ?? ''}>
                {l.mensagem_erro ?? ''}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

/** Abas do painel. Para acrescentar uma aba, inclua um item aqui. */
const ABAS_RELOGIO: AbaRelogio[] = [
  { id: 'coletores', label: 'Coletores', render: (p) => <AbaColetores {...p} /> },
  { id: 'envios', label: 'Envios', render: (p) => <AbaEnvios {...p} /> },
  { id: 'vinculos', label: 'Vínculos', render: ({ empresaId }) => <VinculosRelogioTab empresaId={empresaId} /> },
  {
    id: 'justificativas',
    label: 'Justificativas',
    render: ({ empresaId }) => <JustificativasRelogioTab empresaId={empresaId} />,
  },
];

export function RelogiosPanel({
  empresaId,
  abas = ABAS_RELOGIO,
}: {
  empresaId: string | null | undefined;
  abas?: AbaRelogio[];
}) {
  const { isAdmin } = useAuth();
  return (
    <Card className="border border-border/30 rounded-2xl" data-testid="relogios-panel">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" /> Relógios de ponto
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!empresaId ? (
          <p className="text-sm text-muted-foreground">Selecione uma empresa para ver os coletores.</p>
        ) : (
          <Tabs defaultValue={abas[0]?.id}>
            <TabsList>
              {abas.map((a) => (
                <TabsTrigger key={a.id} value={a.id}>
                  {a.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {abas.map((a) => (
              <TabsContent key={a.id} value={a.id} className="pt-3">
                {a.render({ empresaId, isAdmin: !!isAdmin })}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
