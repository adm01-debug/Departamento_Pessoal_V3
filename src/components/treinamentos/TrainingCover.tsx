import { useState, type ReactNode } from 'react';
import { Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TrainingContentType, TrainingCoverFormat } from '@/services/trainingImages';
import { estiloCategoriaTreinamento, type EstiloCategoriaTreinamento } from './TreinamentoBadges';

/**
 * ============================================================================
 * TRAINING COVER — capa única das quatro áreas do Hub de Treinamentos.
 *
 * O QUE ELE RESOLVE
 *   • imagem REAL (gerada ou enviada): `<img>` com `object-fit: cover`, carregada
 *     de forma lazy e tratada por overlays de CSS — a imagem original NUNCA é
 *     reescrita nem recebe efeitos "queimados";
 *   • ausência de imagem (estado atual), URL quebrada ou carregamento negado:
 *     composição SVG/CSS provisória, com a família cromática da categoria e o
 *     ícone do Design System. Não é uma imagem de IA e não finge ser.
 *
 * GARANTIAS
 *   • sem requisição externa: nada de URL aleatória, banco de imagens ou CDN;
 *   • sem estado de carregamento: ou há imagem, ou há fallback — nunca spinner;
 *   • sem dimensão fixa: o componente preenche o contêiner (`h-full w-full`),
 *     então cada área mantém o tamanho aprovado e responde ao layout;
 *   • `prefers-reduced-motion` não é afetado (não há animação contínua).
 *
 * FORMATOS (composição do FALLBACK)
 *   • `quadrada`  — Catálogo: rótulo da categoria + ícone (capa 92–112 px);
 *   • `faixa`     — Turmas: formas discretas, sem texto (título fica por cima);
 *   • `miniatura` — Certificados: miniatura decorativa de documento.
 * A área de Trilhas passa o próprio banner como `fallback`, preservando a arte
 * aprovada, e ganha a imagem real quando ela existir.
 * ============================================================================
 */
export interface TrainingCoverProps {
  tipo: TrainingContentType;
  /** Nome do curso/trilha/turma — usado no `alt` e nas iniciais do fallback. */
  nome: string;
  categoria?: string | null;
  imagemUrl?: string | null;
  formato?: TrainingCoverFormat;
  /** Texto do topo da miniatura de certificado. */
  rotulo?: string;
  /** Texto da base da miniatura de certificado. */
  subrotulo?: string;
  /** Fallback específico da área (ex.: banner ilustrado das Trilhas). */
  fallback?: ReactNode;
  className?: string;
  /** `true` para imagens acima da dobra (carregamento imediato). */
  prioridade?: boolean;
}

function CapaQuadrada({ estilo, categoria }: { estilo: EstiloCategoriaTreinamento; categoria?: string | null }) {
  const Icone = estilo.icone;
  const rotulo = categoria?.trim() || 'Sem categoria';
  return (
    <div
      aria-hidden
      className={cn(
        'relative isolate flex h-full w-full flex-col justify-between overflow-hidden border border-border/40 p-2',
        estilo.capa
      )}
    >
      <span className="pointer-events-none absolute -right-7 -top-9 h-20 w-20 rounded-full border border-white/10" />
      <span className="pointer-events-none absolute -bottom-9 -left-5 h-16 w-16 rounded-full border border-white/[0.08]" />
      <span className="pointer-events-none absolute inset-x-2 top-1/2 h-px bg-white/[0.06]" />
      <span
        className={cn(
          'relative line-clamp-2 text-[8px] font-semibold uppercase leading-[1.25] tracking-[0.12em]',
          estilo.capaTexto
        )}
      >
        {rotulo}
      </span>
      <Icone className={cn('relative h-7 w-7 @[560px]:h-8 @[560px]:w-8', estilo.capaTexto)} />
    </div>
  );
}

function CapaFaixa({ estilo }: { estilo: EstiloCategoriaTreinamento }) {
  const Icone = estilo.icone;
  return (
    <div aria-hidden className={cn('relative isolate h-full w-full overflow-hidden', estilo.capa)}>
      <span className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full border border-white/10" />
      <span className="pointer-events-none absolute -bottom-12 -left-6 h-24 w-24 rounded-full border border-white/[0.08]" />
      <span className="pointer-events-none absolute inset-x-3 top-1/2 h-px bg-white/[0.06]" />
      <Icone className={cn('absolute right-3 top-1/2 h-9 w-9 -translate-y-1/2 opacity-25', estilo.capaTexto)} />
    </div>
  );
}

function MiniaturaCertificado({
  estilo,
  rotulo,
  subrotulo,
}: {
  estilo: EstiloCategoriaTreinamento;
  rotulo: string;
  subrotulo: string;
}) {
  const Icone = estilo.icone;
  return (
    <div aria-hidden className={cn('relative isolate flex h-full w-full flex-col justify-between p-2', estilo.capa)}>
      <span className="pointer-events-none absolute inset-1.5 rounded border border-white/10" />
      <span className="pointer-events-none absolute -right-6 -top-7 h-16 w-16 rounded-full border border-white/10" />
      <span className="pointer-events-none absolute -bottom-6 -left-5 h-14 w-14 rounded-full border border-white/[0.08]" />
      <span
        className={cn('relative text-[6px] font-semibold uppercase leading-tight tracking-[0.16em]', estilo.capaTexto)}
      >
        {rotulo}
      </span>
      <Icone className={cn('relative h-6 w-6 opacity-90', estilo.capaTexto)} />
      <span className="relative flex items-center gap-1 text-[6px] uppercase tracking-[0.12em] text-white/55">
        <span className="h-px w-5 bg-white/25" />
        {subrotulo}
      </span>
      <span className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-black/20 text-white/80">
        <Award className="h-3 w-3" aria-hidden />
      </span>
    </div>
  );
}

export function TrainingCover({
  tipo,
  nome,
  categoria,
  imagemUrl,
  formato = 'quadrada',
  rotulo = 'Certificado',
  subrotulo = 'Prévia',
  fallback,
  className,
  prioridade = false,
}: TrainingCoverProps) {
  const [falhouEm, setFalhouEm] = useState<string | null>(null);
  const estilo = estiloCategoriaTreinamento(categoria);
  const url = String(imagemUrl ?? '').trim();
  /**
   * A falha é amarrada à URL que falhou — e não a um booleano. Assim, quando o
   * backend gera/renova a capa e o React Query entrega uma URL nova, o
   * componente volta a tentar sozinho (sem reload) em vez de ficar preso no
   * fallback para sempre.
   */
  const exibirImagem = Boolean(url) && falhouEm !== url;

  return (
    <div
      data-training-cover={tipo}
      data-training-cover-formato={formato}
      data-training-cover-estado={exibirImagem ? 'imagem' : 'fallback'}
      className={cn('relative isolate h-full w-full overflow-hidden bg-[hsl(216_48%_9%)]', className)}
    >
      {exibirImagem ? (
        <>
          <img
            src={url}
            alt={`Capa de ${nome}`}
            loading={prioridade ? 'eager' : 'lazy'}
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setFalhouEm(url)}
          />
          {/* Iluminação sutil no topo + escurecimento progressivo na base. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(0,0,0,0)_38%)]"
          />
          <span
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-0',
              formato === 'miniatura'
                ? 'bg-gradient-to-t from-black/45 via-black/10 to-transparent'
                : 'bg-gradient-to-t from-black/70 via-black/20 to-transparent'
            )}
          />
        </>
      ) : (
        (fallback ?? (
          <>
            {formato === 'faixa' && <CapaFaixa estilo={estilo} />}
            {formato === 'miniatura' && <MiniaturaCertificado estilo={estilo} rotulo={rotulo} subrotulo={subrotulo} />}
            {formato === 'quadrada' && <CapaQuadrada estilo={estilo} categoria={categoria} />}
          </>
        ))
      )}
    </div>
  );
}
