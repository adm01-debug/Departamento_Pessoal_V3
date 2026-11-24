# API de SST

## Visão Geral
Documentação completa para API de SST no sistema de Departamento Pessoal.

## Endpoints

### GET /sst
Retorna lista de recursos.

```typescript
interface Response {
  data: sst[];
  total: number;
  page: number;
  limit: number;
}
```

### POST /sst
Cria novo recurso.

### PUT /sst/:id
Atualiza recurso existente.

### DELETE /sst/:id
Remove recurso.

## Modelos de Dados

```typescript
interface sst {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  // Campos específicos
}
```

## Exemplos de Uso

### Listar todos
```bash
curl -X GET /api/sst
```

### Criar novo
```bash
curl -X POST /api/sst -d '{}'
```

## Códigos de Erro
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error

---
*Gerado automaticamente - V7 Implementation*
