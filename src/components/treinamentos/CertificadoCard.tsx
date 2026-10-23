import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CertificadoStatusBadge } from './CertificadoStatusBadge';
import { TrainingCover } from './TrainingCover';
import { corAvatarColaborador, iniciaisColaborador } from './TreinamentoParticipantes';
import { formatarDataTreinamento } from './treinamentosDerivacoes';
import type { Certificado } from './certificadosDerivacoes';

/**
 * CARD DE CERTIFICADO.
 *
 * Miniatura decorativa (ou imagem real quando `arquivo_url`/curso fornecem uma
 * imagem), situação, curso, categoria/carga, colaborador, emissão, validade e
 * código — todos campos reais. O código nunca é reformatado.
 *
 * AÇÕES REAIS: visualizar (prévia informativa com os dados reais) e copiar o
 * código. Não existe PDF/download/verificação/revogação no módulo; nenhum link
 * ou documento fictício é criado.
 */
export interface CertificadoCardProps {
  certificado: Certificado;
  onVisualizar: (certificado: Certificado) => void;
}

const TOM_DETALHE: Record<'a_vencer' | 'vencido', string> = {
  a_vencer: 'text-warning',
  vencido: 'text-[hsl(var(--destructive-vivid))]',
};

/**
 * Miniatura DECORATIVA do certificado — nunca um documento com aparência de
 * emissão oficial. Delegada ao `TrainingCover` (formato `miniatura`), que usa a
 * família cromática da categoria e troca por imagem real quando existir.
 */
function MiniaturaCertificado({ certificado }: { certificado: Certificado }) {
  return (
    <div className="relative h-[112px] w-[92px] shrink-0 overflow-hidden rounded-lg border border-border/50">
      <TrainingCover
        tipo="certificate"
        nome={certificado.cursoNome}
        categoria={certificado.categoria}
        imagemUrl={certificado.imagemUrl}
        formato="miniatura"
        rotulo="Certificado"
        subrotulo="Prévia"
      />
      <div className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-t from-black/20 via-transparent to-transparent" />
    </div>
  );
}

export function CertificadoCard({ certificado, onVisualizar }: CertificadoCardProps) {
  const [copiado, setCopiado] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    []
  );

  const copiarCodigo = async () => {
    if (!certificado.codigo) return;
    try {
      await navigator.clipboard.writeText(certificado.codigo);
      setCopiado(true);
      toast.success('Código copiado');
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopiado(false), 1800);
    } catch {
      toast.error('Não foi possível copiar o código');
    }
  };

  const detalheValidade =
    certificado.detalheValidade && (certificado.situacao === 'a_vencer' || certificado.situacao === 'vencido')
      ? TOM_DETALHE[certificado.situacao]
      : null;

  return (
    <article
      data-certificado-card={certificado.id}
      aria-labelledby={`certificado-${certificado.id}`}
      className="group flex h-full min-w-0 flex-col rounded-xl border border-border/50 bg-card/50 p-3 transition-colors duration-200 hover:border-primary/35 hover:bg-card/80 focus-within:border-primary/40"
    >
      <div className="flex min-w-0 gap-3">
        <MiniaturaCertificado certificado={certificado} />

        <div className="@container flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <CertificadoStatusBadge situacao={certificado.situacao} />
            <span className="whitespace-nowrap text-[9px] leading-none text-muted-foreground">
              Emitido em {formatarDataTreinamento(certificado.dataEmissao)}
            </span>
          </div>

          <h3
            id={`certificado-${certificado.id}`}
            title={certificado.cursoNome}
            className="mt-1.5 line-clamp-2 text-[13px] font-semibold leading-snug text-foreground @max-[200px]:min-h-[36px]"
          >
            {certificado.cursoNome}
          </h3>

          <p className="mt-1 truncate text-[10px] leading-tight text-muted-foreground">
            {certificado.categoria?.trim() || 'Sem categoria'}
            {certificado.cargaHoraria ? (
              <>
                <span aria-hidden> · </span>
                {certificado.cargaHoraria}
              </>
            ) : null}
          </p>

          <div className="mt-auto flex min-w-0 items-center gap-2 pt-2">
            <Avatar className="h-[30px] w-[30px] shrink-0 border border-border/50">
              {certificado.colaboradorFoto && (
                <AvatarImage src={certificado.colaboradorFoto} alt={certificado.colaboradorNome} />
              )}
              <AvatarFallback
                className={cn(
                  'text-[10px] font-semibold',
                  corAvatarColaborador(certificado.colaboradorId ?? certificado.colaboradorNome)
                )}
              >
                {iniciaisColaborador(certificado.colaboradorNome)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[11.5px] font-medium text-foreground" title={certificado.colaboradorNome}>
                {certificado.colaboradorNome}
              </p>
              {certificado.colaboradorCargo ? (
                <p className="truncate text-[9.5px] text-muted-foreground" title={certificado.colaboradorCargo}>
                  {certificado.colaboradorCargo}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <dl
        data-certificado-metadados
        className="mt-2.5 grid grid-cols-[minmax(0,0.87fr)_minmax(0,1.12fr)_minmax(0,1.11fr)] items-start gap-x-2.5 rounded-lg border-y border-border/40 px-3 py-3"
      >
        <div data-meta="emissao" className="min-w-0">
          <dt className="text-[10px] font-medium uppercase leading-tight tracking-[0.08em] text-muted-foreground">
            Emissão
          </dt>
          <dd
            className="mt-1.5 truncate text-[12px] font-medium leading-tight tabular-nums text-foreground/90"
            title={formatarDataTreinamento(certificado.dataEmissao)}
          >
            {formatarDataTreinamento(certificado.dataEmissao)}
          </dd>
        </div>

        <div data-meta="validade" className="min-w-0">
          <dt className="text-[10px] font-medium uppercase leading-tight tracking-[0.08em] text-muted-foreground">
            Validade
          </dt>
          <dd className="mt-1.5 min-w-0 text-[12px] font-medium leading-tight tabular-nums text-foreground/90">
            <span className="block truncate" title={certificado.validadeTexto}>
              {certificado.validadeTexto}
            </span>
            <span
              data-validade-detalhe
              aria-hidden={!detalheValidade}
              className={cn('mt-1 block min-h-[14px] truncate text-[10px] leading-tight', detalheValidade)}
            >
              {certificado.detalheValidade && detalheValidade ? certificado.detalheValidade : null}
            </span>
          </dd>
        </div>

        <div data-meta="codigo" className="min-w-0">
          <dt className="text-[10px] font-medium uppercase leading-tight tracking-[0.08em] text-muted-foreground">
            Código
          </dt>
          <dd className="mt-1.5 flex min-w-0 items-center gap-2">
            <span
              className="min-w-0 truncate whitespace-nowrap font-mono text-[12px] font-semibold leading-tight text-primary"
              title={certificado.codigo ?? 'Código não informado'}
            >
              {certificado.codigo ?? '—'}
            </span>
            {certificado.codigo && (
              <button
                type="button"
                onClick={() => void copiarCodigo()}
                aria-label={`Copiar código de autenticação do certificado ${certificado.codigo}`}
                title={copiado ? 'Código copiado' : 'Copiar código'}
                className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              >
                {copiado ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-auto flex items-center pt-2.5">
        <Button
          type="button"
          variant="outline"
          onClick={() => onVisualizar(certificado)}
          aria-label={`Visualizar certificado de ${certificado.colaboradorNome}`}
          className="h-9 w-full min-w-0 gap-1.5 rounded-lg border-border/60 px-3 text-[11.5px] font-semibold transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="truncate">Visualizar certificado</span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0" />
        </Button>
      </div>
    </article>
  );
}
