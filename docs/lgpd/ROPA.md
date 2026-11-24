# RoPA — Registro de Atividades de Tratamento (LGPD art. 37)

> Versão 1.0 — 28/10/2026 · Controlador: empregador (tenant) · Operador: plataforma Departamento Pessoal V3.
> Base estruturada também em `lgpd_politicas_retencao` (categoria de dado × base legal × prazo × ação final).

## Atividades de tratamento

| Atividade                     | Dados pessoais                                                  | Titulares             | Base legal                                   | Finalidade                      | Retenção                                           | Compartilhamento          |
| ----------------------------- | --------------------------------------------------------------- | --------------------- | -------------------------------------------- | ------------------------------- | -------------------------------------------------- | ------------------------- |
| Gestão de folha de pagamento  | nome, CPF, salário, conta bancária (cifrada AES-256/vault)      | empregados            | execução de contrato + obrigação legal (CLT) | calcular e pagar salários       | 5 anos após desligamento (`acao_final=anonimizar`) | eSocial, banco (CNAB/PIX) |
| Registro de ponto             | jornada, biometria facial (hash), geolocalização                | empregados            | obrigação legal (CLT art. 74)                | controle de jornada             | 5 anos                                             | —                         |
| Admissão/desligamento         | documentos civis, dependentes, dados de saúde ocupacional (ASO) | candidatos/empregados | obrigação legal + legítimo interesse         | cumprir obrigações trabalhistas | 20 anos (previdenciário)                           | eSocial, Gov.br           |
| Gestão de férias/afastamentos | datas, atestados médicos                                        | empregados            | obrigação legal                              | controle de ausências           | 5 anos                                             | —                         |
| Conta de acesso               | e-mail, hash de senha, segredo TOTP, sessões                    | usuários do sistema   | execução de contrato                         | autenticação                    | vigência do contrato com o empregador              | —                         |
| Telemetria/erros              | logs técnicos (sem PII intencional)                             | usuários              | legítimo interesse                           | operação e segurança            | conforme `lgpd_politicas_retencao`                 | Sentry (operador)         |
| Solicitações LGPD             | identificação do titular, pedido                                | titulares             | obrigação legal (art. 18 LGPD)               | atender direitos do titular     | 5 anos                                             | —                         |

## Operadores/suboperadores

- **Supabase** (DB/Auth/Storage — self-hosted em VPS própria): operador de infraestrutura.
- **Vercel** (hosting do front): operador — não recebe dados pessoais em repouso.
- **Sentry** (telemetria): operador — sanitizeEvent remove PII antes do envio.
- **Provedores eSocial/Gov.br/Bitrix24/WhatsApp**: destinatários conforme integração ativada pelo controlador.

## Transferências internacionais

Não identificadas por padrão (hospedagem em VPS brasileira). Sentry pode processar em nuvem fora do Brasil — aplicável a logs já sanitizados; cláusulas contratuais padrão recomendadas (art. 36).

## Medidas técnicas (resumo)

Cifragem de dados bancários/senhas de certificado (AES-256, chave no vault), RLS por tenant em todas as tabelas, bridge com allowlist de tabelas + remoção de colunas secretas, aal2 obrigatório em ações sensíveis, auditoria `audit_log`, bloqueio geográfico, sanitização de telemetria.
