import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileUp, Loader2, CheckCircle2, AlertTriangle, GitCompare } from 'lucide-react';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks/useEmpresas';

type Tipo = 'AFDT' | 'ACJEF' | 'AEJ';

interface Resultado {
  importacao_id?: string;
  total_linhas: number;
  total_registros: number;
  total_erros: number;
  cnpj_empregador?: string | null;
  periodo?: { inicio: string | null; fim: string | null };
  reused?: boolean;
}

export function ImportarAFDTDialog() {
  const { empresaAtual } = useEmpresas();
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<Tipo>('AFDT');
  const [loading, setLoading] = useState(false);
  const [reconciliando, setReconciliando] = useState(false);
  const [reconc, setReconc] = useState<{
    total: number;
    ok: number;
    sem_colaborador: number;
    sem_batida: number;
  } | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleReconciliar = async () => {
    if (!resultado?.importacao_id) return;
    setReconciliando(true);
    try {
      const { data, error } = await (supabase as any).rpc('reconciliar_afdt', {
        _importacao_id: resultado.importacao_id,
        _janela_seg: 300,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? (data[0] as any) : (data as any);
      setReconc({
        total: row?.total ?? 0,
        ok: row?.ok ?? 0,
        sem_colaborador: row?.sem_colaborador ?? 0,
        sem_batida: row?.sem_batida ?? 0,
      });
      toast.success(
        `Reconciliação concluída: ${row?.ok ?? 0} OK, ${(row?.sem_colaborador ?? 0) + (row?.sem_batida ?? 0)} divergências.`
      );
      // Dispara notificações agregadas aos membros da empresa (idempotente).
      const divergenciasTotais = (row?.sem_colaborador ?? 0) + (row?.sem_batida ?? 0);
      if (divergenciasTotais > 0) {
        const { data: notif, error: notifErr } = await (supabase as any).rpc(
          'notificar_divergencias_afdt',
          { _importacao_id: resultado.importacao_id },
        );
        if (!notifErr && notif) {
          const n = Array.isArray(notif) ? (notif[0] as any) : (notif as any);
          if ((n?.notificacoes_criadas ?? 0) > 0) {
            toast.info(`${n.notificacoes_criadas} notificação(ões) enviada(s) à equipe.`);
          }
        }
      }
    } catch (e: any) {
      toast.error(safeErrorMessage(e, 'Falha na reconciliação.'));
    } finally {
      setReconciliando(false);
    }
  };

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return toast.error('Selecione um arquivo .txt');
    if (!empresaAtual?.id) return toast.error('Empresa não selecionada');
    if (file.size > 10 * 1024 * 1024) return toast.error('Arquivo excede 10MB');

    setLoading(true);
    setResultado(null);
    try {
      const conteudo = await file.text();
      const { data, error } = await supabase.functions.invoke('parse-afdt', {
        body: {
          conteudo,
          nome_arquivo: file.name,
          tipo,
          empresa_id: empresaAtual.id,
        },
      });
      if (error) throw error;
      const res = (data as any).importacao ?? data;
      setResultado({
        importacao_id: res.importacao_id ?? res.id,
        total_linhas: res.total_linhas ?? 0,
        total_registros: res.total_registros ?? 0,
        total_erros: res.total_erros ?? 0,
        cnpj_empregador: res.cnpj_empregador,
        periodo: res.periodo,
        reused: (data as any).reused,
      });
      toast.success(
        (data as any).reused
          ? 'Arquivo já importado — resultado reutilizado.'
          : `Importação concluída: ${res.total_registros} registros.`
      );
    } catch (e: any) {
      toast.error(safeErrorMessage(e, 'Falha na importação do arquivo.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setResultado(null);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileUp className="h-4 w-4" />
          Importar AFDT/ACJEF
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar arquivo legal de ponto</DialogTitle>
          <DialogDescription>
            Portaria MTP 671/2021 (ex-1510/2009). Arquivos AFDT, ACJEF ou AEJ até 10MB.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground">Tipo de arquivo</label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as Tipo)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AFDT">AFDT — Detalhado de Marcações</SelectItem>
                <SelectItem value="ACJEF">ACJEF — Controle de Jornada e Eventos</SelectItem>
                <SelectItem value="AEJ">AEJ — Arquivo Eletrônico de Jornada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground">Arquivo (.txt)</label>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,text/plain"
              className="block w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
          </div>

          {resultado && (
            <div className="rounded-lg border border-border/40 p-4 space-y-2 bg-muted/20">
              <div className="flex items-center gap-2">
                {resultado.total_erros === 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-warning" />
                )}
                <span className="text-sm font-medium">
                  {resultado.reused ? 'Já importado' : 'Resultado da importação'}
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <dt className="text-muted-foreground">Linhas</dt>
                <dd className="tabular-nums">{resultado.total_linhas}</dd>
                <dt className="text-muted-foreground">Registros</dt>
                <dd className="tabular-nums">{resultado.total_registros}</dd>
                <dt className="text-muted-foreground">Erros</dt>
                <dd className={resultado.total_erros ? 'text-warning tabular-nums' : 'tabular-nums'}>
                  {resultado.total_erros}
                </dd>
                {resultado.cnpj_empregador && (
                  <>
                    <dt className="text-muted-foreground">CNPJ</dt>
                    <dd className="tabular-nums">{resultado.cnpj_empregador}</dd>
                  </>
                )}
                {resultado.periodo?.inicio && (
                  <>
                    <dt className="text-muted-foreground">Período</dt>
                    <dd className="tabular-nums">
                      {resultado.periodo.inicio} → {resultado.periodo.fim}
                    </dd>
                  </>
                )}
              </dl>

              {reconc && (
                <div className="mt-3 pt-3 border-t border-border/40 grid grid-cols-4 gap-2 text-center text-xs">
                  <div>
                    <p className="text-muted-foreground">Total</p>
                    <p className="font-bold tabular-nums">{reconc.total}</p>
                  </div>
                  <div>
                    <p className="text-success">OK</p>
                    <p className="font-bold tabular-nums text-success">{reconc.ok}</p>
                  </div>
                  <div>
                    <p className="text-warning">S/ colab.</p>
                    <p className="font-bold tabular-nums text-warning">{reconc.sem_colaborador}</p>
                  </div>
                  <div>
                    <p className="text-destructive">S/ batida</p>
                    <p className="font-bold tabular-nums text-destructive">{reconc.sem_batida}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading || reconciliando}>
            Fechar
          </Button>
          {resultado?.importacao_id && (
            <Button variant="secondary" onClick={handleReconciliar} disabled={reconciliando} className="gap-2">
              {reconciliando ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitCompare className="h-4 w-4" />}
              Reconciliar com batidas
            </Button>
          )}
          <Button onClick={handleUpload} disabled={loading} className="gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Importar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
