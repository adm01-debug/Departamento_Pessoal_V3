import { Clock, Infinity as InfinityIcon, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SituacaoRealCertificado } from './certificadosDerivacoes';

/** Selo semântico da situação do certificado — texto sempre visível. */
const ESTILOS: Record<SituacaoRealCertificado, { rotulo: string; icone: LucideIcon; classe: string }> = {
  valido: {
    rotulo: 'Válido',
    icone: ShieldCheck,
    classe: 'border-success/30 bg-success/10 text-success',
  },
  a_vencer: {
    rotulo: 'A vencer',
    icone: Clock,
    classe: 'border-warning/30 bg-warning/10 text-warning',
  },
  vencido: {
    rotulo: 'Vencido',
    icone: ShieldAlert,
    classe:
      'border-[hsl(var(--destructive-vivid)/0.3)] bg-[hsl(var(--destructive-vivid)/0.1)] text-[hsl(var(--destructive-vivid))]',
  },
  vitalicio: {
    rotulo: 'Vitalício',
    icone: InfinityIcon,
    classe: 'border-info/30 bg-info/10 text-info',
  },
  sem_validade: {
    rotulo: 'Validade não informada',
    icone: Shield,
    classe: 'border-border/60 bg-muted/40 text-muted-foreground',
  },
};

export function CertificadoStatusBadge({
  situacao,
  className,
}: {
  situacao: SituacaoRealCertificado;
  className?: string;
}) {
  const estilo = ESTILOS[situacao];
  const Icone = estilo.icone;
  return (
    <span
      className={cn(
        'inline-flex h-[22px] max-w-full items-center gap-1 whitespace-nowrap rounded-full border px-2 text-[9.5px] font-semibold leading-none',
        estilo.classe,
        className
      )}
    >
      <Icone className="h-3 w-3 shrink-0" aria-hidden />
      <span className="truncate">{estilo.rotulo}</span>
    </span>
  );
}
