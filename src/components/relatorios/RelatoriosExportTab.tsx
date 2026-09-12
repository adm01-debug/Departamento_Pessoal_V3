import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Mail, type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface ReportDef {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
  emailEnabled: boolean;
}

interface RelatoriosExportTabProps {
  relatorios: ReportDef[];
  exportFormat: string;
  generating: string | null;
  onExport: (id: string) => void;
  onEmailOpen: (id: string) => void;
}

export function RelatoriosExportTab({
  relatorios,
  exportFormat,
  generating,
  onExport,
  onEmailOpen,
}: RelatoriosExportTabProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {relatorios.map(({ id, title, description, icon: Icon, gradient, emailEnabled }, i) => (
        <motion.div
          key={id}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
        >
          <Card className="group border border-border/30 hover:border-border/60 shadow-elevated hover:shadow-glow transition-all duration-300 rounded-2xl overflow-hidden">
            <div
              className={cn('h-[2px] bg-gradient-to-r opacity-60 group-hover:opacity-100 transition-opacity', gradient)}
            />
            <CardHeader className="flex flex-row items-center gap-4">
              <div
                className={cn(
                  'p-2.5 rounded-xl bg-gradient-to-br shadow-lg group-hover:scale-110 transition-transform',
                  gradient
                )}
              >
                <Icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-base font-display">{title}</CardTitle>
                <CardDescription className="font-body">{description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-xl border-border/50 hover:border-primary/30 hover:bg-primary/5 font-body"
                  onClick={() => onExport(id)}
                  disabled={generating === id}
                >
                  {generating === id ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {generating === id
                    ? 'Gerando...'
                    : exportFormat === 'excel'
                      ? 'Excel'
                      : exportFormat === 'pdf'
                        ? 'PDF'
                        : 'CSV'}
                </Button>
                {emailEnabled && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-border/50 hover:border-primary/30 hover:bg-primary/5 font-body"
                    onClick={() => onEmailOpen(id)}
                    aria-label={`Enviar ${title} por e-mail`}
                  >
                    <Mail className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
