import { motion, AnimatePresence, useReducedMotion, type Transition, type Variants } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { type ReactNode, useState, useMemo } from 'react';

/**
 * Sistema de transições de página avançadas.
 *
 * Efeitos suportados: fade, slide, zoom, flip, parallax, none.
 * Direção: left | right | up | down (aplicável a slide/flip/parallax).
 * Acessibilidade: respeita `prefers-reduced-motion` automaticamente.
 * Performance: usa apenas `transform` + `opacity` (GPU-accelerated)
 * e `will-change` implícito via Framer Motion.
 */

export type TransitionEffect = 'fade' | 'slide' | 'zoom' | 'flip' | 'parallax' | 'none';
export type TransitionDirection = 'left' | 'right' | 'up' | 'down';

export interface PageTransitionConfig {
  effect?: TransitionEffect;
  direction?: TransitionDirection;
  duration?: number;
  ease?: Transition['ease'];
  opacityFrom?: number;
}

const DEFAULT_CONFIG: Required<PageTransitionConfig> = {
  effect: 'slide',
  direction: 'right',
  duration: 0.35,
  ease: [0.32, 0.72, 0, 1],
  opacityFrom: 0,
};

/** Mapeamento opcional por rota (base segment). Permite efeitos distintos. */
const ROUTE_EFFECTS: Record<string, PageTransitionConfig> = {
  '/dashboard': { effect: 'fade', duration: 0.3 },
  '/login': { effect: 'zoom', duration: 0.4 },
  '/relatorios': { effect: 'slide', direction: 'right' },
  '/configuracoes': { effect: 'slide', direction: 'left' },
  '/perfil': { effect: 'flip', direction: 'right', duration: 0.5 },
};

function getRouteConfig(pathname: string): PageTransitionConfig {
  const base = '/' + pathname.split('/').filter(Boolean)[0];
  return ROUTE_EFFECTS[base] ?? {};
}

function buildVariants(cfg: Required<PageTransitionConfig>, axisDirection: number): Variants {
  const { effect, direction, opacityFrom } = cfg;
  const delta = 24;
  const axisX = direction === 'left' || direction === 'right';
  const sign = axisDirection;

  switch (effect) {
    case 'none':
      return {
        enter: { opacity: 1 },
        center: { opacity: 1 },
        exit: { opacity: 1 },
      };
    case 'fade':
      return {
        enter: { opacity: opacityFrom, filter: 'blur(4px)' },
        center: { opacity: 1, filter: 'blur(0px)' },
        exit: { opacity: opacityFrom, filter: 'blur(4px)' },
      };
    case 'zoom':
      return {
        enter: { opacity: opacityFrom, scale: 0.96 },
        center: { opacity: 1, scale: 1 },
        exit: { opacity: opacityFrom, scale: 1.02 },
      };
    case 'flip': {
      const axis: 'rotateX' | 'rotateY' = axisX ? 'rotateY' : 'rotateX';
      return {
        enter: { opacity: opacityFrom, [axis]: 12 * sign, transformPerspective: 1200 },
        center: { opacity: 1, [axis]: 0, transformPerspective: 1200 },
        exit: { opacity: opacityFrom, [axis]: -12 * sign, transformPerspective: 1200 },
      };
    }
    case 'parallax': {
      const k: 'x' | 'y' = axisX ? 'x' : 'y';
      return {
        enter: { opacity: opacityFrom, [k]: delta * 2 * sign },
        center: { opacity: 1, [k]: 0 },
        exit: { opacity: opacityFrom, [k]: -delta * 2 * sign },
      };
    }
    case 'slide':
    default: {
      const k: 'x' | 'y' = axisX ? 'x' : 'y';
      return {
        enter: { opacity: opacityFrom, [k]: delta * sign, filter: 'blur(4px)' },
        center: { opacity: 1, [k]: 0, filter: 'blur(0px)' },
        exit: { opacity: opacityFrom, [k]: -delta * sign, filter: 'blur(4px)' },
      };
    }
  }
}

const routeOrder = [
  '/dashboard',
  '/colaboradores', '/admissoes', '/desligamentos',
  '/empresas',
  '/folha', '/holerites', '/ponto', '/ferias', '/afastamentos',
  '/banco-horas', '/horas-extras', '/faltas', '/turnos', '/escalas', '/jornadas',
  '/beneficios', '/cargos', '/departamentos', '/documentos', '/feriados', '/organograma',
  '/planos-saude', '/seguros-vida', '/convenios', '/vales', '/epis',
  '/treinamentos', '/avaliacao', '/pesquisas-clima',
  '/times', '/centros-custo', '/lotacoes', '/movimentacoes',
  '/sindicatos', '/pensoes', '/exames',
  '/medidas-disciplinares', '/canal-etica',
  '/comunicacao', '/notificacoes',
  '/relatorios', '/esocial', '/auditoria', '/obrigacoes-fiscais',
  '/recrutamento', '/contratacao', '/onboarding', '/assinaturas',
  '/usuarios', '/integracoes', '/backup', '/configuracoes',
  '/controle-acesso', '/lgpd', '/workflows', '/despesas',
  '/locais-trabalho', '/portal', '/perfil', '/assistente-ia',
  '/design-system',
];

function getRouteIndex(path: string): number {
  const base = '/' + path.split('/').filter(Boolean)[0];
  const idx = routeOrder.indexOf(base);
  return idx >= 0 ? idx : routeOrder.length;
}

interface PageTransitionProps {
  children: ReactNode;
  /** Sobrescreve a configuração padrão e a do mapeamento de rota. */
  config?: PageTransitionConfig;
}

export function PageTransition({ children, config }: PageTransitionProps) {
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const currentIndex = getRouteIndex(location.pathname);

  // Estado derivado do render anterior (padrão oficial React).
  const [prevIndex, setPrevIndex] = useState(currentIndex);
  const [direction, setDirection] = useState(1);
  if (prevIndex !== currentIndex) {
    setDirection(currentIndex >= prevIndex ? 1 : -1);
    setPrevIndex(currentIndex);
  }

  const resolved: Required<PageTransitionConfig> = useMemo(() => {
    const routeCfg = getRouteConfig(location.pathname);
    const merged: Required<PageTransitionConfig> = {
      ...DEFAULT_CONFIG,
      ...routeCfg,
      ...config,
    };
    if (prefersReducedMotion) {
      merged.effect = 'fade';
      merged.duration = 0.15;
      merged.opacityFrom = 0.5;
    }
    return merged;
  }, [location.pathname, config, prefersReducedMotion]);

  const variants = useMemo(
    () => buildVariants(resolved, direction),
    [resolved, direction],
  );

  const transition: Transition = {
    type: 'tween',
    ease: resolved.ease,
    duration: resolved.duration,
  };

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={location.key}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={transition}
        className="flex-1 w-full"
        style={{ willChange: 'transform, opacity', transformOrigin: 'center center' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
