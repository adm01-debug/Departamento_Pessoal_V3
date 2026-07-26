// V15-137: src/hooks/useMediaQuery.ts
import { useState, useEffect } from 'react';
import { useOnMount } from './useMountEffects';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  // Inicializa valor apenas no mount
  useOnMount(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);
  });

  return matches;
}

export function useBreakpoint() {
  const isMobile = useMediaQuery('(max-width: 639px)');
  const isTablet = useMediaQuery('(min-width: 640px) and (max-width: 1023px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isLargeDesktop = useMediaQuery('(min-width: 1280px)');

  return {
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    breakpoint: isMobile ? 'mobile' : isTablet ? 'tablet' : isLargeDesktop ? 'xl' : 'desktop',
  };
}

export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 768px)');
}

export function usePrefersDarkMode(): boolean {
  return useMediaQuery('(prefers-color-scheme: dark)');
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}
