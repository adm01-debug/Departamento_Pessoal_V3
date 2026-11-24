# ADR 001: Padrão Result e Resiliência em Serviços

## Status
Aceito

## Contexto
A aplicação lida com operações críticas de RH e Departamento Pessoal (DP), como fechamento de folha, cálculos de impostos e integração com sistemas externos. Falhas silenciosas ou exceções não tratadas podem levar a inconsistências de dados e má experiência do usuário.

## Decisão
Adotaremos o padrão `Result` para todos os métodos de serviço e o padrão `Circuit Breaker` para todas as integrações externas e Edge Functions.

### 1. Padrão Result
- Em vez de lançar exceções, os serviços retornam um objeto `{ ok: true, value: T }` ou `{ ok: false, error: E }`.
- Isso força o chamador (componente ou hook) a tratar explicitamente o caso de erro.
- O tipo base está em `src/types/result.ts`.

### 2. Circuit Breaker
- Implementado em `src/lib/circuitBreaker.ts`.
- Protege o sistema contra falhas em cascata quando um serviço externo (Bitrix24, Resend, Edge Functions) está lento ou offline.
- Interrompe chamadas temporariamente após um limite de falhas, permitindo a recuperação do sistema.

## Consequências
- Código mais verboso, mas extremamente mais seguro e previsível.
- Melhor experiência de erro para o usuário final, com mensagens claras e severidades apropriadas.
- Maior estabilidade em cenários de instabilidade de rede ou serviços de terceiros.