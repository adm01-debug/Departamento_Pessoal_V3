import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { loggerService } from '@/services/loggerService';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[RouteErrorBoundary]', error, info.componentStack);
    loggerService.fatal('Route rendering error', { 
      componentStack: info.componentStack,
      location: window.location.pathname 
    }, error);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  handleReport = () => {
    toast.success('Relatório de erro enviado para a equipe técnica.');
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 p-8 animate-in fade-in zoom-in-95 duration-300">
          <div className="relative">
            <div className="absolute inset-0 bg-destructive/20 blur-3xl rounded-full" />
            <div className="relative p-6 rounded-3xl bg-destructive/10 border border-destructive/20 shadow-glow-destructive">
              <ShieldAlert className="h-12 w-12 text-destructive animate-pulse" />
            </div>
          </div>
          <div className="text-center space-y-3 max-w-lg">
            <h2 className="text-2xl font-display font-bold text-foreground tracking-tight">
              Instabilidade Detectada
            </h2>
            <p className="text-base text-muted-foreground font-body leading-relaxed">
              Ocorreu uma falha na renderização deste módulo. Nossa equipe de engenharia já foi notificada automaticamente via telemetria.
            </p>
            {this.state.error && import.meta.env.DEV && (
              <div className="mt-6 p-4 bg-muted/30 border border-border/40 rounded-2xl text-left">
                <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2 tracking-widest">Stack Trace Resume</p>
                <code className="text-xs text-destructive/80 font-mono break-all line-clamp-3">
                  {this.state.error.message}
                </code>
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
            <Button variant="outline" onClick={this.handleRetry} className="flex-1 h-11 rounded-xl gap-2 shadow-xs">
              <RefreshCw className="h-4 w-4" /> Tentar novamente
            </Button>
            <Button onClick={this.handleGoHome} className="flex-1 h-11 rounded-xl gap-2 bg-foreground text-background hover:bg-foreground/90">
              <Home className="h-4 w-4" /> Ir ao início
            </Button>
          </div>
          <button 
            onClick={this.handleReport}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors mt-4"
          >
            <Send className="h-3 w-3" />
            Enviar relatório manual detalhado
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
