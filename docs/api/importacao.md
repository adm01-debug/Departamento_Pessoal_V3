# API de Importação

## Visão Geral
Documentação completa para API de Importação no sistema de Departamento Pessoal.

## Endpoints

### GET /importacao
Retorna lista de recursos.

```typescript
interface Response {
  data: importacao[];
  total: number;
  page: number;
  limit: number;
}
```

### POST /importacao
Cria novo recurso.

### PUT /importacao/:id
Atualiza recurso existente.

### DELETE /importacao/:id
Remove recurso.

## Modelos de Dados

```typescript
interface importacao {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  // Campos específicos
}
```

## Exemplos de Uso

### Listar todos
```bash
curl -X GET /api/importacao
```

### Criar novo
```bash
curl -X POST /api/importacao -d '{}'
```

## Códigos de Erro
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error

---
*Gerado automaticamente - V7 Implementation*
