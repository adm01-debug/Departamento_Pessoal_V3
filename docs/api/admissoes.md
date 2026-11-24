# API de Admissões

## Visão Geral
Documentação completa para API de Admissões no sistema de Departamento Pessoal.

## Endpoints

### GET /admissoes
Retorna lista de recursos.

```typescript
interface Response {
  data: admissoes[];
  total: number;
  page: number;
  limit: number;
}
```

### POST /admissoes
Cria novo recurso.

### PUT /admissoes/:id
Atualiza recurso existente.

### DELETE /admissoes/:id
Remove recurso.

## Modelos de Dados

```typescript
interface admissoes {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  // Campos específicos
}
```

## Exemplos de Uso

### Listar todos
```bash
curl -X GET /api/admissoes
```

### Criar novo
```bash
curl -X POST /api/admissoes -d '{}'
```

## Códigos de Erro
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error

---
*Gerado automaticamente - V7 Implementation*
