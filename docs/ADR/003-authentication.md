# ADR 003: Autenticação

## Status
Aceito

## Contexto
Precisamos de autenticação segura para o sistema.

## Decisão
- **Provider:** Supabase Auth
- **Método:** Email/Senha + OAuth
- **Sessão:** JWT com refresh tokens
- **RBAC:** Row Level Security no Supabase

## Consequências
- Autenticação robusta e segura
- Suporte a múltiplos provedores
- Controle granular de permissões
