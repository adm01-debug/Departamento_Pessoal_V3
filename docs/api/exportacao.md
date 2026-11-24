# API de Exportação

## Visão Geral
Documentação completa para API de Exportação no sistema de Departamento Pessoal.

## Endpoints

### GET /exportacao
Retorna lista de recursos.

```typescript
interface Response {
  data: exportacao[];
  total: number;
  page: number;
  limit: number;
}
```

### POST /exportacao
Cria novo recurso.

### PUT /exportacao/:id
Atualiza recurso existente.

### DELETE /exportacao/:id
Remove recurso.

## Modelos de Dados

```typescript
interface exportacao {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  // Campos específicos
}
```

## Exemplos de Uso

### Listar todos
```bash
curl -X GET /api/exportacao
```

### Criar novo
```bash
curl -X POST /api/exportacao -d '{}'
```

## Códigos de Erro
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error

---
*Gerado automaticamente - V7 Implementation*
