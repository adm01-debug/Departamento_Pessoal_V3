# ADR 0001: Padronização de Serviços com o Padrão Result

## Status
Aceito

## Contexto
O projeto carece de uma forma determinística de lidar com erros em camadas de serviço. O uso de `try-catch` em cascata torna o fluxo de execução difícil de prever e a tipagem de erros inconsistente.

## Decisão
Adotaremos o padrão **Result** para todos os novos serviços e refatorações de serviços críticos. 

1. **Assinatura:** Toda função de serviço deve retornar um `Promise<Result<T, E>>`.
2. **Predictabilidade:** O chamador é obrigado a verificar a propriedade `ok` antes de acessar o valor.
3. **Erros Estruturados:** Erros devem seguir a interface `ErrorDetails` definida em `src/errors/types.ts`.

## Consequências
- Código mais verboso porém mais seguro.
- Eliminação de exceções não capturadas em tempo de execução.
- Melhor integração com componentes de UI que podem reagir a estados de erro de forma granular.

## Exemplo
```typescript
const result = await userService.getById(id);
if (!result.ok) {
  toast.error(result.error.message);
  return;
}
const user = result.value;
```
