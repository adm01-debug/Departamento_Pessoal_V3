import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const INPUT_CLASSNAME =
  'flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-control file:border-0 file:bg-transparent file:text-control file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-50';

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return <input type={type} className={cn(INPUT_CLASSNAME, className)} ref={ref} {...props} />;
});
Input.displayName = 'Input';

export { Input };
