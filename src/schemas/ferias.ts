import { z } from 'zod';

/**
 * Schema de Férias — espelho das validações CLT do banco.
 * As mesmas regras são reforçadas server-side via triggers
 * (trg_ferias_validar_split, trg_ferias_validar_inicio).
 * Aqui garantimos UX imediata sem round-trip ao servidor.
 */
export const feriasSchema = z
  .object({
    colaborador_id: z.string().uuid('Colaborador obrigatório'),
    periodo_aquisitivo_id: z.string().uuid('Período aquisitivo obrigatório').optional(),
    data_inicio: z.string().min(1, 'Data de início obrigatória'),
    data_fim: z.string().min(1, 'Data de fim obrigatória'),
    dias_ferias: z.number().min(5, 'Mínimo de 5 dias por período (Art. 134 §1º CLT)').max(30, 'Máximo de 30 dias'),
    dias_abono: z.number().min(0).max(10, 'Abono pecuniário máximo: 10 dias (Art. 143 CLT)').default(0),
    observacoes: z.string().optional(),
    empresa_id: z.string().uuid().optional(),
  })
  .superRefine((data, ctx) => {
    // Art. 134 §3º CLT — não iniciar em domingo (DSR) nem 2 dias antes de feriado.
    // Feriado é verificado no servidor (depende da tabela `feriados` da empresa).
    // Aqui só bloqueamos o caso trivial: domingo.
    if (data.data_inicio) {
      const [y, m, d] = data.data_inicio.split('-').map(Number);
      const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
      if (dt.getUTCDay() === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['data_inicio'],
          message: 'Férias não podem iniciar em domingo (DSR — Art. 134 §3º CLT).',
        });
      }
    }
    // Coerência de datas
    if (data.data_inicio && data.data_fim && data.data_fim < data.data_inicio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['data_fim'],
        message: 'Data de fim não pode ser anterior à data de início.',
      });
    }
  });

export type FeriasSchema = z.infer<typeof feriasSchema>;

/** Códigos de erro estáveis vindos das triggers do banco. */
export const FERIAS_ERROR_CODES = {
  SPLIT_INVALIDO: 'FERIAS_SPLIT_INVALIDO',
  INICIO_INVALIDO: 'FERIAS_INICIO_INVALIDO',
  AQUISITIVO_INVALIDO: 'FERIAS_AQUISITIVO_INVALIDO',
} as const;
