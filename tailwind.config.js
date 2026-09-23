/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '2rem', screens: { '2xl': '1400px' } },
    extend: {
      spacing: {
        // Único ponto de verdade para o espaçamento sidebar → conteúdo principal
        // (aplicado no `<main>` de MainLayout.tsx via `p-page`). Reaproveita o
        // token que já existia em index.css (`--space-page`) mas nunca tinha
        // sido registrado aqui — sem isso, `p-page`/`pb-page` não geram CSS
        // nenhum e cada página acabava definindo seu próprio padding manual.
        page: 'var(--space-page)',
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['"Outfit"', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))', glow: 'hsl(var(--primary-glow))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        success: { DEFAULT: 'hsl(var(--success))', foreground: 'hsl(var(--success-foreground))' },
        warning: { DEFAULT: 'hsl(var(--warning))', foreground: 'hsl(var(--warning-foreground))' },
        info: { DEFAULT: 'hsl(var(--info))', foreground: 'hsl(var(--info-foreground))' },
        // Gamification tokens
        xp: { DEFAULT: 'hsl(var(--xp))', foreground: 'hsl(var(--xp-foreground))' },
        coins: { DEFAULT: 'hsl(var(--coins))', foreground: 'hsl(var(--coins-foreground))' },
        streak: { DEFAULT: 'hsl(var(--streak))', foreground: 'hsl(var(--streak-foreground))' },
        level: { DEFAULT: 'hsl(var(--level))', foreground: 'hsl(var(--level-foreground))' },
        // Rank tokens
        rank: {
          gold: 'hsl(var(--rank-gold))',
          silver: 'hsl(var(--rank-silver))',
          bronze: 'hsl(var(--rank-bronze))',
        },
        // Module tokens
        tasks: { DEFAULT: 'hsl(var(--tasks))', foreground: 'hsl(var(--tasks-foreground))' },
        gravacoes: { DEFAULT: 'hsl(var(--gravacoes))', foreground: 'hsl(var(--gravacoes-foreground))' },
        finance: { DEFAULT: 'hsl(var(--finance))', foreground: 'hsl(var(--finance-foreground))' },
        sales: { DEFAULT: 'hsl(var(--sales))', foreground: 'hsl(var(--sales-foreground))' },
        store: { DEFAULT: 'hsl(var(--store))', foreground: 'hsl(var(--store-foreground))' },
        zapp: { DEFAULT: 'hsl(var(--zapp))', foreground: 'hsl(var(--zapp-foreground))' },
        loggi: { DEFAULT: 'hsl(var(--loggi))', foreground: 'hsl(var(--loggi-foreground))' },
        // Sidebar
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        glow: '0 0 20px -5px hsl(var(--primary) / 0.3)',
        'glow-xp': '0 0 20px -5px hsl(var(--xp) / 0.4)',
        'glow-coins': '0 0 20px -5px hsl(var(--coins) / 0.4)',
        'glow-streak': '0 0 20px -5px hsl(var(--streak) / 0.4)',
        elevated: '0 10px 30px -10px hsl(var(--foreground) / 0.1)',
        glass: '0 8px 32px 0 hsl(var(--foreground) / 0.06)',
      },
      backdropBlur: {
        glass: '16px',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        'fade-in': { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'fade-out': { '0%': { opacity: '1', transform: 'translateY(0)' }, '100%': { opacity: '0', transform: 'translateY(10px)' } },
        'scale-in': { '0%': { transform: 'scale(0.95)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        'slide-in-right': { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'translateX(0)' } },
        'slide-out-right': { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(100%)' } },
        'pulse-glow': { '0%, 100%': { boxShadow: '0 0 5px hsl(var(--xp) / 0.2)' }, '50%': { boxShadow: '0 0 20px hsl(var(--xp) / 0.6)' } },
        'pulse-glow-lime': {
          '0%, 100%': { boxShadow: '0 0 12px -4px hsl(var(--primary) / 0.18), 0 0 2px 0 hsl(var(--primary) / 0.12)' },
          '50%': { boxShadow: '0 0 24px -2px hsl(var(--primary) / 0.3), 0 0 6px 0 hsl(var(--primary) / 0.2)' },
        },
        'pulse-glow-success': {
          '0%, 100%': { boxShadow: '0 0 4px 0 hsl(var(--success) / 0.35)' },
          '50%': { boxShadow: '0 0 9px 2px hsl(var(--success) / 0.6)' },
        },
        'pulse-glow-warning': {
          '0%, 100%': { boxShadow: '0 0 4px 0 hsl(var(--warning) / 0.35)' },
          '50%': { boxShadow: '0 0 9px 2px hsl(var(--warning) / 0.6)' },
        },
        'xp-pop': { '0%': { transform: 'scale(0) translateY(0)', opacity: '1' }, '50%': { transform: 'scale(1.2) translateY(-10px)', opacity: '1' }, '100%': { transform: 'scale(1) translateY(-20px)', opacity: '0' } },
        'coin-spin': { '0%': { transform: 'rotateY(0deg)' }, '100%': { transform: 'rotateY(360deg)' } },
        'streak-fire': { '0%, 100%': { transform: 'scaleY(1)' }, '50%': { transform: 'scaleY(1.1) scaleX(0.95)' } },
        'level-up': { '0%': { transform: 'scale(1)', filter: 'brightness(1)' }, '50%': { transform: 'scale(1.15)', filter: 'brightness(1.3)' }, '100%': { transform: 'scale(1)', filter: 'brightness(1)' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-out': 'fade-out 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'slide-out-right': 'slide-out-right 0.3s ease-out',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'pulse-glow-lime': 'pulse-glow-lime 2.5s ease-in-out infinite',
        'pulse-glow-success': 'pulse-glow-success 3s ease-in-out infinite',
        'pulse-glow-warning': 'pulse-glow-warning 3s ease-in-out infinite',
        'xp-pop': 'xp-pop 0.6s ease-out forwards',
        'coin-spin': 'coin-spin 0.8s ease-in-out',
        'streak-fire': 'streak-fire 0.5s ease-in-out infinite',
        'level-up': 'level-up 0.6s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
