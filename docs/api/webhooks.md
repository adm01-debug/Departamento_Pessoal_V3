# API de Webhooks

## Visão Geral
Documentação completa para API de Webhooks no sistema de Departamento Pessoal.

## Endpoints

### GET /webhooks
Retorna lista de recursos.

```typescript
interface Response {
  data: webhooks[];
  total: number;
  page: number;
  limit: number;
}
```

### POST /webhooks
Cria novo recurso.

### PUT /webhooks/:id
Atualiza recurso existente.

### DELETE /webhooks/:id
Remove recurso.

## Modelos de Dados

```typescript
interface webhooks {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  // Campos específicos
}
```

## Exemplos de Uso

### Listar todos
```bash
curl -X GET /api/webhooks
```

### Criar novo
```bash
curl -X POST /api/webhooks -d '{}'
```

## Códigos de Erro
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error

---
*Gerado automaticamente - V7 Implementation*
