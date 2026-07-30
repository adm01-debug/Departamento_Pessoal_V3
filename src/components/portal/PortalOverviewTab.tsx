import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Calendar, Clock, FileText, DollarSign,
  ChevronRight, Bell, CheckCircle2, AlertCircle, Edit,
  Gift, Megaphone, Bot, PenTool
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

const quickActions = [
  { label: 'Registrar Ponto', icon: Clock, path: '/ponto', gradient: 'from-primary to-primary-glow', desc: 'Entrada/saída do dia' },
  { label: 'Solicitar Férias', icon: Calendar, path: '/ferias', gradient: 'from-warning to-warning/70', desc: 'Programar período' },
  { label: 'Meus Documentos', icon: FileText, path: '/documentos', gradient: 'from-success to-success/70', desc: 'Enviar e consultar' },
  { label: 'Holerites', icon: DollarSign, path: '/holerites', gradient: 'from-primary/80 to-primary', desc: 'Consultar contracheques' },
  { label: 'Benefícios', icon: Gift, path: '/beneficios', gradient: 'from-info to-info/70', desc: 'Meus benefícios ativos' },
  { label: 'Assistente IA', icon: Bot, path: '/assistente-ia', gradient: 'from-primary-glow to-primary', desc: 'Tire suas dúvidas' },
  { label: 'Assinar Docs', icon: PenTool, path: '/assinaturas', gradient: 'from-warning to-primary', desc: 'Documentos pendentes' },
  { label: 'Comunicados', icon: Megaphone, path: '/comunicacao', gradient: 'from-info to-success', desc: 'Avisos e mural' },
];

interface PortalOverviewTabProps {
  nome: string;
  data: any;
  completude: number;
  navigate: (path: string) => void;
}

export function PortalOverviewTab({ nome, data, completude, navigate }: PortalOverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Profile + Completude */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border border-border/30 rounded-2xl overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-primary to-primary-glow" />
          <CardContent className="p-6 flex flex-col sm:flex-row gap-6 items-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center ring-4 ring-primary/20">
              <span className="text-2xl font-bold text-primary">{nome.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}</span>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl font-display font-bold">{nome}</h2>
              <p className="text-sm text-muted-foreground font-body">{data?.profile?.cargo || 'Colaborador'} • {data?.profile?.departamento || 'Geral'}</p>
              <div className="mt-3 max-w-xs">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Perfil completo</span><span>{completude}%</span>
                </div>
                <Progress value={completude} className="h-2" />
              </div>
            </div>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => navigate('/perfil')}>
              <Edit className="h-4 w-4 mr-1" />Editar Perfil
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Status Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {/* Ponto */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden h-full">
            <div className="h-[2px] bg-gradient-to-r from-primary to-primary-glow" />
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary-glow"><Clock className="h-4 w-4 text-primary-foreground" /></div>
                <h3 className="font-display font-semibold text-body">Ponto Hoje</h3>
              </div>
              {data?.pontoHoje ? (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-caption font-body"><span className="text-muted-foreground">Entrada</span><span className="font-semibold">{data.pontoHoje.entrada_1 || '—'}</span></div>
                  <div className="flex justify-between text-caption font-body"><span className="text-muted-foreground">Saída</span><span className="font-semibold">{data.pontoHoje.saida_1 || '—'}</span></div>
                  {data.pontoHoje.horas_trabalhadas && (
                    <div className="flex justify-between text-caption font-body pt-1 border-t border-border/30">
                      <span className="text-muted-foreground">Trabalhado</span>
                      <Badge variant="secondary" className="text-[10px]">{String(data.pontoHoje.horas_trabalhadas).slice(0, 5)}</Badge>
                    </div>
                  )}
                  {data.pontoHoje.atraso_minutos > 0 && (
                    <div className="flex justify-between text-caption font-body">
                      <span className="text-destructive">Atraso</span>
                      <Badge variant="destructive" className="text-[10px]">{data.pontoHoje.atraso_minutos} min</Badge>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-caption text-muted-foreground font-body">Nenhum registro hoje</p>
              )}
              <Button variant="outline" size="sm" onClick={() => navigate('/ponto')} className="w-full mt-3 rounded-lg font-body text-xs gap-1">
                Registrar Ponto <ChevronRight className="h-3 w-3" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Notificações */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden h-full">
            <div className="h-[2px] bg-gradient-to-r from-warning to-warning/70" />
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-warning to-warning/70"><Bell className="h-4 w-4 text-primary-foreground" /></div>
                <h3 className="font-display font-semibold text-body">Notificações</h3>
                {(data?.notificacoes?.length || 0) > 0 && <Badge className="ml-auto bg-warning text-warning-foreground text-[10px]">{data?.notificacoes?.length}</Badge>}
              </div>
              {data?.notificacoes && data.notificacoes.length > 0 ? (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {data.notificacoes.slice(0, 4).map((n: any) => (
                    <div key={n.id} className="flex items-start gap-2 text-caption">
                      <AlertCircle className="h-3 w-3 text-warning shrink-0 mt-0.5" />
                      <span className="font-body truncate">{n.titulo}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-caption text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-success" /><span className="font-body">Tudo em dia!</span>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={() => navigate('/notificacoes')} className="w-full mt-3 rounded-lg font-body text-xs gap-1">Ver todas <ChevronRight className="h-3 w-3" /></Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Férias */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden h-full">
            <div className="h-[2px] bg-gradient-to-r from-success to-success/70" />
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-success to-success/70"><Calendar className="h-4 w-4 text-primary-foreground" /></div>
                <h3 className="font-display font-semibold text-body">Férias</h3>
              </div>
              {data?.feriasPendentes && data.feriasPendentes.length > 0 ? (
                <div className="space-y-2">
                  {data.feriasPendentes.slice(0, 2).map((f: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-caption font-body">
                      <span className="text-muted-foreground">{format(parseISO(f.data_inicio), 'dd/MM')} - {format(parseISO(f.data_fim), 'dd/MM')}</span>
                      <Badge variant={f.status === 'aprovada' ? 'default' : 'outline'} className="text-[10px]">{f.status === 'aprovada' ? 'Aprovada' : 'Pendente'}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-caption text-muted-foreground font-body">Nenhuma solicitação</p>
              )}
              <Button variant="outline" size="sm" onClick={() => navigate('/ferias')} className="w-full mt-3 rounded-lg font-body text-xs gap-1">Solicitar Férias <ChevronRight className="h-3 w-3" /></Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Comunicados */}
      {data?.comunicados && data.comunicados.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border border-border/30 rounded-2xl overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-display">Comunicados Recentes</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.comunicados.map((c: any) => (
                <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/30 transition-colors cursor-pointer" onClick={() => navigate('/comunicacao')}>
                  <Badge variant="outline" className="text-[10px]">{c.tipo}</Badge>
                  <span className="text-sm font-body flex-1 truncate">{c.titulo}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-h3 font-display font-bold mb-4">Acesso Rápido</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {quickActions.map(({ label, icon: Icon, path, gradient, desc }, i) => (
            <motion.div key={path} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.04 }}>
              <Card className="group border border-border/30 hover:border-border/60 shadow-elevated hover:shadow-glow transition-all duration-300 cursor-pointer rounded-2xl overflow-hidden" onClick={() => navigate(path)}>
                <div className={cn("h-[2px] bg-gradient-to-r opacity-60 group-hover:opacity-100 transition-opacity", gradient)} />
                <CardContent className="flex items-center gap-3 p-4">
                  <div className={cn("p-2.5 rounded-xl bg-gradient-to-br shadow-lg group-hover:scale-110 transition-transform", gradient)}>
                    <Icon className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-semibold text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground font-body truncate">{desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
