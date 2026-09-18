import { PageTitle } from '@/components/PageTitle';
import { useState, useRef, useEffect } from 'react';
import { PageLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bot, Send, Loader2, Calculator,
  Calendar, FileText, Scale, HelpCircle, Trash2, WifiOff, AlertCircle,
  Lightbulb, ChevronRight, Paperclip, Info, History, Clock, BookOpen, Cloud, Percent, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { cardVariants } from '@/components/dashboard/MetricCard';
import { useAuth } from '@/contexts/AuthContext';
import {
  assistenteIAService,
  type ChatMessage,
  type AssistenteIAError,
} from '@/services/assistenteIAService';
import { toast } from 'sonner';

interface Message extends ChatMessage {}

type TopicColor = 'emerald' | 'blue' | 'purple' | 'teal' | 'slate' | 'orange';

// Usa as cores semânticas do design system (definidas em index.css) em vez de
// tons genéricos do Tailwind, para os ícones ficarem consistentes com o resto
// do produto (badges de status, gráficos, etc.).
const COLOR_STYLES: Record<TopicColor, { bg: string; text: string }> = {
  emerald: { bg: 'bg-primary/15', text: 'text-primary' },
  blue: { bg: 'bg-info/15', text: 'text-info' },
  purple: { bg: 'bg-[hsl(var(--chart-4)/0.15)]', text: 'text-[hsl(var(--chart-4))]' },
  teal: { bg: 'bg-[hsl(var(--chart-2)/0.15)]', text: 'text-[hsl(var(--chart-2))]' },
  slate: { bg: 'bg-muted', text: 'text-muted-foreground' },
  orange: { bg: 'bg-warning/15', text: 'text-warning' },
};

const SUGGESTED_QUESTIONS: { icon: typeof Calculator; color: TopicColor; text: string }[] = [
  { icon: Calculator, color: 'emerald', text: 'Como calcular rescisão de um funcionário com 3 anos de CLT?' },
  { icon: Calendar, color: 'blue', text: 'Quantos dias de férias um funcionário com 10 faltas tem direito?' },
  { icon: Scale, color: 'purple', text: 'Quais os percentuais de INSS e IRRF para 2026?' },
  { icon: FileText, color: 'teal', text: 'Quais eventos do eSocial devo enviar na admissão?' },
  { icon: HelpCircle, color: 'slate', text: 'Como funciona o aviso prévio proporcional?' },
  { icon: Clock, color: 'orange', text: 'Qual o prazo para pagamento das verbas rescisórias?' },
];

const QUICK_TOPICS: { icon: typeof BookOpen; color: TopicColor; label: string; text: string }[] = [
  { icon: BookOpen, color: 'emerald', label: 'CLT', text: 'Quais são os principais direitos garantidos pela CLT?' },
  { icon: Calculator, color: 'emerald', label: 'Cálculos', text: 'Como calcular verbas rescisórias?' },
  { icon: Cloud, color: 'blue', label: 'eSocial', text: 'Quais eventos do eSocial devo enviar na admissão?' },
  { icon: Calendar, color: 'teal', label: 'Férias', text: 'Como funciona o cálculo de férias proporcionais?' },
  { icon: Percent, color: 'orange', label: 'INSS', text: 'Quais os percentuais de INSS e IRRF para 2026?' },
];

const MotionCard = motion.create(Card);

export default function AssistenteIAPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text: string) => {
    // P5-081: validação client-side antes de enviar
    const validation = assistenteIAService.validateMessage(text);
    if (!validation.ok) {
      toast.warning(validation.reason);
      return;
    }
    if (!user) {
      toast.error('Faça login para usar o assistente.');
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // P5-081: Usa serviço com timeout 30s, cancelamento automático,
      // retry em 401 e parse seguro de resposta
      const data = await assistenteIAService.sendMessage({
        message: text.trim(),
        history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
      });

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        latencyMs: undefined,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: unknown) {
      const iaErr = err as AssistenteIAError;
      if (iaErr?.code === 'CANCELLED') return; // cancelado por novo request — silencioso

      const icon = iaErr?.code === 'NETWORK' || iaErr?.code === 'TIMEOUT'
        ? <WifiOff className="h-4 w-4" />
        : <AlertCircle className="h-4 w-4" />;

      toast.error(iaErr?.message ?? 'Erro ao processar pergunta.', {
        icon,
        duration: 5000,
      });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
    <PageTitle title="Assistente IA" description="Assistente inteligente do Departamento Pessoal" />
    <PageLayout
      title="Assistente IA do DP"
      description="Tire dúvidas trabalhistas, calcule valores e consulte a legislação"
      icon={<Bot className="h-5 w-5 text-primary-foreground" />}
      gradient="from-primary to-primary-glow"
      className="flex flex-col min-h-full pb-8 box-border"
    >
      <div className="grid gap-3 grid-cols-1 lg:grid-cols-4 min-h-0">
        {/* Chat area */}
        <MotionCard
          custom={0}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="lg:col-span-3 border-2 border-border/70 shadow-elevated rounded-2xl overflow-hidden flex flex-col min-h-0"
        >
          <div className="h-[2px] bg-gradient-to-r from-primary to-primary-glow" />

          {/* Messages */}
          {messages.length === 0 ? (
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center p-3">
              <div className="flex flex-col items-center justify-center text-center">
                <motion.div
                  custom={0}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  className="relative p-4 rounded-2xl bg-primary/10 border border-primary/15 mb-3"
                >
                  {/* Camada de brilho: só anima `opacity` (compositor-only) em vez de
                      `box-shadow` (força paint a cada frame), evitando a travada
                      percebida quando roda junto com a entrada em cascata dos cards. */}
                  <motion.div
                    className="absolute -inset-3 rounded-3xl bg-primary/50 blur-xl -z-10"
                    animate={{ opacity: [0.25, 0.6, 0.25] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <Bot className="h-10 w-10 text-primary relative" />
                  <Sparkles className="h-5 w-5 text-primary absolute -top-2 -right-2 fill-primary/30 z-10" />
                </motion.div>
                <motion.h2
                  custom={1}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  className="text-h2 font-display font-medium mb-1.5"
                >
                  Olá! Sou o Assistente DP
                </motion.h2>
                <motion.p
                  custom={2}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  className="text-body text-muted-foreground font-body max-w-md mb-3"
                >
                  Posso ajudar com dúvidas trabalhistas, cálculos de rescisão, férias, INSS, IRRF e muito mais.
                </motion.p>
                <div className="grid gap-1.5 grid-cols-1 sm:grid-cols-2 max-w-lg w-full">
                  {SUGGESTED_QUESTIONS.slice(0, 4).map(({ icon: Icon, color, text }, i) => {
                    const style = COLOR_STYLES[color];
                    return (
                      <motion.button
                        key={i}
                        custom={3 + i}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        whileHover={{ scale: 1.02 }}
                        onClick={() => sendMessage(text)}
                        className="flex items-center gap-2.5 p-2 rounded-2xl glass border border-border/30 hover:border-primary/30 text-left text-xs font-body transition-all group"
                      >
                        <div className={cn('p-1.5 rounded-lg shrink-0', style.bg)}>
                          <Icon className={cn('h-3.5 w-3.5', style.text)} />
                        </div>
                        <span className="text-muted-foreground flex-1 leading-snug">{text}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                      </motion.button>
                    );
                  })}
                </div>

                <motion.div
                  custom={7}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  className="flex flex-nowrap items-center justify-center gap-2 mt-3 max-w-full overflow-x-auto no-scrollbar px-1"
                >
                  <span className="text-xs text-muted-foreground font-body mr-1 shrink-0">Posso te ajudar com:</span>
                  {QUICK_TOPICS.map(({ icon: Icon, color, label, text }, i) => {
                    const style = COLOR_STYLES[color];
                    return (
                      <button
                        key={label}
                        onClick={() => sendMessage(text)}
                        className="flex items-center gap-1.5 pl-1.5 pr-3 py-1 rounded-full border border-border/30 bg-card/50 hover:border-primary/30 transition-colors text-xs font-body font-medium shrink-0 whitespace-nowrap"
                      >
                        <span className={cn('p-1 rounded-full', style.bg)}>
                          <Icon className={cn('h-3 w-3', style.text)} />
                        </span>
                        {label}
                      </button>
                    );
                  })}
                </motion.div>
              </div>
            </div>
          ) : (
            <ScrollArea className="flex-1 min-h-0 p-4" ref={scrollRef as any}>
              <div className="space-y-4 max-w-3xl mx-auto">
                <AnimatePresence>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        'flex gap-3',
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {msg.role === 'assistant' && (
                        <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary-glow shrink-0 h-fit">
                          <Bot className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}
                      <div
                        className={cn(
                          'max-w-[75%] rounded-2xl px-4 py-3 text-body font-body',
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-muted/50 border border-border/30 rounded-bl-md'
                        )}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        <p className={cn(
                          'text-[10px] mt-1.5',
                          msg.role === 'user' ? 'text-primary-foreground/50' : 'text-muted-foreground/50'
                        )}>
                          {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {loading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary-glow">
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-muted/50 border border-border/30 rounded-bl-md">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground font-body">Pensando...</span>
                    </div>
                  </motion.div>
                )}
              </div>
            </ScrollArea>
          )}

          {/* Input */}
          <div className="border-t border-border/30 p-3 shrink-0">
            <div className="max-w-3xl mx-auto w-full">
              <form
                onSubmit={handleSubmit}
                className="flex items-center gap-2 p-1.5 rounded-2xl border-2 border-border/70 bg-background/60 shadow-xs focus-within:border-primary/50 transition-colors"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled
                  title="Anexar arquivo (em breve)"
                  className="h-11 w-11 rounded-xl shrink-0 text-muted-foreground"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Pergunte sobre CLT, cálculos, eSocial..."
                  disabled={loading}
                  className="flex-1 h-11 rounded-xl border-0 bg-background focus-visible:ring-0 font-body shadow-none"
                />
                <Button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="h-11 px-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-glow shrink-0 disabled:opacity-100 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
              <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/70 font-body mt-1.5">
                <Info className="h-3 w-3" />
                O assistente pode cometer erros. Sempre valide as informações importantes.
              </p>
            </div>
          </div>
        </MotionCard>

        {/* Sidebar - Suggestions */}
        <div className="hidden lg:flex flex-col gap-3">
          <MotionCard
            custom={1}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden flex flex-col"
          >
            <div className="h-[2px] bg-gradient-to-r from-primary/60 to-primary shrink-0" />
            <CardContent className="p-3 flex flex-col">
              <motion.h3
                custom={0}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="text-h3 font-display font-semibold flex items-center gap-2 shrink-0"
              >
                <Lightbulb className="h-4 w-4 text-primary" />
                Sugestões
              </motion.h3>
              <motion.p
                custom={1}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="text-xs text-muted-foreground font-body mb-1.5 mt-0.5 shrink-0"
              >
                Clique em uma sugestão para começar
              </motion.p>

              <div className="space-y-1.5">
                {SUGGESTED_QUESTIONS.map(({ icon: Icon, color, text }, i) => {
                  const style = COLOR_STYLES[color];
                  return (
                    <motion.button
                      key={i}
                      custom={2 + i}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      onClick={() => sendMessage(text)}
                      className="flex items-center gap-3 p-2 rounded-2xl bg-muted/25 border border-border/30 hover:border-primary/30 hover:bg-muted/40 text-left text-sm font-body transition-all w-full group"
                    >
                      <div className={cn('p-2 rounded-xl shrink-0', style.bg)}>
                        <Icon className={cn('h-4 w-4', style.text)} />
                      </div>
                      <span className="text-muted-foreground group-hover:text-foreground font-body transition-colors leading-snug flex-1">{text}</span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
                    </motion.button>
                  );
                })}
              </div>

              <motion.div
                custom={8}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="flex items-center justify-center gap-2 pt-2.5 mt-2 border-t border-border/20 shrink-0"
              >
                <button
                  type="button"
                  onClick={() => toast.info('Histórico de conversas em breve.')}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-border/40 bg-muted/25 hover:border-primary/40 hover:bg-primary/10 hover:text-primary text-xs text-muted-foreground font-body transition-colors"
                >
                  <History className="h-3.5 w-3.5" />
                  Histórico
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (messages.length === 0) {
                      toast.info('Não há conversa para limpar.');
                      return;
                    }
                    setMessages([]);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-border/40 bg-muted/25 hover:border-primary/40 hover:bg-primary/10 hover:text-primary text-xs text-muted-foreground font-body transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Limpar conversa
                </button>
              </motion.div>
            </CardContent>
          </MotionCard>
        </div>
      </div>
    </PageLayout>
    </>
  );
}
