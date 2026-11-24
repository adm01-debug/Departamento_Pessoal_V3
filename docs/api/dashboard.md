# API de Dashboard

## Visão Geral
Documentação da API para dashboard

## Endpoints

### GET /dashboard
Retorna lista de recursos

**Parâmetros:**
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| page | number | Não | Página atual |
| limit | number | Não | Itens por página |
| search | string | Não | Termo de busca |

**Resposta:**
```json
{
  "data": [],
  "meta": { "total": 0, "page": 1, "limit": 20 }
}
```

### GET /dashboard/:id
Retorna um recurso específico

### POST /dashboard
Cria um novo recurso

### PUT /dashboard/:id
Atualiza um recurso

### DELETE /dashboard/:id
Remove um recurso

## Códigos de Status
- 200: Sucesso
- 201: Criado
- 400: Requisição inválida
- 401: Não autorizado
- 403: Proibido
- 404: Não encontrado
- 500: Erro interno

## Autenticação
Bearer Token JWT no header Authorization
