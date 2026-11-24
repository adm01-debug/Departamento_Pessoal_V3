# ADR 002: Gerenciamento de Estado

## Status
Aceito

## Contexto
Precisamos gerenciar estado global e server state de forma eficiente.

## Decisão
- **Server State:** React Query para cache e sincronização
- **Client State:** Context API para estado local compartilhado
- **Forms:** React Hook Form para estado de formulários

## Consequências
- Separação clara entre server e client state
- Cache automático e revalidação
- Performance otimizada
