import type { Tables } from '@/integrations/supabase/types';
import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const CHECKLIST_ITEMS = [
  { key: 'checklist_comunicacao', label: 'Comunicação ao colaborador' },
  { key: 'checklist_documentacao', label: 'Documentação preparada' },
  { key: 'checklist_calculo_rescisao', label: 'Cálculo de rescisão' },
  { key: 'checklist_revogacao_acessos', label: 'Revogação de acessos' },
  { key: 'checklist_devolucao_equipamentos', label: 'Devolução de equipamentos' },
  { key: 'checklist_esocial', label: 'Envio eSocial (S-2299)' },
  { key: 'checklist_homologacao', label: 'Homologação' },
  { key: 'checklist_pagamento', label: 'Pagamento efetuado' },
] as const;

interface ChecklistProps {
  desligamento: Tables<'desligamentos'>;
  onToggle?: (key: string, value: boolean) => void;
  readOnly?: boolean;
}

export function DesligamentoChecklist({ desligamento, onToggle, readOnly }: ChecklistProps) {
  const completed = CHECKLIST_ITEMS.filter((item) => desligamento[item.key] === true).length;
  const total = CHECKLIST_ITEMS.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-body">
          <span className="text-muted-foreground">Progresso do Checklist</span>
          <span className="font-semibold text-foreground">
            {completed}/{total}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className={cn(
              'h-full rounded-full transition-colors',
              progress === 100 ? 'bg-success' : progress > 50 ? 'bg-info' : 'bg-warning'
            )}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Items */}
      <div className="space-y-1">
        {CHECKLIST_ITEMS.map((item, i) => {
          const checked = desligamento[item.key] === true;
          return (
            <motion.button
              key={item.key}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              disabled={readOnly}
              onClick={() => onToggle?.(item.key, !checked)}
              className={cn(
                'flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm font-body transition-all',
                readOnly ? 'cursor-default' : 'cursor-pointer hover:bg-muted/50',
                checked ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {checked ? (
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              )}
              <span className={cn(checked && 'line-through opacity-70')}>{item.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
