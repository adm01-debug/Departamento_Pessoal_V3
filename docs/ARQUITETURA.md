# Arquitetura do Sistema

## Estrutura de Pastas

```
src/
├── components/     # Componentes React
│   ├── common/     # Componentes reutilizáveis
│   ├── forms/      # Formulários
│   ├── layout/     # Layout da aplicação
│   ├── ui/         # shadcn/ui components
├── contexts/       # React Contexts
├── hooks/          # Custom hooks
├── lib/            # Bibliotecas e utilitários
├── pages/          # Páginas da aplicação
├── schemas/        # Schemas Zod
├── services/       # Serviços de API
├── types/          # TypeScript types
├── utils/          # Funções utilitárias
└── test/           # Configuração de testes
```

## Padrões

- **Data Fetching**: React Query
- **Forms**: React Hook Form + Zod
- **Styling**: Tailwind CSS
- **State**: Context API + React Query
- **Testing**: Vitest + Testing Library
