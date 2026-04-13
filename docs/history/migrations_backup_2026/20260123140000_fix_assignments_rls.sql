-- Enable RLS (already enabled, but good practice to ensure)
ALTER TABLE "public"."reservation_assignments" ENABLE ROW LEVEL SECURITY;
-- Allow provider members/owners to view assignments for their reservations
CREATE POLICY "assignments_member_select" ON "public"."reservation_assignments" FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM "public"."reservations" r
                JOIN "public"."providers" p ON r.provider_id = p.id
            WHERE r.id = "reservation_assignments"."reservation_id"
                AND (
                    p.user_id = auth.uid() -- Owner
                    OR EXISTS (
                        -- Member
                        SELECT 1
                        FROM "public"."provider_members" pm
                        WHERE pm.provider_id = p.id
                            AND pm.user_id = auth.uid()
                    )
                )
        )
    );
-- Allow provider members/owners to manage assignments (needed for issue/return?)
-- STARTING SIMPLE: Select only for now to fix 404.
-- If Issue/Return fails on update, we add more.
-- FIX: notification_logs (Error 403 causes page load failure)
ALTER TABLE "public"."notification_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logs_member_select" ON "public"."notification_logs" FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM "public"."reservations" r
                JOIN "public"."providers" p ON r.provider_id = p.id
            WHERE r.id = "notification_logs"."reservation_id"
                AND (
                    p.user_id = auth.uid()
                    OR EXISTS (
                        SELECT 1
                        FROM "public"."provider_members" pm
                        WHERE pm.provider_id = p.id
                            AND pm.user_id = auth.uid()
                    )
                )
        )
    );