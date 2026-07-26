/**
 * P5-087: LanguageSelector — seletor de idioma no header
 *
 * Usa o hook useTranslation().
 * Renderiza um dropdown com bandeiras e labels.
 * Salva a seleção em localStorage.
 */

import { useState, useRef, useEffect } from 'react';
import { useTranslation, type Locale } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Globe, Check } from 'lucide-react';

export function LanguageSelector() {
  const { locale, setLocale, localeConfig } = useTranslation();
  const [open, setOpen] = useState(false);
  const currentConfig = localeConfig[locale];

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 h-8 text-xs font-medium text-muted-foreground hover:text-foreground"
          aria-label="Mudar idioma"
        >
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{currentConfig.flag} {currentConfig.label.split(' ')[0]}</span>
          <span className="sm:hidden">{currentConfig.flag}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Idioma / Language
        </div>
        <DropdownMenuSeparator />

        {(Object.entries(localeConfig) as [Locale, typeof currentConfig][]).map(
          ([code, config]) => {
            const isActive = code === locale;
            return (
              <DropdownMenuItem
                key={code}
                onClick={() => { setLocale(code); setOpen(false); }}
                className={cn(
                  'flex items-center gap-2 cursor-pointer',
                  isActive && 'bg-accent'
                )}
              >
                <span className="text-base leading-none">{config.flag}</span>
                <span className="flex-1">{config.label}</span>
                {isActive && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
            );
          }
        )}

        <DropdownMenuSeparator />
        <div className="px-2 py-1.5">
          <p className="text-xs text-muted-foreground">
            Mais idiomas serão adicionados conforme demanda.
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
