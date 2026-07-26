import { PageTitle } from '@/components/PageTitle';
import { useState, useRef, useEffect } from 'react';
import { PageLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bot, Send, Loader2, Sparkles, Calculator,
  Calendar, FileText, Scale, HelpCircle, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SUGGESTED_QUESTIONS = [
  { icon: Calculator, text: 'Como calcular rescisão de um funcionário com 3 anos de CLT?' },
  { icon: Calendar, text: 'Quantos dias de férias um funcionário com 10 faltas tem direito?' },
  { icon: Scale, text: 'Quais os percentuais de INSS e IRRF para 2026?' },
  { icon: FileText, text: 'Quais eventos do eSocial devo enviar na admissão?' },
  { icon: HelpCircle, text: 'Como funciona o aviso prévio proporcional?' },
  { icon: Calendar, text: 'Qual o prazo para pagamento das verbas rescisórias?' },
];

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
    if (!text.trim() || loading) return;

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
      const { data, error } = await supabase.functions.invoke('assistente-ia', {
        body: {
          message: text.trim(),
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data?.response || 'Desculpe, não consegui processar sua pergunta. Tente novamente.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '⚠️ Erro ao processar sua pergunta. Verifique sua conexão e tente novamente.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
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
    >
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-4 h-[calc(100vh-220px)] min-h-[500px]">
        {/* Chat area */}
        <Card className="lg:col-span-3 border border-border/30 shadow-elevated rounded-2xl overflow-hidden flex flex-col">
          <div className="h-[2px] bg-gradient-to-r from-primary to-primary-glow" />

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
            {messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center h-full min-h-[300px] text-center"
              >
                <div className="p-5 rounded-3xl bg-gradient-to-br from-primary/10 to-primary-glow/10 mb-6">
                  <Sparkles className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-h2 font-display font-bold mb-2">Olá! Sou o Assistente DP</h2>
                <p className="text-body text-muted-foreground font-body max-w-md mb-6">
                  Posso ajudar com dúvidas trabalhistas, cálculos de rescisão, férias, INSS, IRRF e muito mais.
                </p>
                <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 max-w-lg w-full">
                  {SUGGESTED_QUESTIONS.slice(0, 4).map(({ icon: Icon, text }, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + i * 0.08 }}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => sendMessage(text)}
                      className="flex items-start gap-2 p-3 rounded-xl glass border border-border/30 hover:border-primary/30 text-left text-sm font-body transition-all"
                    >
                      <Icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{text}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <div className="space-y-4">
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
            )}
          </ScrollArea>

          {/* Input */}
          <div className="border-t border-border/30 p-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pergunte sobre CLT, cálculos, eSocial..."
                disabled={loading}
                className="flex-1 h-11 rounded-xl border-border/50 focus:border-primary/50 font-body"
              />
              <Button
                type="submit"
                disabled={loading || !input.trim()}
                className="h-11 px-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </Card>

        {/* Sidebar - Suggestions */}
        <div className="hidden lg:flex flex-col gap-4">
          <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden">
            <div className="h-[2px] bg-gradient-to-r from-primary/60 to-primary" />
            <CardContent className="p-4 space-y-3">
              <h3 className="text-h3 font-display font-semibold flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-primary" />
                Sugestões
              </h3>
              {SUGGESTED_QUESTIONS.map(({ icon: Icon, text }, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(text)}
                  className="flex items-start gap-2 p-2.5 rounded-lg hover:bg-muted/50 text-left text-sm transition-colors w-full group"
                >
                  <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
                  <span className="text-muted-foreground group-hover:text-foreground font-body transition-colors leading-snug">{text}</span>
                </button>
              ))}
            </CardContent>
          </Card>

          {messages.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMessages([])}
              className="gap-2 rounded-xl border-border/50 font-body"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Limpar conversa
            </Button>
          )}
        </div>
      </div>
    </PageLayout>
    </>
  );
}
