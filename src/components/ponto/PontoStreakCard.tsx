import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, CheckCircle2, XCircle, Timer, Target } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts';
import { motion } from 'framer-motion';
import { formatDateLocalISO } from '@/utils/dateLocal';

export function PontoStreakCard() {
  const { user } = useAuth();

  const { data: registros30d = [] } = useQuery({
    queryKey: ['registros-ponto-30d', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: colab } = await supabase.from('colaboradores').select('id').eq('email', user.email || '').maybeSingle();
      if (!colab) return [];
      const d = new Date();
      d.setDate(d.getDate() - 30);
      const { data, error } = await (supabase as any)
        .from('registros_ponto')
        .select('data, atraso_minutos, horas_trabalhadas, entrada_1')
        .eq('colaborador_id', colab.id)
        .gte('data', formatDateLocalISO(d))
        .order('data', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id});

  const stats = useMemo(() => {
    let pontual = 0, atrasado = 0, ausente = 0, bestStreak = 0, tempStreak = 0;

    const sorted = [...registros30d].sort((a: any, b: any) => a.data.localeCompare(b.data));
    sorted.forEach((r: any) => {
      if (!r.entrada_1) {
        ausente++;
        tempStreak = 0;
      } else if (r.atraso_minutos > 0) {
        atrasado++;
        tempStreak = 0;
      } else {
        pontual++;
        tempStreak++;
        if (tempStreak > bestStreak) bestStreak = tempStreak;
      }
    });
    const currentStreak = tempStreak;

    const total = pontual + atrasado;
    const taxa = total > 0 ? (pontual / total) * 100 : 0;

    const level = Math.floor(pontual / 10) + 1;
    const xp = (pontual % 10) * 10;

    return { pontual, atrasado, ausente, currentStreak, bestStreak, taxa, level, xp };

  }, [registros30d]);

  return (
    <div className="space-y-6">
      {/* Streak Card */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden">
          <div className="h-[2px] bg-gradient-to-r from-warning to-streak" />
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Flame className="h-4 w-4 text-warning" /> Streak de Pontualidade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <span className="text-xl font-display font-bold text-primary">Lvl {stats.level}</span>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Progresso do Nível</p>
                  <p className="text-[9px] text-muted-foreground">{stats.xp}% para o próximo nível</p>
                </div>
              </div>
              <Badge variant="outline" className="border-warning/30 text-warning bg-warning/5 font-display">
                PRO PLAYER
              </Badge>
            </div>
            <Progress value={stats.xp} className="h-1.5 mb-6" />

            <div className="text-center relative">
              <motion.div 
                animate={{ scale: [1, 1.1, 1] }} 
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-4 -right-2 opacity-20"
              >
                <Flame className="h-12 w-12 text-warning fill-warning" />
              </motion.div>
              <p className="text-5xl font-display font-bold text-warning">{stats.currentStreak}</p>
              <p className="text-sm text-muted-foreground font-body mt-1">dias consecutivos</p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/20">
              <div className="text-center">
                <p className="text-2xl font-display font-bold">{stats.bestStreak}</p>
                <p className="text-xs text-muted-foreground font-body">Melhor streak</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-display font-bold">{stats.pontual}</p>
                <p className="text-xs text-muted-foreground font-body">Dias pontuais</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-body">
                <span>Próximo bônus</span>
                <span className="text-warning font-medium">{5 - (stats.currentStreak % 5)} dias</span>
              </div>
              <Progress value={(stats.currentStreak % 5) * 20} className="h-2" />
              <p className="text-xs text-muted-foreground font-body text-center">Bônus a cada 5 dias consecutivos</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Overview */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: CheckCircle2, label: 'Pontuais', value: stats.pontual, color: 'text-success', bg: 'bg-success/10' },
            { icon: Timer, label: 'Atrasados', value: stats.atrasado, color: 'text-warning', bg: 'bg-warning/10' },
            { icon: XCircle, label: 'Ausências', value: stats.ausente, color: 'text-destructive', bg: 'bg-destructive/10' },
            { icon: Target, label: 'Taxa %', value: `${stats.taxa.toFixed(0)}%`, color: 'text-info', bg: 'bg-info/10' },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <Card key={label} className="border border-border/30 shadow-xs rounded-xl overflow-hidden">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${bg}`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                  <div>
                    <p className="text-xl font-display font-bold tracking-tight">{value}</p>
                    <p className="text-[10px] text-muted-foreground font-body">{label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
