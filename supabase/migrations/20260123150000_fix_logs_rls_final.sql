-- Fix notification_logs RLS which causes page load failures in detail view
ALTER TABLE "public"."notification_logs" ENABLE ROW LEVEL SECURITY;
-- Allow select for members
CREATE POLICY "logs_member_select_v2" ON "public"."notification_logs" FOR
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