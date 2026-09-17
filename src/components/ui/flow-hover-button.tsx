import * as React from 'react';
import { cn } from '@/lib/utils';

export interface FlowHoverButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
}

/**
 * Camada de animação "flow": um círculo nasce fora do botão (`before`,
 * deslocado 150% + escalado 2.5x) e desliza para o centro no hover,
 * preenchendo o botão. Não define cor de fundo, texto, borda, padding, raio
 * nem a cor da onda — só soma `relative/overflow-hidden` (necessários para
 * recortar o círculo) e a movimentação do `before` ao `className` recebido.
 * A aparência em repouso do botão (cores, borda, tamanho) fica idêntica à
 * atual; a única mudança é o preenchimento animado ao passar o mouse.
 *
 * A cor da onda (`before:bg-...`) é responsabilidade de quem usa o
 * componente — passe via `className` (ex.: `before:bg-primary/20` num botão
 * escuro, `before:bg-success/20` no botão lima), seguindo os tokens do
 * design system em vez de uma cor fixa aqui. Se a onda deixar o texto
 * ilegível quando preenche o botão, use `hover:text-*` no mesmo `className`
 * para escurecer/clarear o texto — `transition-all` abaixo já garante que
 * essa troca de cor anime junto com o resto, não só o `scale`.
 */
export const FlowHoverButton = React.forwardRef<HTMLButtonElement, FlowHoverButtonProps>(
  ({ icon, children, className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        `relative z-0 flex items-center justify-center gap-2 overflow-hidden
        transition-all duration-500
        before:absolute before:inset-0 before:-z-10 before:translate-x-[150%] before:translate-y-[150%] before:scale-[2.5]
        before:rounded-[100%] before:transition-transform before:duration-700 before:content-['']
        hover:scale-[1.02] hover:before:translate-x-0 hover:before:translate-y-0 active:scale-[0.98]`,
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  ),
);
FlowHoverButton.displayName = 'FlowHoverButton';
