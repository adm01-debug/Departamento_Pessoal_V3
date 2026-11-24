# API de Empresas

## Visão Geral
Documentação completa para API de Empresas no sistema de Departamento Pessoal.

## Endpoints

### GET /empresas
Retorna lista de recursos.

```typescript
interface Response {
  data: empresas[];
  total: number;
  page: number;
  limit: number;
}
```

### POST /empresas
Cria novo recurso.

### PUT /empresas/:id
Atualiza recurso existente.

### DELETE /empresas/:id
Remove recurso.

## Modelos de Dados

```typescript
interface empresas {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  // Campos específicos
}
```

## Exemplos de Uso

### Listar todos
```bash
curl -X GET /api/empresas
```

### Criar novo
```bash
curl -X POST /api/empresas -d '{}'
```

## Códigos de Erro
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error

---
*Gerado automaticamente - V7 Implementation*
