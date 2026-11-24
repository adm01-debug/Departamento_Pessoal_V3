# API de Colaboradores

## Visão Geral
Documentação completa para API de Colaboradores no sistema de Departamento Pessoal.

## Endpoints

### GET /colaboradores
Retorna lista de recursos.

```typescript
interface Response {
  data: colaboradores[];
  total: number;
  page: number;
  limit: number;
}
```

### POST /colaboradores
Cria novo recurso.

### PUT /colaboradores/:id
Atualiza recurso existente.

### DELETE /colaboradores/:id
Remove recurso.

## Modelos de Dados

```typescript
interface colaboradores {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  // Campos específicos
}
```

## Exemplos de Uso

### Listar todos
```bash
curl -X GET /api/colaboradores
```

### Criar novo
```bash
curl -X POST /api/colaboradores -d '{}'
```

## Códigos de Erro
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error

---
*Gerado automaticamente - V7 Implementation*
