# Runbook E-079 — Acesso break-glass (emergência)

> Acesso de emergência para incidentes em que o caminho normal de administração
> está indisponível (ex.: lockout de todos os admins, falha de MFA, corrupção
> de política RLS que trava o app). **Cada uso é auditado e tem validade.**

## 1. Princípios

1. **Deny by default**: fora de incidente declarado, a conta break-glass está
   inativa (senha em cofre, MFA obrigatório, sem sessões ativas).
2. **Dupla autorização**: uso exige declaração de incidente por 1 pessoa +
   aprovação de outra (pode ser assíncrona, mas registrada).
3. **Validade curta**: credencial expira em ≤ 4h; sessão encerrada ao fim.
4. **Tudo auditado**: cada ação break-glass gera evento em `audit_log_unified`
   com `action = 'BREAK_GLASS_*'` e é revisada no post-incident.

## 2. Como funciona

1. Conta dedicada `breakglass@<domínio>` com papel `admin` global, criada via
   console Supabase (nunca via seed/migration).
2. Senha (≥ 32 chars aleatórios) + seed TOTP ficam em cofre da empresa
   (Vault/1Password), com acesso logado.
3. A conta não participa de nenhuma automação, grupo ou SSO.

## 3. Procedimento de uso

1. **Declarar incidente**: abrir issue/incidente com severidade e motivo.
2. **Retirar credencial do cofre** (o acesso ao cofre já gera log).
3. **Autenticar** (senha + TOTP). Se MFA falhar, seguir §5.
4. **Executar apenas a ação necessária** para restaurar o caminho normal
   (ex.: redefinir MFA de um admin, recriar policy equivocada via SQL).
5. **Registrar** na issue: ações executadas, horário de início/fim.
6. **Encerrar**: logout de todas as sessões (Supabase → Auth → sign out all)
   e **rotacionar a senha** da conta break-glass (ver ROTACAO_SEGREDOS.md).

## 4. Pós-incidente (obrigatório)

- [ ] Revisar `audit_log_unified` filtrando pelo user_id da conta no período.
- [ ] Confirmar que o caminho normal de administração voltou.
- [ ] Post-incident: por que o caminho normal falhou e como evitar reincidência.

## 5. Se o MFA da conta break-glass falhar

Acesso direto ao banco (`postgres` via connection string em cofre separado)
para redefinir o fator em `auth.mfa_factors`. Esse acesso é o **último
recurso** e dispara revisão de segurança completa do incidente.

## 6. Teste trimestral

A cada trimestre: simular o procedimento §3 em staging (sem executar ação
destrutiva) e validar que credencial, MFA e auditoria funcionam. Registrar
resultado na ata de segurança.
