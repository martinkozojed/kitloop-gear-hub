# PR#8 Admin/Observability hardening smoke

## Frontend routes
- As non-admin: open `/admin/observability` -> expect redirect/deny (AdminRoute) or error message.
- As admin (user_roles admin): `/admin/observability` loads logs table.

## DB RLS checks (rpc_logs)
```sql
-- Non-admin should be denied
select * from public.rpc_logs limit 1;

-- Trusted admin should succeed
-- (run as admin user)
select count(*) from public.rpc_logs;
```

## Policy verification
```sql
-- Expect admin_trusted/service only
select polname, roles, cmd, qual, with_check
from pg_policies
where tablename='rpc_logs';
```

## Service_role insert/select (optional)
```sql
-- With service_role role set / JWT, insert/select should work.
```

## Expected outcomes
- Non-admin: 403/denied on UI and SELECT.
- Admin: allowed.
- service_role: allowed for logging.

