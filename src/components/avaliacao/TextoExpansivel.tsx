import { useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * Texto real com "Ver mais" quando excede o limite. Não cria conteúdo: apenas
 * alterna entre o recorte visual e o texto integral já recebido.
 */
export function TextoExpansivel({
  texto,
  limite = 180,
  className,
  classeRecorte = 'line-clamp-2',
}: {
  texto: string;
  limite?: number;
  className?: string;
  classeRecorte?: string;
}) {
  const [expandido, setExpandido] = useState(false);
  const longo = texto.length > limite;

  return (
    <div className={cn('flex min-w-0 items-start gap-1.5', className)}>
      <span
        className={cn(
          'min-w-0 whitespace-pre-wrap break-words text-[11px] leading-snug',
          !expandido && longo && classeRecorte
        )}
        title={longo && !expandido ? texto : undefined}
      >
        {texto}
      </span>
      {longo && (
        <button
          type="button"
          className="shrink-0 text-[10px] font-medium text-primary underline-offset-2 hover:underline"
          aria-expanded={expandido}
          onClick={() => setExpandido((v) => !v)}
        >
          {expandido ? 'Ver menos' : 'Ver mais'}
        </button>
      )}
    </div>
  );
}
