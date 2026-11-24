# API de Cálculos

## Visão Geral
Documentação completa para API de Cálculos no sistema de Departamento Pessoal.

## Endpoints

### GET /calculos
Retorna lista de recursos.

```typescript
interface Response {
  data: calculos[];
  total: number;
  page: number;
  limit: number;
}
```

### POST /calculos
Cria novo recurso.

### PUT /calculos/:id
Atualiza recurso existente.

### DELETE /calculos/:id
Remove recurso.

## Modelos de Dados

```typescript
interface calculos {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  // Campos específicos
}
```

## Exemplos de Uso

### Listar todos
```bash
curl -X GET /api/calculos
```

### Criar novo
```bash
curl -X POST /api/calculos -d '{}'
```

## Códigos de Erro
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error

---
*Gerado automaticamente - V7 Implementation*
