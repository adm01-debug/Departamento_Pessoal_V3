# API de Documentos

## Visão Geral
Documentação completa para API de Documentos no sistema de Departamento Pessoal.

## Endpoints

### GET /documentos
Retorna lista de recursos.

```typescript
interface Response {
  data: documentos[];
  total: number;
  page: number;
  limit: number;
}
```

### POST /documentos
Cria novo recurso.

### PUT /documentos/:id
Atualiza recurso existente.

### DELETE /documentos/:id
Remove recurso.

## Modelos de Dados

```typescript
interface documentos {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  // Campos específicos
}
```

## Exemplos de Uso

### Listar todos
```bash
curl -X GET /api/documentos
```

### Criar novo
```bash
curl -X POST /api/documentos -d '{}'
```

## Códigos de Erro
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error

---
*Gerado automaticamente - V7 Implementation*
