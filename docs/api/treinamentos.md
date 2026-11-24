# API de Treinamentos

## Visão Geral
Documentação completa para API de Treinamentos no sistema de Departamento Pessoal.

## Endpoints

### GET /treinamentos
Retorna lista de recursos.

```typescript
interface Response {
  data: treinamentos[];
  total: number;
  page: number;
  limit: number;
}
```

### POST /treinamentos
Cria novo recurso.

### PUT /treinamentos/:id
Atualiza recurso existente.

### DELETE /treinamentos/:id
Remove recurso.

## Modelos de Dados

```typescript
interface treinamentos {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  // Campos específicos
}
```

## Exemplos de Uso

### Listar todos
```bash
curl -X GET /api/treinamentos
```

### Criar novo
```bash
curl -X POST /api/treinamentos -d '{}'
```

## Códigos de Erro
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error

---
*Gerado automaticamente - V7 Implementation*
