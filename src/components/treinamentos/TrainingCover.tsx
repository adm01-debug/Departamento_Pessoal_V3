import { useState, type ReactNode } from 'react';
import { Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TrainingContentType, TrainingCoverFormat } from '@/services/trainingImages';
import { estiloCategoriaTreinamento, type EstiloCategoriaTreinamento } from './TreinamentoBadges';
import { normalizarTexto } from './treinamentosDerivacoes';

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

/**
 * Cena provisória por FAMÍLIA de categoria — silhuetas vetoriais (SVG), nunca
 * uma fotografia. Existe apenas quando o curso não possui capa cadastrada;
 * a imagem real, quando houver, substitui tudo isso.
 */
function CenaFaixa({ categoria }: { categoria?: string | null }) {
  const chave = normalizarTexto(categoria).replace(/[\s-]+/g, '_');

  if (chave === 'seguranca_do_trabalho') {
    return (
      <svg
        viewBox="0 0 320 104"
        preserveAspectRatio="xMaxYMax slice"
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full text-white"
      >
        <path d="M140 104 L204 34 L246 80 L268 54 L320 104 Z" fill="currentColor" opacity="0.1" />
        <path d="M184 104 L232 62 L276 104 Z" fill="currentColor" opacity="0.08" />
        <path d="M222 80c0-15 11-26 26-26s26 11 26 26z" fill="currentColor" opacity="0.2" />
        <rect x="216" y="81" width="64" height="5" rx="2.5" fill="currentColor" opacity="0.26" />
        <path d="M234 60c4-4 9-6 14-6s10 2 14 6" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2" />
      </svg>
    );
  }

  if (['lideranca', 'onboarding', 'cultura'].includes(chave)) {
    return (
      <svg
        viewBox="0 0 320 104"
        preserveAspectRatio="xMaxYMax slice"
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full text-white"
      >
        <g fill="currentColor">
          <circle cx="214" cy="56" r="9" opacity="0.16" />
          <path d="M198 104c0-10 7-17 16-17s16 7 16 17z" opacity="0.16" />
          <circle cx="286" cy="58" r="8" opacity="0.14" />
          <path d="M272 104c0-9 6-15 14-15s14 6 14 15z" opacity="0.14" />
          <circle cx="248" cy="40" r="14" opacity="0.26" />
          <path d="M224 104c0-14 11-24 24-24s24 10 24 24z" opacity="0.26" />
          <circle cx="270" cy="32" r="10" opacity="0.2" />
          <path d="M252 104c0-10 8-18 18-18s18 8 18 18z" opacity="0.2" />
        </g>
      </svg>
    );
  }

  return null;
}

function CapaFaixa({ estilo, categoria }: { estilo: EstiloCategoriaTreinamento; categoria?: string | null }) {
  const Icone = estilo.icone;
  const chave = normalizarTexto(categoria).replace(/[\s-]+/g, '_');
  /** Categorias com cena própria dispensam o ícone solto sobre a arte. */
  const temCena = chave === 'seguranca_do_trabalho' || ['lideranca', 'onboarding', 'cultura'].includes(chave);
  return (
    <div aria-hidden className={cn('relative isolate h-full w-full overflow-hidden', estilo.capa)}>
      {/* Halo da família cromática à direita: dá profundidade à faixa sem
          inventar uma imagem que o curso não possui. */}
      <span
        className={cn(
          'pointer-events-none absolute -right-10 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-current opacity-[0.08] blur-2xl',
          estilo.capaTexto
        )}
      />
      {/* Malha de pontos discreta (textura, não ilustração). */}
      <span className="pointer-events-none absolute inset-0 opacity-[0.13] [background-image:radial-gradient(rgba(255,255,255,0.4)_1px,transparent_1px)] [background-size:14px_14px]" />
      {/* Feixes diagonais: mesma linguagem geométrica do banner de trilhas. */}
      <span className="pointer-events-none absolute -right-20 -top-12 h-[220%] w-44 rotate-[24deg] border-l border-white/[0.07]" />
      <span className="pointer-events-none absolute -right-10 -top-12 h-[220%] w-32 rotate-[24deg] border-l border-white/[0.05]" />
      <span className="pointer-events-none absolute -right-5 top-4 h-20 w-20 rounded-full border border-white/10" />
      <span className="pointer-events-none absolute -bottom-14 -left-8 h-24 w-24 rounded-full border border-white/[0.08]" />
      <span className="pointer-events-none absolute inset-x-3 top-1/2 h-px bg-white/[0.06]" />
      <span className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/25 to-transparent" />
      <CenaFaixa categoria={categoria} />
      {!temCena && (
        <Icone
          className={cn(
            'absolute right-3 top-1/2 h-12 w-12 -translate-y-1/2 opacity-[0.26] drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]',
            estilo.capaTexto
          )}
        />
      )}
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
            {formato === 'faixa' && <CapaFaixa estilo={estilo} categoria={categoria} />}
            {formato === 'miniatura' && <MiniaturaCertificado estilo={estilo} rotulo={rotulo} subrotulo={subrotulo} />}
            {formato === 'quadrada' && <CapaQuadrada estilo={estilo} categoria={categoria} />}
          </>
        ))
      )}
    </div>
  );
}
