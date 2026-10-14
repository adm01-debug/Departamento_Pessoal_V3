import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { entradaCard } from './entradaCards';

/**
 * ============================================================================
 * BANNER "FOCO AGORA" — Nine-Box.
 *
 * Faixa compacta de atenção, no MESMO idioma visual dos banners já aprovados
 * no módulo (Metas críticas, Feedbacks, PDI): bordô translúcido, ícone em caixa
 * arredondada, leitura principal + resumo e UMA ação real à direita.
 *
 * ── OS NÚMEROS VÊM DO DADO ──────────────────────────────────────────────────
 * `total`/`emRisco`/`semPdi` chegam de `nineBoxComum.lerAtencao`, que só usa
 * critérios comprováveis:
 *   • quadrante de atenção (Sub-performer — leitura que o componente ANTERIOR
 *     desta aba já fazia com o rótulo "Atenção necessária");
 *   • colaborador classificado sem PDI vinculado (relação real por id).
 * A referência cita também "sem plano de sucesso": NÃO existe plano de sucesso
 * no banco (ver auditoria em `nineBoxComum`), então essa informação não aparece
 * aqui — em vez de ser inventada.
 *
 * Sem nenhum registro em atenção o componente devolve `null`: a cor de alerta
 * nunca é decorativa. `semClassificacao` (fora da matriz por falta de nota ou
 * potencial) entra apenas como AVISO, porque é ausência de dado, não risco.
 * ============================================================================
 */

interface NineBoxFocoBannerProps {
  total: number;
  /** Quantos estão em quadrante de atenção (Sub-performer). */
  emRisco: number;
  /** Quantos classificados estão sem PDI vinculado. */
  semPdi: number;
  /** Quantos ficaram fora da matriz por falta de nota/potencial. */
  semClassificacao?: number;
  /** Posição na cascata (a referência coloca o banner como 2º item). */
  indice?: number;
  /** True quando o filtro de atenção do banner já está aplicado. */
  ativo?: boolean;
  /** Aplica/remove o filtro de atenção — ação real da aba. */
  onVerDetalhes?: () => void;
}

export function NineBoxFocoBanner({
  total,
  emRisco,
  semPdi,
  semClassificacao = 0,
  indice = 1,
  ativo = false,
  onVerDetalhes,
}: NineBoxFocoBannerProps) {
  if (total <= 0) return null;

  const resumo = [emRisco > 0 && `${emRisco} em quadrante de atenção`, semPdi > 0 && `${semPdi} sem PDI vinculado`]
    .filter(Boolean)
    .join('  •  ');

  return (
    <motion.div
      {...entradaCard(indice)}
      className="flex flex-col gap-3 rounded-xl border border-destructive-vivid/30 bg-destructive-vivid/10 px-4 py-3 shadow-[0_0_18px_-12px_hsl(var(--destructive-vivid))] lg:flex-row lg:items-center lg:gap-5"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive-vivid/15 text-destructive-vivid">
          <AlertTriangle className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wider text-destructive-vivid">Foco agora</p>
          <p className="text-[13px] font-medium leading-tight">
            {total} {total === 1 ? 'talento precisa' : 'talentos precisam'} de atenção.
          </p>
          {resumo && <p className="text-[11px] leading-tight text-muted-foreground">{resumo}</p>}
          {semClassificacao > 0 && (
            <p className="text-[10px] leading-tight text-muted-foreground/70">
              {semClassificacao} {semClassificacao === 1 ? 'registro está' : 'registros estão'} fora da matriz por falta
              de nota ou potencial.
            </p>
          )}
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onVerDetalhes}
        className="h-8 shrink-0 gap-1.5 self-start border-destructive-vivid/30 bg-transparent text-xs text-destructive-vivid transition-colors hover:bg-destructive-vivid/10 hover:text-destructive-vivid lg:self-auto"
      >
        {ativo ? 'Limpar atenção' : 'Ver detalhes'}
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </motion.div>
  );
}
