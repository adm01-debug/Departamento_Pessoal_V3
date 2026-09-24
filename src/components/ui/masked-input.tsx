import * as React from "react";
import { cn } from "@/lib/utils";
import { masks, placeholders, type MaskType } from "@/lib/masks";

export interface MaskedInputProps extends Omit<React.ComponentProps<"input">, 'onChange'> {
  mask: MaskType;
  onValueChange?: (value: string, maskedValue: string) => void;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
}

const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ className, mask, value, onValueChange, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      const maskFn = masks[mask];
      const maskedValue = maskFn ? maskFn(rawValue) : rawValue;
      
      // Update the input value directly
      e.target.value = maskedValue;
      
      if (onValueChange) {
        const unmaskedValue = rawValue.replace(/\D/g, '');
        onValueChange(unmaskedValue, maskedValue);
      }
      
      if (onChange) {
        onChange(e);
      }
    };

    const maskFn = masks[mask];
    const displayValue = value !== undefined ? (maskFn ? maskFn(String(value)) : String(value)) : undefined;

    return (
      <input
        type="text"
        inputMode="numeric"
        className={cn(
          "flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-base file:border-0 file:bg-transparent file:text-[13px] file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-50 md:text-[13px]",
          className
        )}
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        placeholder={props.placeholder || placeholders[mask]}
        {...props}
      />
    );
  }
);

MaskedInput.displayName = "MaskedInput";

export { MaskedInput };
