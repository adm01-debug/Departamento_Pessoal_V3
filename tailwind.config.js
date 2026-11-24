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
        // ─── FONTE OFICIAL DO DESIGN SYSTEM (não trocar sem autorização) ───
        // `display`/`body` são o par aprovado nas telas: Plus Jakarta Sans nos
        // valores/títulos de conteúdo e Outfit no shell/títulos. Os nomes seguem
        // o contrato histórico do projeto — mexer neles inverteria a família em
        // ~1.700 usos e mudaria a identidade visual aprovada.
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['"Outfit"', 'sans-serif'],
        // `sans` explícito: sem ele, `font-sans` cairia no stack do navegador
        // (system-ui) e criaria uma identidade tipográfica paralela.
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        // Monoespaçado SÓ para conteúdo técnico (hashes, códigos, JSON, logs,
        // atalhos). É a fonte já carregada no index.html; não é família de UI.
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))', glow: 'hsl(var(--primary-glow))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        // `vivid`: variante VIBRANTE do vermelho, consumida SÓ pela área de Admissões (`text-destructive-vivid`,
        // `bg-destructive-vivid/15`…) — no dark o `--destructive` do tema fica quase ilegível sobre o navy.
        // Valores por tema em `src/index.css`. (`primary.glow` é o precedente desse tipo de variante.)
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))', vivid: 'hsl(var(--destructive-vivid))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        success: { DEFAULT: 'hsl(var(--success))', foreground: 'hsl(var(--success-foreground))' },
        warning: { DEFAULT: 'hsl(var(--warning))', foreground: 'hsl(var(--warning-foreground))' },
        info: { DEFAULT: 'hsl(var(--info))', foreground: 'hsl(var(--info-foreground))' },
        // Horas Extras — escopo da área (nenhuma outra tela usa estes nomes):
        // `danger` é o vermelho VIBRANTE das ações destrutivas (Rejeitar,
        // excluir, ícones de rejeição) e `status.*` é o veredito translúcido
        // do histórico. Valores por tema em `src/index.css`.
        danger: { DEFAULT: 'hsl(var(--danger-primary))', hover: 'hsl(var(--danger-hover))' },
        status: {
          aprovada: 'hsl(var(--status-aprovada))',
          rejeitada: 'hsl(var(--status-rejeitada))',
        },
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
        // Glow vermelho do botão "Novo Desligamento" (Desligamentos) — mesma régua
        // dos demais glows, na variante VIBRANTE do vermelho (`--destructive-vivid`).
        'glow-destructive': '0 0 20px -5px hsl(var(--destructive-vivid) / 0.4)',
        // Glows temáticos dos chips de filtro da Auditoria de Desempenho — mesma
        // régua dos demais (`0 0 20px -5px`), um por família de cor do chip
        // (o lime usa `glow` e o vermelho usa `glow-destructive`, já existentes).
        'glow-info': '0 0 20px -5px hsl(var(--info) / 0.4)',
        'glow-success': '0 0 20px -5px hsl(var(--success) / 0.4)',
        'glow-warning': '0 0 20px -5px hsl(var(--warning) / 0.4)',
        // Violeta do tema (`--chart-4`) — usado pelo chip "Autoavaliação" da aba
        // Feedbacks; mesma régua dos demais glows (0 0 20px -5px).
        'glow-chart-4': '0 0 20px -5px hsl(var(--chart-4) / 0.4)',
        // Halo NEUTRO das ações secundárias do cabeçalho do Controle de Ponto
        // (`components/ponto/acoesCabecalhoPonto.ts`): mesma régua dos demais
        // (`0 0 20px -5px`), pintado com o `--foreground` em alfa baixo — no
        // tema escuro o texto é claro e o halo é uma luz branca discreta; no
        // claro o mesmo valor funciona como elevação suave. Existe para que
        // "Importar"/"Mais ações" tenham glow SEM cor de marca (nada de lime
        // ou ciano em ação de apoio).
        'glow-neutral': '0 0 20px -5px hsl(var(--foreground) / 0.18)',
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
        // ─── RÉGUA DE MOTION (espelha `@theme` em src/index.css) ───────────
        // Entradas de componente/elemento: 320–420ms (faixa 350–500ms);
        // saídas um pouco mais curtas (250–350ms) para a interface não travar
        // na hora de fechar/desmontar. Antes eram 200–300ms, rápidas demais
        // para o olho registrar o movimento. As curvas saíram do `ease-out`
        // genérico para `cubic-bezier(0.22, 1, 0.36, 1)` (a curva de entrada
        // já usada pelo Framer Motion no resto do sistema) e para a curva
        // padrão `cubic-bezier(0.4, 0, 0.2, 1)` em accordion (abre e fecha
        // simétrico, sem parecer que "pula").
        'accordion-down': 'accordion-down 0.32s cubic-bezier(0.4, 0, 0.2, 1)',
        'accordion-up': 'accordion-up 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
        'fade-in': 'fade-in 0.42s cubic-bezier(0.22, 1, 0.36, 1)',
        'fade-out': 'fade-out 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'scale-in': 'scale-in 0.38s cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-in-right': 'slide-in-right 0.42s cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-out-right': 'slide-out-right 0.32s cubic-bezier(0.4, 0, 0.2, 1)',
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
