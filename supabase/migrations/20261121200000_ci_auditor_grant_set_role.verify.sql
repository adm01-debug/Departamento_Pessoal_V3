-- ok só se o papel da conexão participa de ci_auditor (pré-requisito do SET ROLE).
SELECT 'ok' WHERE pg_has_role(current_user, 'ci_auditor', 'MEMBER');
