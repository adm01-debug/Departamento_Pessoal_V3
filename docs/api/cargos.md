# API de Cargos

## Visão Geral
Documentação completa para API de Cargos no sistema de Departamento Pessoal.

## Endpoints

### GET /cargos
Retorna lista de recursos.

```typescript
interface Response {
  data: cargos[];
  total: number;
  page: number;
  limit: number;
}
```

### POST /cargos
Cria novo recurso.

### PUT /cargos/:id
Atualiza recurso existente.

### DELETE /cargos/:id
Remove recurso.

## Modelos de Dados

```typescript
interface cargos {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  // Campos específicos
}
```

## Exemplos de Uso

### Listar todos
```bash
curl -X GET /api/cargos
```

### Criar novo
```bash
curl -X POST /api/cargos -d '{}'
```

## Códigos de Erro
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error

---
*Gerado automaticamente - V7 Implementation*
