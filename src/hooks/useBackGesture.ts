import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const DISABLED_BACK_PATHS = ['/', '/dashboard', '/login'] as const;

/**
 * Hook para implementar gesto de swipe para voltar em dispositivos mobile.
 * Baseado no padrão de UX do iOS/Android para navegação intuitiva.
 */
export function useBackGesture() {
  const navigate = useNavigate();
  const location = useLocation();
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    if (DISABLED_BACK_PATHS.includes(location.pathname as (typeof DISABLED_BACK_PATHS)[number])) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Inicia apenas se o toque for próximo à borda esquerda (UX padrão)
      if (e.touches[0].clientX < 40) {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      
      const deltaX = touchEndX - touchStartX.current;
      const deltaY = Math.abs(touchEndY - touchStartY.current);

      // Critérios: Deslizamento horizontal > 100px e desvio vertical pequeno
      if (deltaX > 100 && deltaY < 60) {
        navigate(-1);
      }

      touchStartX.current = null;
      touchStartY.current = null;
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [location.pathname, navigate]);
}
