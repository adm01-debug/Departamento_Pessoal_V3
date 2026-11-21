import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FileSignature, Paperclip, ExternalLink, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { safeErrorMessage } from '@/utils/safeError';
import {
  anexarDigitalizacao,
  competenciaDoMes,
  listarColaboradoresAtivos,
  listarEspelhosPapel,
  salvarEspelhoPapel,
  urlDigitalizacao,
  type ColaboradorEspelho,
  type EspelhoPapel,
} from '@/services/relogio/espelhosPapelService';

function mesAtual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function ddmm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Controle do espelho de ponto devolvido assinado em papel, por competência.
 * A assinatura continua no papel; aqui o DP marca quem já devolveu. */
export function EspelhosPapelPanel({ empresaId }: { empresaId: string }) {
  const [mes, setMes] = useState(mesAtual);
  const [rascunhos, setRascunhos] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const competencia = useMemo(() => {
    try {
      return competenciaDoMes(mes);
    } catch {
      return null;
    }
  }, [mes]);

  const queryKey = ['ponto-espelhos-papel', empresaId, competencia];
  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    enabled: !!competencia,
    queryFn: async () => {
      const [colaboradores, registros] = await Promise.all([
        listarColaboradoresAtivos(empresaId),
        listarEspelhosPapel(empresaId, competencia as string),
      ]);
      const espelhos: Record<string, EspelhoPapel> = {};
      for (const r of registros) espelhos[r.colaborador_id] = r;
      return { colaboradores, espelhos };
    },
  });
  const loading = isLoading;
  const erro = error ? safeErrorMessage(error, 'Não foi possível carregar os espelhos.') : null;
  const colaboradores: ColaboradorEspelho[] = data?.colaboradores ?? [];
  const espelhos: Record<string, EspelhoPapel> = data?.espelhos ?? {};

  const pendentes = colaboradores.filter((c) => !espelhos[c.id]?.devolvido_em).length;

  const aplicar = (r: EspelhoPapel) =>
    queryClient.setQueryData<typeof data>(queryKey, (prev) =>
      prev ? { ...prev, espelhos: { ...prev.espelhos, [r.colaborador_id]: r } } : prev
    );

  const alternarDevolvido = async (colaboradorId: string) => {
    if (!competencia) return;
    const devolvido = !!espelhos[colaboradorId]?.devolvido_em;
    setSalvando(colaboradorId);
    try {
      aplicar(
        await salvarEspelhoPapel(empresaId, colaboradorId, competencia, {
          devolvido_em: devolvido ? null : new Date().toISOString(),
        })
      );
      toast.success(devolvido ? 'Marcado como pendente.' : 'Espelho marcado como devolvido.');
    } catch (e) {
      toast.error(safeErrorMessage(e, 'Não foi possível salvar.'));
    } finally {
      setSalvando(null);
    }
  };

  const salvarObservacao = async (colaboradorId: string) => {
    if (!competencia) return;
    const rascunho = rascunhos[colaboradorId];
    if (rascunho === undefined) return;
    const texto = rascunho.trim();
    const descartar = () =>
      setRascunhos((prev) => {
        const { [colaboradorId]: _descartado, ...resto } = prev;
        return resto;
      });
    if (texto === (espelhos[colaboradorId]?.observacao ?? '')) {
      descartar();
      return;
    }
    setSalvando(colaboradorId);
    try {
      aplicar(await salvarEspelhoPapel(empresaId, colaboradorId, competencia, { observacao: texto || null }));
      descartar();
      toast.success('Observação salva.');
    } catch (e) {
      toast.error(safeErrorMessage(e, 'Não foi possível salvar a observação.'));
    } finally {
      setSalvando(null);
    }
  };

  const anexar = async (colaboradorId: string, file: File | undefined) => {
    if (!competencia || !file) return;
    setSalvando(colaboradorId);
    try {
      aplicar(await anexarDigitalizacao(empresaId, colaboradorId, competencia, file));
      toast.success('Digitalização anexada.');
    } catch (e) {
      toast.error(safeErrorMessage(e, 'Não foi possível anexar o arquivo.'));
    } finally {
      setSalvando(null);
    }
  };

  const abrir = async (arquivoPath: string) => {
    try {
      window.open(await urlDigitalizacao(arquivoPath), '_blank', 'noopener');
    } catch (e) {
      toast.error(safeErrorMessage(e, 'Não foi possível abrir o arquivo.'));
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSignature className="h-4 w-4" /> Espelhos assinados em papel
        </CardTitle>
        <div className="flex items-center gap-2">
          <label htmlFor="espelho-papel-mes" className="text-sm text-muted-foreground">
            Competência
          </label>
          <Input
            id="espelho-papel-mes"
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="w-40"
          />
          {!loading && !erro && (
            <Badge variant={pendentes > 0 ? 'destructive' : 'secondary'} data-testid="espelho-papel-pendentes">
              {pendentes} pendente{pendentes === 1 ? '' : 's'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!competencia ? (
          <p className="text-sm text-muted-foreground">Escolha uma competência.</p>
        ) : loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground" role="status">
            <Spinner size="sm" /> Carregando espelhos...
          </div>
        ) : erro ? (
          <div className="flex items-center gap-3 py-6 text-sm text-destructive" role="alert">
            {erro}
            <Button size="sm" variant="outline" onClick={() => void refetch()}>
              <RefreshCw className="mr-1 h-3.5 w-3.5" /> Tentar de novo
            </Button>
          </div>
        ) : colaboradores.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">Nenhum colaborador ativo nesta empresa.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Observação</TableHead>
                <TableHead>Digitalização</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {colaboradores.map((c) => {
                const reg = espelhos[c.id];
                const devolvido = !!reg?.devolvido_em;
                const ocupado = salvando === c.id;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nome_completo}</TableCell>
                    <TableCell>
                      {devolvido ? (
                        <Badge variant="secondary">Devolvido em {ddmm(reg.devolvido_em as string)}</Badge>
                      ) : (
                        <Badge variant="outline">Pendente</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        aria-label={`Observação de ${c.nome_completo}`}
                        value={rascunhos[c.id] ?? reg?.observacao ?? ''}
                        onChange={(e) => setRascunhos((prev) => ({ ...prev, [c.id]: e.target.value }))}
                        onBlur={() => void salvarObservacao(c.id)}
                        disabled={ocupado}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {reg?.arquivo_path && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void abrir(reg.arquivo_path as string)}
                            aria-label={`Ver digitalização de ${c.nome_completo}`}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <label className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground">
                          <Paperclip className="h-3.5 w-3.5" />
                          {reg?.arquivo_path ? 'Trocar' : 'Anexar'}
                          <input
                            type="file"
                            accept="application/pdf,image/*"
                            className="sr-only"
                            aria-label={`Anexar digitalização de ${c.nome_completo}`}
                            disabled={ocupado}
                            onChange={(e) => {
                              void anexar(c.id, e.target.files?.[0]);
                              e.target.value = '';
                            }}
                          />
                        </label>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={devolvido ? 'outline' : 'default'}
                        disabled={ocupado}
                        onClick={() => void alternarDevolvido(c.id)}
                      >
                        {ocupado && <Spinner size="sm" className="mr-1" />}
                        {devolvido ? 'Desmarcar' : 'Marcar devolvido'}
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
  );
}
