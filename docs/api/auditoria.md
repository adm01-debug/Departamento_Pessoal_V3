# API de Auditoria

## Visão Geral
Documentação completa para API de Auditoria no sistema de Departamento Pessoal.

## Endpoints

### GET /auditoria
Retorna lista de recursos.

```typescript
interface Response {
  data: auditoria[];
  total: number;
  page: number;
  limit: number;
}
```

### POST /auditoria
Cria novo recurso.

### PUT /auditoria/:id
Atualiza recurso existente.

### DELETE /auditoria/:id
Remove recurso.

## Modelos de Dados

```typescript
interface auditoria {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  // Campos específicos
}
```

## Exemplos de Uso

### Listar todos
```bash
curl -X GET /api/auditoria
```

### Criar novo
```bash
curl -X POST /api/auditoria -d '{}'
```

## Códigos de Erro
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error

---
*Gerado automaticamente - V7 Implementation*
