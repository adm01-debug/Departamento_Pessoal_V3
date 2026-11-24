# API de Departamentos

## Visão Geral
Documentação completa para API de Departamentos no sistema de Departamento Pessoal.

## Endpoints

### GET /departamentos
Retorna lista de recursos.

```typescript
interface Response {
  data: departamentos[];
  total: number;
  page: number;
  limit: number;
}
```

### POST /departamentos
Cria novo recurso.

### PUT /departamentos/:id
Atualiza recurso existente.

### DELETE /departamentos/:id
Remove recurso.

## Modelos de Dados

```typescript
interface departamentos {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  // Campos específicos
}
```

## Exemplos de Uso

### Listar todos
```bash
curl -X GET /api/departamentos
```

### Criar novo
```bash
curl -X POST /api/departamentos -d '{}'
```

## Códigos de Erro
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error

---
*Gerado automaticamente - V7 Implementation*
