import { PageTitle } from '@/components/PageTitle';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';
import {
  Palette, Type, Square, Layers, Zap, Sun, Moon,
  ArrowLeft, Users, DollarSign, Calendar, Clock,
  Gift, Star, Award, Flame, TrendingUp, Check,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const colorTokens = [
  { name: 'Primary', var: '--primary', class: 'bg-primary', text: 'text-primary' },
  { name: 'Primary Glow', var: '--primary-glow', class: 'bg-primary-glow', text: 'text-primary-glow' },
  { name: 'Success', var: '--success', class: 'bg-success', text: 'text-success' },
  { name: 'Warning', var: '--warning', class: 'bg-warning', text: 'text-warning' },
  { name: 'Destructive', var: '--destructive', class: 'bg-destructive', text: 'text-destructive' },
  { name: 'Info', var: '--info', class: 'bg-info', text: 'text-info' },
  { name: 'Muted', var: '--muted', class: 'bg-muted', text: 'text-muted-foreground' },
  { name: 'Accent', var: '--accent', class: 'bg-accent', text: 'text-accent-foreground' },
];

const gamificationColors = [
  { name: 'XP', class: 'bg-xp', glow: 'shadow-glow-xp' },
  { name: 'Coins', class: 'bg-coins', glow: 'shadow-glow-coins' },
  { name: 'Streak', class: 'bg-streak', glow: 'shadow-glow-streak' },
  { name: 'Level', class: 'bg-level', glow: 'shadow-glow-info' },
];

const moduleGradients = [
  { name: 'Dashboard', gradient: 'from-primary to-primary-glow', icon: Zap },
  { name: 'Colaboradores', gradient: 'from-primary to-primary-glow', icon: Users },
  { name: 'Folha', gradient: 'from-primary-glow to-primary', icon: DollarSign },
  { name: 'Férias', gradient: 'from-primary-glow to-primary', icon: Calendar },
  { name: 'Ponto', gradient: 'from-primary/60 to-primary/90', icon: Clock },
  { name: 'Benefícios', gradient: 'from-xp to-store', icon: Gift },
];

const statuses = ['ativo', 'inativo', 'ferias', 'afastado', 'desligado', 'pendente', 'aprovado', 'rejeitado', 'processando'];

function Section({ title, icon: Icon, children, delay = 0 }: {
  title: string; icon: React.ElementType; children: React.ReactNode; delay?: number;
}) {
  return (
    <>
    <PageTitle title="Design System" description="Componentes e tokens do design system" />
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <h2 className="flex items-center gap-2.5 text-xl font-display font-bold mb-4">
        <div className="p-2 rounded-xl gradient-primary">
          <Icon className="h-5 w-5 text-primary-foreground" />
        </div>
        {title}
      </h2>
      {children}
    </motion.div>
    </>
  );
}

export default function DesignSystemPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-10 max-w-[1200px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <Button variant="ghost" size="icon" aria-label="Voltar" onClick={() => navigate('/dashboard')} className="rounded-xl">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Design System</h1>
          <p className="text-muted-foreground font-body mt-1">Task Gifts — Living Styleguide</p>
        </div>
      </motion.div>

      {/* ═══ COLORS ═══ */}
      <Section title="Cores Semânticas" icon={Palette} delay={0.1}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {colorTokens.map(c => (
            <div key={c.name} className="space-y-2">
              <div className={cn('h-20 rounded-2xl shadow-card border border-border/20', c.class)} />
              <div>
                <p className="text-sm font-body font-semibold">{c.name}</p>
                <p className="text-[11px] text-muted-foreground font-mono">{c.var}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Gamification Colors */}
      <Section title="Gamificação" icon={Star} delay={0.15}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {gamificationColors.map(c => (
            <div key={c.name} className="space-y-2">
              <div className={cn('h-20 rounded-2xl', c.class, c.glow)} />
              <p className="text-sm font-body font-semibold">{c.name}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Module Gradients */}
      <Section title="Gradientes de Módulos" icon={Layers} delay={0.2}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {moduleGradients.map(g => {
            const Icon = g.icon;
            return (
              <div key={g.name} className={cn('h-24 rounded-2xl bg-gradient-to-r flex items-center gap-3 px-5 shadow-elevated', g.gradient)}>
                <Icon className="h-6 w-6 text-primary-foreground" />
                <span className="text-primary-foreground font-display font-bold">{g.name}</span>
              </div>
            );
          })}
        </div>
      </Section>

      {/* ═══ TYPOGRAPHY ═══ */}
      <Section title="Tipografia" icon={Type} delay={0.25}>
        <Card variant="elevated">
          <CardContent className="p-6 space-y-6">
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground font-body uppercase tracking-wider">Display — Outfit</p>
              <h1 className="text-4xl font-display font-bold tracking-tight">Heading 1 — Display Bold</h1>
              <h2 className="text-3xl font-display font-semibold">Heading 2 — Display Semibold</h2>
              <h3 className="text-2xl font-display font-medium">Heading 3 — Display Medium</h3>
              <h4 className="text-xl font-display font-medium">Heading 4 — Display Medium</h4>
            </div>
            <div className="border-t border-border/30 pt-4 space-y-2">
              <p className="text-xs text-muted-foreground font-body uppercase tracking-wider">Body — Plus Jakarta Sans</p>
              <p className="text-base font-body">Body Regular — The quick brown fox jumps over the lazy dog.</p>
              <p className="text-base font-body font-medium">Body Medium — The quick brown fox jumps over the lazy dog.</p>
              <p className="text-base font-body font-semibold">Body Semibold — The quick brown fox jumps over the lazy dog.</p>
              <p className="text-sm font-body text-muted-foreground">Caption — Texto auxiliar e descrições.</p>
              <p className="text-xs font-body uppercase tracking-wider text-muted-foreground">Overline — LABEL STYLE</p>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* ═══ BUTTONS ═══ */}
      <Section title="Botões" icon={Square} delay={0.3}>
        <Card variant="elevated">
          <CardContent className="p-6 space-y-6">
            <div>
              <p className="text-xs text-muted-foreground font-body uppercase tracking-wider mb-3">Variants</p>
              <div className="flex flex-wrap gap-3">
                <Button variant="default">Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="link">Link</Button>
              </div>
            </div>
            <div className="border-t border-border/30 pt-4">
              <p className="text-xs text-muted-foreground font-body uppercase tracking-wider mb-3">Premium Variants</p>
              <div className="flex flex-wrap gap-3">
                <Button variant="premium">Premium</Button>
                <Button variant="gradient-xp">Gradient XP</Button>
                <Button variant="gradient-success">Gradient Success</Button>
                <Button variant="glass">Glass</Button>
              </div>
            </div>
            <div className="border-t border-border/30 pt-4">
              <p className="text-xs text-muted-foreground font-body uppercase tracking-wider mb-3">Sizes</p>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="xl">Extra Large</Button>
                <Button size="icon" aria-label="Ação"><Zap className="h-4 w-4" /></Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* ═══ CARDS ═══ */}
      <Section title="Cards" icon={Layers} delay={0.35}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card variant="default">
            <CardHeader><CardTitle className="text-base">Default</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground font-body">Card padrão com shadow-card.</p></CardContent>
          </Card>
          <Card variant="elevated">
            <CardHeader><CardTitle className="text-base">Elevated</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground font-body">Sombra elevada com hover float.</p></CardContent>
          </Card>
          <Card variant="glass">
            <CardHeader><CardTitle className="text-base">Glass</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground font-body">Glassmorphism com blur.</p></CardContent>
          </Card>
          <Card variant="flat">
            <CardHeader><CardTitle className="text-base">Flat</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground font-body">Sem sombra, borda sutil.</p></CardContent>
          </Card>
          <Card variant="interactive">
            <CardHeader><CardTitle className="text-base">Interactive</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground font-body">Hover com lift e glow.</p></CardContent>
          </Card>
          <Card variant="gradient" gradient="from-primary to-primary-glow">
            <CardHeader className="relative"><CardTitle className="text-base">Gradient</CardTitle></CardHeader>
            <CardContent className="relative"><p className="text-sm text-muted-foreground font-body">Top border com gradiente.</p></CardContent>
          </Card>
        </div>
      </Section>

      {/* ═══ BADGES ═══ */}
      <Section title="Badges" icon={Award} delay={0.4}>
        <Card variant="elevated">
          <CardContent className="p-6 space-y-6">
            <div>
              <p className="text-xs text-muted-foreground font-body uppercase tracking-wider mb-3">Semantic</p>
              <div className="flex flex-wrap gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="info">Info</Badge>
              </div>
            </div>
            <div className="border-t border-border/30 pt-4">
              <p className="text-xs text-muted-foreground font-body uppercase tracking-wider mb-3">Gamification</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="xp">+100 XP</Badge>
                <Badge variant="coins">50 Coins</Badge>
                <Badge variant="streak">🔥 7 dias</Badge>
                <Badge variant="gradient">Premium</Badge>
                <Badge variant="gradient-xp">Level Up</Badge>
              </div>
            </div>
            <div className="border-t border-border/30 pt-4">
              <p className="text-xs text-muted-foreground font-body uppercase tracking-wider mb-3">Sizes</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge size="sm">Small</Badge>
                <Badge size="default">Default</Badge>
                <Badge size="lg">Large</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* ═══ STATUS BADGES ═══ */}
      <Section title="Status Badges" icon={Check} delay={0.45}>
        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-3">
              {statuses.map(s => (
                <StatusBadge key={s} status={s} pulse={s === 'ativo' || s === 'processando'} />
              ))}
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* ═══ SHADOWS ═══ */}
      <Section title="Sombras" icon={Layers} delay={0.5}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { name: 'card', class: 'shadow-card' },
            { name: 'elevated', class: 'shadow-elevated' },
            { name: 'glass', class: 'shadow-glass' },
            { name: 'float', class: 'shadow-float' },
            { name: 'glow', class: 'shadow-glow' },
            { name: 'glow-sm', class: 'shadow-glow-sm' },
            { name: 'glow-lg', class: 'shadow-glow-lg' },
            { name: 'elegant', class: 'shadow-elegant' },
          ].map(s => (
            <div key={s.name} className={cn('h-24 rounded-2xl bg-card border border-border/20 flex items-center justify-center', s.class)}>
              <p className="text-xs font-mono text-muted-foreground">{s.name}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ═══ ANIMATIONS ═══ */}
      <Section title="Animações" icon={Flame} delay={0.55}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { name: 'fade-in', class: 'animate-fade-in' },
            { name: 'slide-up', class: 'animate-slide-up' },
            { name: 'scale-in', class: 'animate-scale-in' },
            { name: 'bounce-in', class: 'animate-bounce-in' },
            { name: 'float', class: 'animate-float' },
            { name: 'glow-pulse', class: 'animate-glow-pulse' },
            { name: 'pop', class: 'animate-pop' },
            { name: 'wiggle', class: 'animate-wiggle' },
          ].map(a => (
            <div key={a.name} className="h-24 rounded-2xl bg-card border border-border/20 flex items-center justify-center">
              <div className={cn('h-10 w-10 rounded-xl bg-primary', a.class)} />
              <p className="text-[10px] font-mono text-muted-foreground ml-2">{a.name}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
