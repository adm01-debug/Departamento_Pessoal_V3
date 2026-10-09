import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
  /**
   * Casas decimais PRESERVADAS durante a contagem. Padrão `0` (inteiro) — é o
   * comportamento histórico, o que o Dashboard sempre usou.
   *
   * Use `2` para VALORES MONETÁRIOS: o passo do contador arredonda
   * (`Math.round`) para exibir inteiros limpos, e num valor com centavos isso
   * comeria a parte fracionária no ÚLTIMO quadro — `19.079,93` terminaria em
   * `19.080,00`, ou seja, o número exibido divergiria do valor real. Com
   * `decimals > 0` o quadro é arredondado para as casas pedidas e o último
   * quadro é sempre exatamente `format(value)`.
   */
  decimals?: number;
}

export function AnimatedNumber({ value, format, duration = 1.2, className, decimals = 0 }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    if (!isInView) return;

    const start = 0;
    const end = value;
    const startTime = performance.now();
    const dur = duration * 1000;

    function step(now: number) {
      const progress = Math.min((now - startTime) / dur, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const bruto = start + (end - start) * eased;
      const current = decimals > 0 ? Number(bruto.toFixed(decimals)) : Math.round(bruto);
      setDisplay(format ? format(current) : String(current));
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }, [value, isInView, format, duration, decimals]);

  return (
    <motion.span
      ref={ref}
      initial={{ opacity: 0, y: 8 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4 }}
      className={className}
    >
      {display}
    </motion.span>
  );
}
