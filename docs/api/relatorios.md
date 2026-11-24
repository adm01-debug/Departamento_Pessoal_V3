# API de Relatórios

## Visão Geral
Documentação completa para API de Relatórios no sistema de Departamento Pessoal.

## Endpoints

### GET /relatorios
Retorna lista de recursos.

```typescript
interface Response {
  data: relatorios[];
  total: number;
  page: number;
  limit: number;
}
```

### POST /relatorios
Cria novo recurso.

### PUT /relatorios/:id
Atualiza recurso existente.

### DELETE /relatorios/:id
Remove recurso.

## Modelos de Dados

```typescript
interface relatorios {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  // Campos específicos
}
```

## Exemplos de Uso

### Listar todos
```bash
curl -X GET /api/relatorios
```

### Criar novo
```bash
curl -X POST /api/relatorios -d '{}'
```

## Códigos de Erro
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error

---
*Gerado automaticamente - V7 Implementation*
