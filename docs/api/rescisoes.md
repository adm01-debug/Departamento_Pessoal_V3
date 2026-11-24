# API de Rescisões

## Visão Geral
Documentação completa para API de Rescisões no sistema de Departamento Pessoal.

## Endpoints

### GET /rescisoes
Retorna lista de recursos.

```typescript
interface Response {
  data: rescisoes[];
  total: number;
  page: number;
  limit: number;
}
```

### POST /rescisoes
Cria novo recurso.

### PUT /rescisoes/:id
Atualiza recurso existente.

### DELETE /rescisoes/:id
Remove recurso.

## Modelos de Dados

```typescript
interface rescisoes {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  // Campos específicos
}
```

## Exemplos de Uso

### Listar todos
```bash
curl -X GET /api/rescisoes
```

### Criar novo
```bash
curl -X POST /api/rescisoes -d '{}'
```

## Códigos de Erro
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error

---
*Gerado automaticamente - V7 Implementation*
