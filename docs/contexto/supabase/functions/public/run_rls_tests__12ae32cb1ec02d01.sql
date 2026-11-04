CREATE OR REPLACE FUNCTION public.run_rls_tests()
 RETURNS SETOF text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN NEXT has_extension('pgtap');
    
    -- Test: Collaborators RLS
    -- Verify that RLS is enabled
    RETURN NEXT is_rls_enabled('public', 'colaboradores');
    
    -- Test: Payroll RLS
    RETURN NEXT is_rls_enabled('public', 'folhas_pagamento');

    -- Detailed policy checks
    RETURN NEXT has_policy('public', 'colaboradores', 'Users can view their own company collaborators');
    RETURN NEXT has_policy('public', 'folhas_pagamento', 'Users can view their own company payroll');

    -- Note: Real row-access tests require creating temporary users, 
    -- which is best done in a controlled test environment.
END;
$function$
