/**
 * @module PageContainer
 * @description Container de página com header e conteúdo
 * @category Layout
 */

import React from "react";
import { cn } from "@/lib/utils";

/**
 * Props do componente PageContainer
 */
interface PageContainerProps {
  /** Conteúdo da página */
  children: React.ReactNode;
  /** Título da página */
  title?: string;
  /** Descrição/subtítulo */
  description?: string;
  /** Ações do header */
  actions?: React.ReactNode;
  /** Breadcrumbs */
  breadcrumbs?: React.ReactNode;
  /** Largura máxima do conteúdo */
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  /** Padding interno */
  padding?: "none" | "sm" | "md" | "lg";
  /** Classes CSS adicionais */
  className?: string;
}

/**
 * Mapeamento de larguras máximas
 */
const maxWidthClasses: Record<string, string> = {
  sm: "max-w-screen-sm",
  md: "max-w-screen-md",
  lg: "max-w-screen-lg",
  xl: "max-w-screen-xl",
  "2xl": "max-w-screen-2xl",
  full: "max-w-full",
};

/**
 * Mapeamento de paddings
 */
const paddingClasses: Record<string, string> = {
  none: "p-0",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

/**
 * PageContainer - Container de página
 *
 * @description Layout completo de página com header,
 * breadcrumbs, ações e conteúdo principal
 *
 * @example
 * ```tsx
 * <PageContainer
 *   title="Dashboard"
 *   description="Visão geral do sistema"
 *   actions={<Button>Nova Ação</Button>}
 * >
 *   <PageContent />
 * </PageContainer>
 * ```
 */
export const PageContainer = React.memo(function PageContainer({
  children,
  title,
  description,
  actions,
  breadcrumbs,
  maxWidth = "2xl",
  padding = "md",
  className,
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "w-full mx-auto",
        maxWidthClasses[maxWidth],
        paddingClasses[padding],
        className
      )}
    >
      {/* Breadcrumbs */}
      {breadcrumbs && (
        <div className="mb-4">
          {breadcrumbs}
        </div>
      )}

      {/* Page Header */}
      {(title || actions) && (
        <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title && (
              <h1 className="text-2xl font-medium tracking-tight">{title}</h1>
            )}
            {description && (
              <p className="text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      )}

      {/* Page Content */}
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
});

PageContainer.displayName = "PageContainer";

export default PageContainer;
export type { PageContainerProps };
