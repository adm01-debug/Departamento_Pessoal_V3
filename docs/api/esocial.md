# API do eSocial

## Visão Geral
Documentação completa para API do eSocial no sistema de Departamento Pessoal.

## Endpoints

### GET /esocial
Retorna lista de recursos.

```typescript
interface Response {
  data: esocial[];
  total: number;
  page: number;
  limit: number;
}
```

### POST /esocial
Cria novo recurso.

### PUT /esocial/:id
Atualiza recurso existente.

### DELETE /esocial/:id
Remove recurso.

## Modelos de Dados

```typescript
interface esocial {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  // Campos específicos
}
```

## Exemplos de Uso

### Listar todos
```bash
curl -X GET /api/esocial
```

### Criar novo
```bash
curl -X POST /api/esocial -d '{}'
```

## Códigos de Erro
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error

---
*Gerado automaticamente - V7 Implementation*
