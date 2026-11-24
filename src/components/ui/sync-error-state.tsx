import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { motion, AnimatePresence } from 'framer-motion';

interface SyncErrorStateProps {
  error: any;
  onRetry: () => void;
  entityName?: string;
}

export function SyncErrorState({ error, onRetry, entityName = "dados" }: SyncErrorStateProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  const errorMessage = error instanceof Error ? error.message : 
                 typeof error === 'string' ? error : 
                 (error?.error || "Erro de conexão com o banco externo");

  const isUuidError = errorMessage.includes('invalid input syntax for type uuid');
  const isSchemaError = errorMessage.includes('schema cache') || errorMessage.includes('column') || errorMessage.includes('does not exist');
  const isNetworkError = errorMessage.includes('failed to fetch') || errorMessage.includes('network error') || errorMessage.includes('timeout');

  return (
    <div className="flex flex-col items-center justify-center p-8 w-full max-w-2xl mx-auto space-y-4">
      <Alert variant="destructive" className="border-destructive/30 bg-destructive/5 rounded-2xl shadow-xs overflow-hidden">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle className="font-display font-medium">Erro de Sincronização</AlertTitle>
        <AlertDescription className="font-body text-sm mt-1">
          <p>Não foi possível carregar os {entityName} do banco externo.</p>
          
          {isUuidError && (
            <p className="mt-2 text-destructive font-medium">
              Detectamos um problema na identificação do registro (UUID inválido).
            </p>
          )}
          
          {isSchemaError && (
            <p className="mt-2 text-destructive font-medium">
              O banco de dados externo parece ter uma estrutura diferente da esperada (coluna ou tabela ausente).
            </p>
          )}

          {isNetworkError && (
            <p className="mt-2 text-destructive font-medium">
              Falha na conexão de rede com o servidor externo.
            </p>
          )}

          <div className="mt-4 border-t border-destructive/10 pt-4">
            <button 
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider opacity-70 hover:opacity-100 transition-opacity"
            >
              {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {showDetails ? 'Ocultar Detalhes Técnicos' : 'Ver Detalhes Técnicos'}
            </button>
            
            <AnimatePresence>
              {showDetails && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <p className="mt-2 text-[11px] font-mono opacity-80 p-3 bg-background/50 rounded-lg break-all border border-destructive/10">
                    {errorMessage}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </AlertDescription>
      </Alert>
      
      <div className="flex flex-col items-center gap-2">
        <Button 
          variant="default" 
          onClick={onRetry} 
          className="rounded-xl gap-2 font-medium shadow-glow bg-primary hover:bg-primary/90 min-w-[200px]"
        >
          <RefreshCw className="h-4 w-4" />
          Tentar Novamente
        </Button>
        <p className="text-[10px] text-muted-foreground">O sistema tentará restabelecer a conexão com o banco externo.</p>
      </div>
    </div>
  );
}
