# API de Guias

## Visão Geral
Documentação completa para API de Guias no sistema de Departamento Pessoal.

## Endpoints

### GET /guias
Retorna lista de recursos.

```typescript
interface Response {
  data: guias[];
  total: number;
  page: number;
  limit: number;
}
```

### POST /guias
Cria novo recurso.

### PUT /guias/:id
Atualiza recurso existente.

### DELETE /guias/:id
Remove recurso.

## Modelos de Dados

```typescript
interface guias {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  // Campos específicos
}
```

## Exemplos de Uso

### Listar todos
```bash
curl -X GET /api/guias
```

### Criar novo
```bash
curl -X POST /api/guias -d '{}'
```

## Códigos de Erro
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error

---
*Gerado automaticamente - V7 Implementation*
