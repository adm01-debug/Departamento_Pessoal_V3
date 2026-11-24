# API de Usuários

## Visão Geral
Documentação completa para API de Usuários no sistema de Departamento Pessoal.

## Endpoints

### GET /usuarios
Retorna lista de recursos.

```typescript
interface Response {
  data: usuarios[];
  total: number;
  page: number;
  limit: number;
}
```

### POST /usuarios
Cria novo recurso.

### PUT /usuarios/:id
Atualiza recurso existente.

### DELETE /usuarios/:id
Remove recurso.

## Modelos de Dados

```typescript
interface usuarios {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  // Campos específicos
}
```

## Exemplos de Uso

### Listar todos
```bash
curl -X GET /api/usuarios
```

### Criar novo
```bash
curl -X POST /api/usuarios -d '{}'
```

## Códigos de Erro
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error

---
*Gerado automaticamente - V7 Implementation*
