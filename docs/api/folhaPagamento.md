# API de Folha de Pagamento

## Visão Geral
Documentação completa para API de Folha de Pagamento no sistema de Departamento Pessoal.

## Endpoints

### GET /folhaPagamento
Retorna lista de recursos.

```typescript
interface Response {
  data: folhaPagamento[];
  total: number;
  page: number;
  limit: number;
}
```

### POST /folhaPagamento
Cria novo recurso.

### PUT /folhaPagamento/:id
Atualiza recurso existente.

### DELETE /folhaPagamento/:id
Remove recurso.

## Modelos de Dados

```typescript
interface folhaPagamento {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  // Campos específicos
}
```

## Exemplos de Uso

### Listar todos
```bash
curl -X GET /api/folhaPagamento
```

### Criar novo
```bash
curl -X POST /api/folhaPagamento -d '{}'
```

## Códigos de Erro
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error

---
*Gerado automaticamente - V7 Implementation*
