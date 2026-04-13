
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    provider_id UUID NOT NULL REFERENCES public.providers(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    action VARCHAR(255) NOT NULL,
    resource_id VARCHAR(255) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow providers to view their own logs
CREATE POLICY "Providers can view own audit logs"
    ON public.audit_logs
    FOR SELECT
    USING (provider_id IN (
        SELECT provider_id FROM public.user_provider_memberships WHERE user_id = auth.uid()
    ));;

-- Allow providers to insert logs (e.g. via backend functions or direct if needed)
CREATE POLICY "Providers can insert audit logs"
    ON public.audit_logs
    FOR INSERT
    WITH CHECK (provider_id IN (
        SELECT provider_id FROM public.user_provider_memberships WHERE user_id = auth.uid()
    ));
