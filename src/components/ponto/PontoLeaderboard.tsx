import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Star, TrendingUp, Users } from 'lucide-react';
import { motion } from 'framer-motion';

const MOCK_LEADERBOARD = [
  { id: 1, name: 'Ana Silva', score: 98, streak: 12, rank: 1, avatar: null },
  { id: 2, name: 'João Santos', score: 95, streak: 8, rank: 2, avatar: null },
  { id: 3, name: 'Maria Oliveira', score: 92, streak: 15, rank: 3, avatar: null },
  { id: 4, name: 'Ricardo Costa', score: 89, streak: 4, rank: 4, avatar: null },
  { id: 5, name: 'Luciana Lima', score: 87, streak: 6, rank: 5, avatar: null },
];

export function PontoLeaderboard() {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
      <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden bg-gradient-to-br from-card to-accent/5">
        <div className="h-[2px] bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400" />
        <CardHeader className="pb-2">
          <CardTitle className="font-display flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" /> Ranking de Assiduidade
            </div>
            <Badge variant="secondary" className="text-[9px] font-bold">MÊS ATUAL</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 mb-4">
            <div className="p-2 bg-yellow-500/20 rounded-full text-yellow-600">
              <Star className="h-5 w-5 fill-yellow-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-yellow-700">Gamificação Ativa</p>
              <p className="text-[10px] text-yellow-600/80 leading-tight">Ganhe pontos por bater o ponto no horário e manter seu streak!</p>
            </div>
          </div>

          <div className="space-y-2">
            {MOCK_LEADERBOARD.map((user, index) => (
              <div key={user.id} className="flex items-center justify-between p-2.5 rounded-xl bg-background/50 border border-border/40 hover:border-primary/20 transition-all group">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-lg font-display font-bold text-xs bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {user.rank}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                      {user.name[0]}
                    </div>
                    <div>
                      <p className="text-xs font-bold">{user.name}</p>
                      <p className="text-[9px] text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="h-2 w-2" /> {user.streak} dias de streak
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-display font-bold text-primary">{user.score}%</p>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase">Score</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="pt-2 text-center">
            <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1 font-medium">
              <Users className="h-3 w-3" /> Você está na 14ª posição entre 42 colaboradores
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
