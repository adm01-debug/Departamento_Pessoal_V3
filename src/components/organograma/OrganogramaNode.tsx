import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Mail, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrganogramaNodeProps {
  node: any;
  level?: number;
}

function getInitials(name: string) {
  return name?.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
}

export function OrganogramaNode({ node, level = 0 }: OrganogramaNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level < 1);
  const hasChildren = node.sub_departamentos?.length > 0 || node.colaboradores?.length > 0;

  return (
    <div className={cn("flex flex-col gap-2", level > 0 && "ml-6 border-l border-border/40 pl-4 py-2")}>
      <Card 
        className={cn(
          "border border-border/30 rounded-2xl overflow-hidden transition-all hover:shadow-md",
          isExpanded ? "shadow-xs bg-accent/5" : "bg-card"
        )}
      >
        <CardContent className="p-3">
          <div 
            className="flex items-center gap-3 cursor-pointer" 
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className={cn(
              "p-2 rounded-xl shrink-0",
              level === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              <Building2 className="h-4 w-4" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-sm truncate">{node.nome}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-medium border-border/50">
                  {node.colaboradores?.length || 0} colaboradores
                </Badge>
                {node.sub_departamentos?.length > 0 && (
                  <Badge className="text-[10px] h-4 px-1.5 bg-info/10 text-info border-0">
                    {node.sub_departamentos.length} sub-deptos
                  </Badge>
                )}
              </div>
            </div>

            {hasChildren && (
              <div className="text-muted-foreground">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </div>
            )}
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                {/* Colaboradores do Departamento */}
                {node.colaboradores?.length > 0 && (
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {node.colaboradores.map((col: any) => (
                      <div key={col.id} className="flex items-center gap-2 p-2 rounded-xl bg-background border border-border/20">
                        <Avatar className="h-8 w-8 border border-border/30">
                          <AvatarImage src={col.foto_url} />
                          <AvatarFallback className="text-[10px] bg-primary/5 text-primary font-bold">
                            {getInitials(col.nome_completo)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold truncate leading-tight">{col.nome_completo}</p>
                          <p className="text-[9px] text-muted-foreground truncate uppercase tracking-tighter">{col.cargo || 'Membro'}</p>
                        </div>
                        {col.email && (
                          <a href={`mailto:${col.email}`} className="text-muted-foreground hover:text-primary transition-colors">
                            <Mail className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Sub-departamentos (Recursivo) */}
                {node.sub_departamentos?.length > 0 && (
                  <div className="mt-3 flex flex-col gap-2">
                    {node.sub_departamentos.map((sub: any) => (
                      <OrganogramaNode key={sub.id} node={sub} level={level + 1} />
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}
