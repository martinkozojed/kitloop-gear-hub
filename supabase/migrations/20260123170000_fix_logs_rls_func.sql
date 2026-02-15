-- Create a security definer function to check access without RLS recursion issues
CREATE OR REPLACE FUNCTION public.check_notification_log_access(_reservation_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN -- Check if the current user is the provider owner or a member
    RETURN EXISTS (
        SELECT 1
        FROM reservations r
            JOIN providers p ON r.provider_id = p.id
        WHERE r.id = _reservation_id
            AND (
                p.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1
                    FROM provider_members pm
                    WHERE pm.provider_id = p.id
                        AND pm.user_id = auth.uid()
                )
            )
    );
END;
$$;
-- Update the policy to use the function
DROP POLICY IF EXISTS "logs_member_select_v3" ON "public"."notification_logs";
DROP POLICY IF EXISTS "logs_member_select_v2" ON "public"."notification_logs";
DROP POLICY IF EXISTS "logs_member_select" ON "public"."notification_logs";
CREATE POLICY "logs_member_select_final" ON "public"."notification_logs" FOR
SELECT TO authenticated USING (
        check_notification_log_access(reservation_id)
    );