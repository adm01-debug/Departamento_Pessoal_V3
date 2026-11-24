import { useEffect, useRef, useState } from 'react';
import { Award, CalendarDays, Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TreinamentosCascadeDialog, TreinamentosCascadeItem } from './TreinamentosCascadeDialog';
import { cn } from '@/lib/utils';
import { CertificadoStatusBadge } from './CertificadoStatusBadge';
import { estiloCategoriaTreinamento } from './TreinamentoBadges';
import { corAvatarColaborador, iniciaisColaborador } from './TreinamentoParticipantes';
import { formatarDataTreinamento } from './treinamentosDerivacoes';
import type { Certificado } from './certificadosDerivacoes';

/**
 * PRÉVIA DO CERTIFICADO — somente leitura.
 *
 * O módulo NÃO possui PDF, download, rota pública de verificação ou arquivo
 * oficial acessível; a ação antiga “Ver” era apenas um toast. Esta prévia
 * apresenta os campos reais do registro de forma claramente informativa, sem
 * simular um documento emitido e sem criar links.
 */
export interface CertificadoDetalheDialogProps {
  certificado: Certificado | null;
  onOpenChange: (aberto: boolean) => void;
}

export function CertificadoDetalheDialog({ certificado, onOpenChange }: CertificadoDetalheDialogProps) {
  const [copiado, setCopiado] = useState(false);
  const timer = useRef<number | null>(null);
  const [ultimoCertificado, setUltimoCertificado] = useState<Certificado | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- guarda o último registro para o shell concluir a saída
    if (certificado) setUltimoCertificado(certificado);
  }, [certificado]);
  const exibido = certificado ?? ultimoCertificado;

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    []
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- novo certificado reinicia o feedback de cópia
    setCopiado(false);
  }, [exibido?.id]);

  if (!exibido) return null;

  const estilo = estiloCategoriaTreinamento(exibido.categoria);
  const Icone = estilo.icone;

  const copiar = async () => {
    if (!exibido.codigo) return;
    try {
      await navigator.clipboard.writeText(exibido.codigo);
      setCopiado(true);
      toast.success('Código copiado');
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopiado(false), 1800);
    } catch {
      toast.error('Não foi possível copiar o código');
    }
  };

  return (
    <TreinamentosCascadeDialog open={!!certificado} onOpenChange={onOpenChange} blocks={6} className="max-w-[560px]">
      <TreinamentosCascadeItem>
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-1.5">
            <CertificadoStatusBadge situacao={exibido.situacao} />
            <span className="text-[10px] text-muted-foreground">Prévia informativa</span>
          </div>
          <DialogTitle className="mt-1 pr-6 text-left text-base leading-snug">Prévia do certificado</DialogTitle>
          <DialogDescription className="text-left text-xs leading-relaxed">{exibido.cursoNome}</DialogDescription>
        </DialogHeader>
      </TreinamentosCascadeItem>

      <TreinamentosCascadeItem>
        <div className={cn('relative overflow-hidden rounded-xl border border-border/60 p-4 text-center', estilo.capa)}>
          <span className="pointer-events-none absolute inset-2 rounded-lg border border-white/10" />
          <span className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full border border-white/10" />
          <span className="pointer-events-none absolute -bottom-12 -left-8 h-28 w-28 rounded-full border border-white/[0.08]" />
          <Icone className={cn('mx-auto mb-2 h-6 w-6 opacity-90', estilo.capaTexto)} aria-hidden />
          <p className={cn('text-[8.5px] font-semibold uppercase tracking-[0.2em]', estilo.capaTexto)}>Certificado</p>
          <p className="mt-2 line-clamp-2 text-[15px] font-semibold leading-snug text-foreground">
            {exibido.cursoNome}
          </p>
          <p className="mt-3 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Conferido a</p>
          <p className="mt-0.5 truncate text-[12.5px] font-medium text-foreground">{exibido.colaboradorNome}</p>
          <div className="mt-3 flex items-center justify-center gap-2 text-[9.5px] text-muted-foreground">
            {exibido.cargaHoraria && <span>{exibido.cargaHoraria}</span>}
            {exibido.cargaHoraria && <span aria-hidden>·</span>}
            <span>{formatarDataTreinamento(exibido.dataEmissao)}</span>
          </div>
          <span className="mt-3 inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/20 px-2 py-0.5 font-mono text-[9.5px] text-white/85">
            <Award className="h-3 w-3" aria-hidden />
            {exibido.codigo ?? 'SEM CÓDIGO'}
          </span>
        </div>
      </TreinamentosCascadeItem>

      <TreinamentosCascadeItem>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border/40 bg-background/40 px-2.5 py-2">
            <p className="flex items-center gap-1 text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
              <CalendarDays className="h-3 w-3" aria-hidden /> Emissão
            </p>
            <p className="mt-1 text-[12px] font-medium tabular-nums text-foreground">
              {formatarDataTreinamento(exibido.dataEmissao)}
            </p>
          </div>
          <div className="rounded-lg border border-border/40 bg-background/40 px-2.5 py-2">
            <p className="flex items-center gap-1 text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
              <CalendarDays className="h-3 w-3" aria-hidden /> Validade
            </p>
            <p className="mt-1 text-[12px] font-medium tabular-nums text-foreground">{exibido.validadeTexto}</p>
            {exibido.detalheValidade ? (
              <p
                className={cn(
                  'mt-0.5 text-[10px]',
                  exibido.situacao === 'vencido'
                    ? 'text-[hsl(var(--destructive-vivid))]'
                    : exibido.situacao === 'a_vencer'
                      ? 'text-warning'
                      : 'text-muted-foreground'
                )}
              >
                {exibido.detalheValidade}
              </p>
            ) : null}
          </div>
        </div>
      </TreinamentosCascadeItem>

      <TreinamentosCascadeItem>
        <div className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-muted/20 p-3">
          <Avatar className="h-9 w-9 border border-border/50">
            {exibido.colaboradorFoto && <AvatarImage src={exibido.colaboradorFoto} alt={exibido.colaboradorNome} />}
            <AvatarFallback
              className={cn(
                'text-[10px] font-semibold',
                corAvatarColaborador(exibido.colaboradorId ?? exibido.colaboradorNome)
              )}
            >
              {iniciaisColaborador(exibido.colaboradorNome)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] uppercase tracking-[0.08em] text-muted-foreground">Colaborador</p>
            <p className="truncate text-[12.5px] font-medium text-foreground">{exibido.colaboradorNome}</p>
            {exibido.colaboradorCargo ? (
              <p className="truncate text-[10.5px] text-muted-foreground">{exibido.colaboradorCargo}</p>
            ) : null}
          </div>
          {exibido.categoria ? (
            <span className={cn('max-w-[40%] truncate rounded-full border px-2 py-0.5 text-[9.5px]', estilo.badge)}>
              {exibido.categoria}
            </span>
          ) : null}
        </div>
      </TreinamentosCascadeItem>

      <TreinamentosCascadeItem>
        <p className="rounded-lg border border-dashed border-border/50 bg-muted/10 px-3 py-2 text-[10.5px] leading-relaxed text-muted-foreground">
          Esta é uma representação informativa com os dados registrados. O arquivo oficial do certificado não está
          disponível neste ambiente.
        </p>
      </TreinamentosCascadeItem>

      <TreinamentosCascadeItem>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {exibido.codigo && (
            <Button
              type="button"
              variant="outline"
              onClick={() => void copiar()}
              className="h-9 gap-2 rounded-lg px-3 text-[11.5px] font-medium"
            >
              {copiado ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              {copiado ? 'Código copiado' : 'Copiar código'}
            </Button>
          )}
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-9 rounded-lg px-4 text-[11.5px] font-semibold"
          >
            Fechar
          </Button>
        </div>
      </TreinamentosCascadeItem>
    </TreinamentosCascadeDialog>
  );
}
