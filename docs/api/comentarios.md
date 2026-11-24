# API de Comentários

## Visão Geral
Documentação da API para comentarios

## Endpoints

### GET /comentarios
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

### GET /comentarios/:id
Retorna um recurso específico

### POST /comentarios
Cria um novo recurso

### PUT /comentarios/:id
Atualiza um recurso

### DELETE /comentarios/:id
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
