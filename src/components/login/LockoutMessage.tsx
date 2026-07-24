import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';

interface LockoutMessageProps {
  remainingSeconds: number;
}

export function LockoutMessage({ remainingSeconds }: LockoutMessageProps) {
  const [seconds, setSeconds] = useState(remainingSeconds);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSeconds(remainingSeconds);
  }, [remainingSeconds]);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setInterval(() => {
      setSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds > 0]);

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center space-y-2"
    >
      <div className="flex items-center justify-center gap-2 text-destructive">
        <ShieldAlert className="h-5 w-5" />
        <span className="font-display font-semibold text-sm">Conta temporariamente bloqueada</span>
      </div>
      <p className="text-xs text-muted-foreground font-body">
        Muitas tentativas de login incorretas. Tente novamente em{' '}
        <span className="font-semibold text-foreground">
          {minutes > 0 ? `${minutes}m ${secs.toString().padStart(2, '0')}s` : `${secs}s`}
        </span>
      </p>
    </motion.div>
  );
}
