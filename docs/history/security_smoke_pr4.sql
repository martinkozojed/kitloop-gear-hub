-- PR#4 security smoke tests for SECURITY DEFINER functions
-- Replace placeholders; run with appropriate roles/JWTs.

-- Function privilege checks (run as any role)
SELECT 
  has_function_privilege('public', 'public.issue_reservation(uuid,uuid,uuid,boolean,text)', 'execute') AS public_issue_exec,
  has_function_privilege('anon', 'public.issue_reservation(uuid,uuid,uuid,boolean,text)', 'execute') AS anon_issue_exec,
  has_function_privilege('authenticated', 'public.issue_reservation(uuid,uuid,uuid,boolean,text)', 'execute') AS auth_issue_exec,
  has_function_privilege('service_role', 'public.issue_reservation(uuid,uuid,uuid,boolean,text)', 'execute') AS service_issue_exec;

SELECT 
  has_function_privilege('public', 'public.process_return(uuid,uuid,uuid,jsonb)', 'execute') AS public_return_exec,
  has_function_privilege('anon', 'public.process_return(uuid,uuid,uuid,jsonb)', 'execute') AS anon_return_exec,
  has_function_privilege('authenticated', 'public.process_return(uuid,uuid,uuid,jsonb)', 'execute') AS auth_return_exec,
  has_function_privilege('service_role', 'public.process_return(uuid,uuid,uuid,jsonb)', 'execute') AS service_return_exec;

SELECT 
  has_function_privilege('public', 'public.expire_stale_holds(int)', 'execute') AS public_expire_exec,
  has_function_privilege('anon', 'public.expire_stale_holds(int)', 'execute') AS anon_expire_exec,
  has_function_privilege('authenticated', 'public.expire_stale_holds(int)', 'execute') AS auth_expire_exec,
  has_function_privilege('service_role', 'public.expire_stale_holds(int)', 'execute') AS service_expire_exec;

SELECT 
  has_function_privilege('public', 'public.approve_provider(uuid)', 'execute') AS public_approve_exec,
  has_function_privilege('anon', 'public.approve_provider(uuid)', 'execute') AS anon_approve_exec,
  has_function_privilege('authenticated', 'public.approve_provider(uuid)', 'execute') AS auth_approve_exec,
  has_function_privilege('service_role', 'public.approve_provider(uuid)', 'execute') AS service_approve_exec;

-- Expected: public/anon/authenticated = false; service_role = true.
