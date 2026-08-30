# Modelo lógico — Contratos e assinatura (E-072)

> Documenta o modelo vigente e o alvo. Base para E-043 (auditoria de contratos),
> E-044 (verificação criptográfica) e E-045 (PDF em storage privado).

## 1. Entidades

| Tabela | Papel | Observações |
|---|---|---|
| `contratos_gerados` | Contrato instanciado a partir de template | `empresa_id`, `colaborador_id`, `status`, `hash_integridade` |
| `contrato_templates` | Modelos versionados por tipo/empresa | `contrato_resolver_template()` resolve o template vigente |
| `contratos_tokens` | Tokens opacos de acesso à assinatura pública | expiração, revogação, uso único |
| `medidas_ciencia_tokens` | Tokens de ciência (medidas disciplinares) | hash-only após 28/07 (token em claro só na emissão) |
| `contratos_assinaturas` | Eventos de assinatura (quem/quando/IP/hash) | trilha em `audit_log_unified` (`CONTRATO_ASSINADO`) |

Views de apoio: `v_contrato_token_timeline`, `v_contratos_tokens_pendentes`,
`v_contratos_assinatura_kpi`.

## 2. Ciclo de vida

```
rascunho → gerado (PDF + hash) → token emitido → aguardando assinatura
        → assinado (hash + evidências) → arquivado
        ↘ revogado/expirado (token)  ↘ cancelado (contrato)
```

Regras:
- Token de assinatura expira (default 7 dias) e é de uso único; verificação
  pública usa `contrato_verificar_autenticidade_v2` (rate limit por IP).
- Assinatura grava: timestamp, IP, user-agent, hash do PDF assinado e
  referência da evidência no bucket `assinaturas` (privado).
- Toda transição grava evento em `audit_log_unified` com `empresa_id`.

## 3. Propriedades de segurança (alvo × atual)

| Propriedade | Atual | Alvo (etapa) |
|---|---|---|
| PDF armazenado privado | ✅ bucket privado | manter (E-045) |
| Integridade por hash SHA-256 | ✅ `hash_integridade` | manter |
| **Assinatura criptográfica verificável** | ⚠️ hash de integridade (não é assinatura digital ICP) | `crypto.subtle.verify` com par de chaves do emissor ou provedor ICP-Brasil (E-044) |
| Trilha de acesso ao contrato | parcial | `pii_access_logs` (E-036) |
| Token opaco em repouso | ✅ hash-only (28/07) | manter |

## 4. E-044 — desenho da verificação criptográfica (a implementar)

1. Emissor detém par de chaves (Ed25519) por empresa: privada em secret da
   edge `gerar-contrato-pdf`; pública persistida em `contratos_chaves_publicas`.
2. PDF final é assinado: `assinatura = sign(privada, sha256(pdf_bytes))`.
3. `VerificarContratoPage` verifica com a pública via `crypto.subtle.verify`
   — prova de não-repúdio e integridade sem confiar no servidor.
4. Migração expand-contract: contratos antigos mantêm `hash_integridade`;
   novos ganham `assinatura_digital` + `chave_publica_id`.
