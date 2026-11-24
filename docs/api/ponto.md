# API de Ponto Eletrônico

## Visão Geral
Documentação completa para API de Ponto Eletrônico no sistema de Departamento Pessoal.

## Endpoints

### GET /ponto
Retorna lista de recursos.

```typescript
interface Response {
  data: ponto[];
  total: number;
  page: number;
  limit: number;
}
```

### POST /ponto
Cria novo recurso.

### PUT /ponto/:id
Atualiza recurso existente.

### DELETE /ponto/:id
Remove recurso.

## Modelos de Dados

```typescript
interface ponto {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  // Campos específicos
}
```

## Exemplos de Uso

### Listar todos
```bash
curl -X GET /api/ponto
```

### Criar novo
```bash
curl -X POST /api/ponto -d '{}'
```

## Códigos de Erro
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error

---
*Gerado automaticamente - V7 Implementation*
