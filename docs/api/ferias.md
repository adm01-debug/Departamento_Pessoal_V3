# API de Férias

## Visão Geral
Documentação completa para API de Férias no sistema de Departamento Pessoal.

## Endpoints

### GET /ferias
Retorna lista de recursos.

```typescript
interface Response {
  data: ferias[];
  total: number;
  page: number;
  limit: number;
}
```

### POST /ferias
Cria novo recurso.

### PUT /ferias/:id
Atualiza recurso existente.

### DELETE /ferias/:id
Remove recurso.

## Modelos de Dados

```typescript
interface ferias {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  // Campos específicos
}
```

## Exemplos de Uso

### Listar todos
```bash
curl -X GET /api/ferias
```

### Criar novo
```bash
curl -X POST /api/ferias -d '{}'
```

## Códigos de Erro
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error

---
*Gerado automaticamente - V7 Implementation*
