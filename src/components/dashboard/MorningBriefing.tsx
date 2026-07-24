import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Sun, Moon, Sunset, Gift, Calendar, AlertTriangle, 
  CheckCircle2, Clock, UserPlus, UserMinus, FileText, 
  ChevronRight, Sparkles, Coffee, Database, Zap,
  Loader2, RefreshCw, Trash2, Bell, ShieldAlert
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { CardSkeleton } from '@/components/ui/module-skeleton';
import { edgeFunctionsService } from '@/services/edgeFunctionsService';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { useState } from 'react';

interface BriefingData {
  aniversariantes: { nome: string; dia: number }[];
  feriasPeriodo: { nome: string; inicio: string; fim: string }[];
  afastadosHoje: { nome: string; tipo: string }[];
  admissoesHoje: { nome: string; cargo: string }[];
  vencimentosHoje: { descricao: string; tipo: string }[];
  totalAtivos: number;
  pontosRegistradosHoje: number;
  esocialHealth: number;
}

function useMorningBriefing() {
  return useQuery<BriefingData>({
    queryKey: ['morning-briefing'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const hoje = new Date();
      const hojeStr = format(hoje, 'yyyy-MM-dd');
      const mesAtual = hoje.getMonth() + 1;
      const em7Dias = format(new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

      // Fire ALL queries in parallel
      const [
        { data: colabs },
        { data: feriasData },
        { data: afastData },
        { data: admData },
        { data: asoData },
        { count: totalAtivos },
        { count: pontosHoje },
        { data: esocialData },
      ] = await Promise.all([
        supabase.from('colaboradores').select('nome_completo, data_nascimento').eq('status', 'ativo').not('data_nascimento', 'is', null),
        supabase.from('ferias').select('data_inicio, data_fim, colaboradores!fk_ferias_colaborador(nome_completo)').in('status', ['aprovada', 'em_andamento']).lte('data_inicio', hojeStr).gte('data_fim', hojeStr),
        supabase.from('afastamentos').select('tipo, colaboradores!afastamentos_colaborador_id_fkey(nome_completo)').eq('status', 'ativo').lte('data_inicio', hojeStr).gte('data_fim_prevista', hojeStr),
        supabase.from('admissoes').select('nome, cargo').eq('data_prevista', hojeStr),
        supabase.from('exames').select('data_validade, tipo, colaboradores!exames_colaborador_id_fkey(nome_completo)').gte('data_validade', hojeStr).lte('data_validade', em7Dias),
        supabase.from('colaboradores').select('id', { count: 'exact', head: true }).eq('status', 'ativo'),
        supabase.from('batidas_ponto').select('id', { count: 'exact', head: true }).eq('data', hojeStr),
        supabase.from('esocial_eventos').select('status'),
      ]);

      const esocialEventos = esocialData || [];
      const esocialTotal = esocialEventos.length;
      const esocialErros = esocialEventos.filter((e: any) => e.status === 'erro').length;
      const esocialHealth = esocialTotal > 0 ? Math.round(((esocialTotal - esocialErros) / esocialTotal) * 100) : 100;

      const aniversariantes = (colabs || [])
        .filter(c => {
          if (!c.data_nascimento) return false;
          const d = parseISO(c.data_nascimento);
          return d.getMonth() + 1 === mesAtual;
        })
        .map(c => ({ nome: c.nome_completo, dia: parseISO(c.data_nascimento!).getDate() }))
        .sort((a, b) => a.dia - b.dia);

      const feriasPeriodo = (feriasData || []).map((f: any) => ({ nome: f.colaboradores?.nome_completo || 'Colaborador', inicio: f.data_inicio, fim: f.data_fim }));
      const afastadosHoje = (afastData || []).map((a: any) => ({ nome: a.colaboradores?.nome_completo || 'Colaborador', tipo: a.tipo }));
      const admissoesHoje = (admData || []).map(a => ({ nome: a.nome, cargo: a.cargo }));
      const vencimentosHoje = (asoData || []).map((a: any) => ({
        descricao: `Exame ${a.tipo} de ${a.colaboradores?.nome_completo || 'Colaborador'} - ${format(parseISO(a.data_validade), 'dd/MM')}`,
        tipo: 'exame',
      }));

      return {
        aniversariantes, feriasPeriodo, afastadosHoje, admissoesHoje, vencimentosHoje,
        totalAtivos: totalAtivos || 0, pontosRegistradosHoje: pontosHoje || 0,
        esocialHealth,
      };
    },
  });
}

function BriefingItem({ icon: Icon, label, count, gradient, onClick }: {
  icon: React.ElementType; label: string; count: number; gradient: string; onClick?: () => void;
}) {
  if (count === 0) return null;
  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-xl glass border border-border/30 hover:border-primary/30 transition-all w-full text-left group"
    >
      <div className={cn("p-2 rounded-xl bg-gradient-to-br shadow-lg", gradient)}>
        <Icon className="h-4 w-4 text-primary-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-body font-body font-medium truncate">{label}</p>
      </div>
      <Badge variant="secondary" className="font-display font-bold">{count}</Badge>
      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.button>
  );
}

export function MorningBriefing() {
  const { data, isLoading, error } = useMorningBriefing();
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleAction = async (id: string, fn: () => Promise<any>, successMsg: string) => {
    setRunningAction(id);
    try {
      await fn();
      toast.success(successMsg);
    } catch (err: any) {
      toast.error(safeErrorMessage(err, 'Erro ao executar ação.'));
    } finally {
      setRunningAction(null);
    }
  };
  const hoje = new Date();
  const hora = hoje.getHours();

  const TimeIcon = hora < 12 ? Sun : hora < 18 ? Sunset : Moon;
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';

  if (isLoading) return <CardSkeleton className="h-64" />;
  
  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-destructive flex items-center gap-2 text-base">
            <ShieldAlert className="h-5 w-5" />
            Erro de Esquema (Banco Externo)
          </CardTitle>
          <CardDescription className="text-destructive/80 font-mono text-xs">
            {(error as any).message}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Verifique se a tabela ou coluna existe no seu banco de dados externo.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const hasContent = data.aniversariantes.length > 0 || data.feriasPeriodo.length > 0 ||
    data.afastadosHoje.length > 0 || data.admissoesHoje.length > 0 || data.vencimentosHoje.length > 0;

  const aniversariantesHoje = data.aniversariantes.filter(a => a.dia === hoje.getDate());

  return (
    <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-primary-glow to-primary" />
      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-primary/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/4" />

      <CardHeader className="relative pb-2">
        <CardTitle className="flex items-center gap-3 text-h3 font-display">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary-glow shadow-glow">
            <Coffee className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <span>Painel de Comando</span>
            <p className="text-caption text-muted-foreground font-body font-normal mt-0.5">
              {format(hoje, "EEEE, dd 'de' MMMM", { locale: ptBR })} · {data.totalAtivos} colaboradores ativos
            </p>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="relative space-y-3">
        {/* Quick status bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="outline" className="gap-1.5 py-1.5 rounded-xl font-body">
            <Clock className="h-3 w-3" />
            {data.pontosRegistradosHoje} pontos registrados hoje
          </Badge>
          {data.feriasPeriodo.length > 0 && (
            <Badge variant="outline" className="gap-1.5 py-1.5 rounded-xl font-body text-warning border-warning/30">
              <Calendar className="h-3 w-3" />
              {data.feriasPeriodo.length} em férias
            </Badge>
          )}
          {data.afastadosHoje.length > 0 && (
            <Badge variant="outline" className="gap-1.5 py-1.5 rounded-xl font-body text-destructive border-destructive/30">
              <AlertTriangle className="h-3 w-3" />
              {data.afastadosHoje.length} afastados
            </Badge>
          )}
          <Badge variant="outline" className={cn("gap-1.5 py-1.5 rounded-xl font-body", data.esocialHealth < 90 ? "text-destructive border-destructive/30" : "text-success border-success/30")}>
            <ShieldAlert className="h-3 w-3" />
            Conformidade eSocial: {data.esocialHealth}%
          </Badge>
        </div>

        {/* Aniversariantes de hoje */}
        {aniversariantesHoje.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-primary/10 to-primary-glow/10 border border-primary/20"
          >
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary-glow">
              <Gift className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-body font-display font-semibold">🎉 Aniversariante{aniversariantesHoje.length > 1 ? 's' : ''} do dia!</p>
              <p className="text-caption text-muted-foreground font-body">
                {aniversariantesHoje.map(a => a.nome).join(', ')}
              </p>
            </div>
          </motion.div>
        )}

        {/* Briefing items */}
        <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
          <BriefingItem
            icon={UserPlus}
            label={`Admissões previstas hoje`}
            count={data.admissoesHoje.length}
            gradient="from-primary to-primary-glow"
            onClick={() => navigate('/admissoes')}
          />
          <BriefingItem
            icon={Calendar}
            label={`Colaboradores em férias`}
            count={data.feriasPeriodo.length}
            gradient="from-primary/80 to-primary"
            onClick={() => navigate('/ferias')}
          />
          <BriefingItem
            icon={AlertTriangle}
            label={`Afastamentos ativos`}
            count={data.afastadosHoje.length}
            gradient="from-destructive to-destructive/70"
            onClick={() => navigate('/afastamentos')}
          />
          <BriefingItem
            icon={FileText}
            label={`Exames vencendo em 7 dias`}
            count={data.vencimentosHoje.length}
            gradient="from-warning to-warning/70"
            onClick={() => navigate('/exames')}
          />
          <BriefingItem
            icon={Gift}
            label={`Aniversariantes do mês`}
            count={data.aniversariantes.length}
            gradient="from-primary-glow to-primary"
            onClick={() => navigate('/colaboradores')}
          />
        </div>

        <div className="pt-4 border-t border-border/20">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-3">Manutenção do Sistema</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!!runningAction}
              onClick={() => handleAction('alertas', edgeFunctionsService.dispararAlertasDP, 'Alertas DP disparados!')}
              className="rounded-xl h-auto py-2 flex-col gap-1 text-[10px] font-body"
            >
              {runningAction === 'alertas' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4 text-amber-500" />}
              <span>Alertas DP</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!!runningAction}
              onClick={() => handleAction('cache', () => edgeFunctionsService.cache({ action: 'invalidate' }), 'Cache limpo!')}
              className="rounded-xl h-auto py-2 flex-col gap-1 text-[10px] font-body"
            >
              {runningAction === 'cache' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 text-primary" />}
              <span>Limpar Cache</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!!runningAction}
              onClick={() => handleAction('limpeza', edgeFunctionsService.limpezaDados, 'Limpeza concluída!')}
              className="rounded-xl h-auto py-2 flex-col gap-1 text-[10px] font-body"
            >
              {runningAction === 'limpeza' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
              <span>Limpeza</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!!runningAction}
              onClick={() => handleAction('health', edgeFunctionsService.healthcheck, 'Sistema saudável!')}
              className="rounded-xl h-auto py-2 flex-col gap-1 text-[10px] font-body"
            >
              {runningAction === 'health' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4 text-success" />}
              <span>Saúde</span>
            </Button>
          </div>
        </div>

        {!hasContent && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-success/20 to-finance/10 mb-3">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <p className="font-display font-semibold">Tudo tranquilo hoje!</p>
            <p className="text-caption text-muted-foreground font-body mt-1">Nenhuma pendência ou evento para hoje</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
