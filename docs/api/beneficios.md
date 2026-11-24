# API de Benefícios

## Visão Geral
Documentação completa para API de Benefícios no sistema de Departamento Pessoal.

## Endpoints

### GET /beneficios
Retorna lista de recursos.

```typescript
interface Response {
  data: beneficios[];
  total: number;
  page: number;
  limit: number;
}
```

### POST /beneficios
Cria novo recurso.

### PUT /beneficios/:id
Atualiza recurso existente.

### DELETE /beneficios/:id
Remove recurso.

## Modelos de Dados

```typescript
interface beneficios {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  // Campos específicos
}
```

## Exemplos de Uso

### Listar todos
```bash
curl -X GET /api/beneficios
```

### Criar novo
```bash
curl -X POST /api/beneficios -d '{}'
```

## Códigos de Erro
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error

---
*Gerado automaticamente - V7 Implementation*
