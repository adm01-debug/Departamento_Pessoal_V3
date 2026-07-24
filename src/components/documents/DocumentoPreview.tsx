import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, FileText, X } from 'lucide-react';
import { safeHref } from '@/utils/safeUrl';

interface DocumentoPreviewProps {
  documento: any;
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentoPreview({ documento, isOpen, onClose }: DocumentoPreviewProps) {
  if (!documento) return null;

  const url = safeHref(documento.url);
  const isPDF = documento.mime_type === 'application/pdf' || documento.url?.endsWith('.pdf');
  const isImage = documento.mime_type?.startsWith('image/') || /\.(jpg|jpeg|png|gif)$/i.test(documento.url || '');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="p-4 border-b flex flex-row items-center justify-between bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="font-display text-base">{documento.nome || documento.nome_arquivo}</DialogTitle>
              <p className="text-xs text-muted-foreground capitalize">{documento.tipo} • {new Date(documento.created_at).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="rounded-xl h-8 text-xs" onClick={() => window.open(url, '_blank', 'noopener')}>
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Abrir Original
            </Button>
            <Button variant="outline" size="icon" aria-label="Fechar" className="rounded-xl h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 bg-accent/5 overflow-auto flex items-center justify-center p-4">
          {isPDF ? (
            <iframe
              src={`${url}#toolbar=0`}
              sandbox="allow-same-origin"
              className="w-full h-full border-0 rounded-lg shadow-xs"
              title="Preview PDF"
            />
          ) : isImage ? (
            <img
              src={url}
              alt={documento.nome}
              className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
            />
          ) : (
            <div className="text-center space-y-4 p-12 bg-background rounded-3xl border border-dashed shadow-xs">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground/30" />
              <div>
                <h3 className="font-display font-semibold">Visualização não disponível</h3>
                <p className="text-sm text-muted-foreground mt-1">Este tipo de arquivo não pode ser visualizado diretamente no navegador.</p>
              </div>
              <Button className="rounded-xl" onClick={() => window.open(url, '_blank', 'noopener')}>
                <Download className="h-4 w-4 mr-2" /> Baixar para Ver
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
