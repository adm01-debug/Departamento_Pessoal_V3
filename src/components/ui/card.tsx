import * as React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const cardVariants = cva(
  'rounded-2xl border bg-card text-card-foreground transition-all',
  {
    variants: {
      variant: {
        default: 'shadow-card',
        elevated: 'shadow-elevated hover:shadow-float border-border/30',
        glass: 'glass',
        flat: 'border-border/20 shadow-none',
        interactive: 'shadow-card hover:shadow-elevated hover:-translate-y-0.5 hover:border-primary/20 cursor-pointer',
        gradient: 'border-border/30 shadow-elevated overflow-hidden relative',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  gradient?: string;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, gradient, children, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ variant }), 'animate-squash', className)} {...props}>
      {variant === 'gradient' && gradient && (
        <>
          <div className={cn("absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r", gradient)} />
          <div className={cn("absolute inset-0 opacity-[0.05] bg-gradient-to-br pointer-events-none", gradient)} />
        </>
      )}
      {children}
    </div>
  )
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-base font-medium leading-snug tracking-tight', className)} {...props} />
  )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-xs font-normal tracking-normal leading-relaxed text-muted-foreground', className)} {...props} />
  )
);
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
  )
);
CardFooter.displayName = 'CardFooter';

// eslint-disable-next-line react-refresh/only-export-components
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants };
