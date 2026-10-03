# Infra experimental — NÃO USADA EM PRODUÇÃO

> Movida da raiz em 01/10/2026 (auditoria técnica — deduplicação de infra).

Os diretórios `k8s/`, `helm/`, `terraform/` e `ansible/` continham scaffolding de
infraestrutura gerado por sessões anteriores que **não corresponde ao deploy real**.

O deploy de produção é:

- **Frontend:** Vercel (`vercel.json` na raiz — headers, SPA rewrite, cache)
- **Banco/Edge Functions:** Supabase canônico (`frjbfeamybqsejlvmqbl`), promovido
  via workflows `canonical-migrations` / `canonical-edge-functions`
- **Runbooks reais:** `infra/runbooks/`

Estes arquivos são mantidos apenas como referência histórica caso um dia exista
infraestrutura própria. Os pares `.yml`/`.yaml` dentro de `k8s/` divergiam entre
si — outro sinal de que nunca foram aplicados.

**Não provisione nada a partir daqui sem antes revalidar cada manifesto.**
