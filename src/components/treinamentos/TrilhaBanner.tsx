import { cn } from '@/lib/utils';
import { TrainingCover } from './TrainingCover';

/**
 * Banner ilustrado do card de trilha.
 *
 * SEM imagem externa e SEM dependência nova: a arte é SVG + gradiente
 * compostos com os tokens oficiais do tema (`info` azul, `warning` âmbar,
 * `chart-4` violeta). A trilha recebe uma família cromática estável derivada do
 * próprio `id` — nunca do nome —, então o card não muda de cor entre renders.
 *
 * LEGIBILIDADE: a base é sempre navy (`hsl(216 48% 9%)`, o mesmo matiz de
 * `--background`) com o tom por cima e um véu escuro na base. O texto branco
 * fica com contraste alto nos dois temas, sem depender do fundo do card.
 */

const TONS = [
  {
    token: '--info',
    rotulo: 'Azul',
    gradiente: 'linear-gradient(115deg, hsl(216 48% 8%) 0%, hsl(var(--info) / 0.55) 58%, hsl(216 48% 10%) 100%)',
    selo: 'bg-info/25 text-[hsl(199_95%_88%)] ring-info/40',
  },
  {
    token: '--warning',
    rotulo: 'Âmbar',
    gradiente: 'linear-gradient(115deg, hsl(216 48% 8%) 0%, hsl(var(--warning) / 0.5) 58%, hsl(216 48% 10%) 100%)',
    selo: 'bg-warning/25 text-[hsl(38_100%_90%)] ring-warning/40',
  },
  {
    token: '--chart-4',
    rotulo: 'Violeta',
    gradiente: 'linear-gradient(115deg, hsl(216 48% 8%) 0%, hsl(var(--chart-4) / 0.55) 58%, hsl(216 48% 10%) 100%)',
    selo: 'bg-[hsl(var(--chart-4)/0.3)] text-[hsl(270_100%_92%)] ring-[hsl(var(--chart-4)/0.45)]',
  },
] as const;

export type TomBanner = (typeof TONS)[number];

/** Tom estável por trilha: o NÍVEL real escolhe a família, como na referência. */
// eslint-disable-next-line react-refresh/only-export-components
export function tomBannerTrilha(nivel?: string | null): TomBanner {
  const chave = String(nivel ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (chave === 'intermediario') return TONS[1];
  if (chave === 'avancado') return TONS[2];
  return TONS[0];
}

function Arte({ tom }: { tom: TomBanner }) {
  const cor = `text-[hsl(var(${tom.token}))]`;

  if (tom.rotulo === 'Âmbar') {
    return (
      <svg
        viewBox="0 0 320 142"
        preserveAspectRatio="xMaxYMid slice"
        aria-hidden
        className={cn('absolute inset-0 h-full w-full', cor)}
      >
        <circle cx="252" cy="44" r="28" fill="currentColor" opacity="0.18" />
        <path d="M150 142 L232 60 L306 138 Z" fill="currentColor" opacity="0.22" />
        <path d="M206 142 L268 82 L336 142 Z" fill="currentColor" opacity="0.15" />
        <path d="M232 60V30" stroke="currentColor" strokeWidth="2" strokeOpacity="0.55" />
        <path d="M233 30l20 7-20 7z" fill="currentColor" opacity="0.55" />
        <g fill="currentColor" opacity="0.35">
          <circle cx="290" cy="96" r="2.4" />
          <circle cx="270" cy="118" r="2" />
          <circle cx="300" cy="64" r="1.8" />
        </g>
      </svg>
    );
  }

  if (tom.rotulo === 'Violeta') {
    return (
      <svg
        viewBox="0 0 320 142"
        preserveAspectRatio="xMaxYMid slice"
        aria-hidden
        className={cn('absolute inset-0 h-full w-full', cor)}
      >
        <g fill="none" stroke="currentColor" strokeOpacity="0.32" strokeWidth="1.4">
          <path d="M240 32l36 19v36l-36 19-36-19V51z" />
          <path d="M204 51l36 19 36-19M240 70v36" />
        </g>
        <g fill="currentColor" opacity="0.18">
          <path d="M300 84l20 11v22l-20 11z" />
          <path d="M188 96l14 8v18l-14 8z" />
        </g>
        <g fill="currentColor" opacity="0.4">
          <path d="M240 32l36 19-36 19-36-19z" opacity="0.22" />
          <circle cx="240" cy="70" r="2.6" />
          <circle cx="300" cy="50" r="2" />
        </g>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 320 142"
      preserveAspectRatio="xMaxYMid slice"
      aria-hidden
      className={cn('absolute inset-0 h-full w-full', cor)}
    >
      <g fill="none" stroke="currentColor" strokeOpacity="0.26" strokeWidth="1.2">
        <circle cx="250" cy="72" r="78" />
        <circle cx="250" cy="72" r="54" />
      </g>
      <g fill="currentColor">
        <circle cx="248" cy="44" r="13" opacity="0.26" />
        <path d="M229 98c0-14 8-23 19-23s19 9 19 23z" opacity="0.26" />
        <circle cx="288" cy="78" r="10" opacity="0.16" />
        <path d="M273 122c0-11 6-18 15-18s15 7 15 18z" opacity="0.16" />
        <circle cx="214" cy="112" r="7" opacity="0.12" />
        <path d="M203 142c0-8 5-13 11-13s11 5 11 13z" opacity="0.12" />
      </g>
      <g fill="currentColor" opacity="0.4">
        <circle cx="272" cy="112" r="2.4" />
        <circle cx="200" cy="76" r="2" />
        <circle cx="300" cy="42" r="1.8" />
      </g>
    </svg>
  );
}

export interface TrilhaBannerProps {
  tom: TomBanner;
  nivel: string;
  titulo: string;
  descricao?: string | null;
  /** Capa real (gerada ou enviada). Ausente → arte provisória aprovada. */
  imagemUrl?: string | null;
  /** Menu de três pontos (ações reais da trilha). */
  acoes?: React.ReactNode;
  className?: string;
}

export function TrilhaBanner({ tom, nivel, titulo, descricao, imagemUrl, acoes, className }: TrilhaBannerProps) {
  return (
    <div className={cn('relative h-[142px] w-full overflow-hidden bg-[hsl(216_48%_9%)]', className)}>
      {/* A capa (quando existir) substitui a arte provisória sem alterar o
          banner aprovado: título, nível e ações continuam por cima. */}
      <TrainingCover
        tipo="learning_path"
        nome={titulo}
        imagemUrl={imagemUrl}
        formato="faixa"
        className="absolute inset-0"
        fallback={
          <>
            <div className="absolute inset-0" style={{ backgroundImage: tom.gradiente }} />
            <Arte tom={tom} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/5" />
          </>
        }
      />

      <div className="relative flex h-full flex-col justify-between gap-2 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <span
            className={cn(
              'inline-flex h-[22px] items-center rounded-full px-2 text-[10px] font-semibold uppercase tracking-[0.06em] ring-1 backdrop-blur-sm',
              tom.selo
            )}
          >
            {nivel}
          </span>
          {acoes}
        </div>

        <div className="min-w-0">
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-tight text-white" title={titulo}>
            {titulo}
          </h3>
          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-white/70">
            {descricao?.trim() || 'Sem descrição cadastrada.'}
          </p>
        </div>
      </div>
    </div>
  );
}
