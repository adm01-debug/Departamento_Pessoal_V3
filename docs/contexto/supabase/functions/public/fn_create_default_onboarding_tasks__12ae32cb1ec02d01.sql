CREATE OR REPLACE FUNCTION public.fn_create_default_onboarding_tasks()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.tarefas_onboarding (admissao_id, titulo, descricao)
    VALUES 
    (NEW.id, 'Configuração de E-mail', 'Criar conta corporativa no Google/Outlook'),
    (NEW.id, 'Acessos ao Sistema', 'Liberar ERP e ferramentas de comunicação'),
    (NEW.id, 'Entrega de Kit', 'Notebook e kit de boas-vindas');
    RETURN NEW;
END;
$function$
