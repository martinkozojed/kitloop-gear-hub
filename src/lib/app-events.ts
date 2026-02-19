import { supabase } from '@/lib/supabase';
import type { Json } from '@/integrations/supabase/types';

export type AppEventName =
  | 'export_inventory'
  | 'export_reservations'
  | 'print_handover'
  | 'reservation_issue'
  | 'reservation_return'
  | 'feedback_submitted';

type EventMetadata = Record<string, Json | undefined>;

interface EventEntity {
  type?: string;
  id?: string;
}

interface LogEventInput {
  providerId: string;
  entity?: EventEntity;
  metadata?: EventMetadata;
}

interface SubmitFeedbackInput {
  providerId: string;
  message: string;
  pagePath?: string;
  metadata?: EventMetadata;
}

export async function logEvent(name: AppEventName, input: LogEventInput): Promise<void> {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;

  if (!userId || !input.providerId) return;

  const { error } = await supabase.from('app_events').insert({
    provider_id: input.providerId,
    user_id: userId,
    event_name: name,
    entity_type: input.entity?.type ?? null,
    entity_id: input.entity?.id ?? null,
    metadata: (input.metadata ?? null) as Json | null,
  });

  if (error) {
    // Intentionally no throw: telemetry must not break user flows.
    console.warn('app_events insert failed', error.message);
  }
}

export async function submitFeedback(input: SubmitFeedbackInput): Promise<void> {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;

  if (!userId || !input.providerId) {
    throw new Error('Missing auth or provider context');
  }

  const { error } = await supabase.from('feedback').insert({
    provider_id: input.providerId,
    user_id: userId,
    message: input.message,
    page_path: input.pagePath ?? null,
    metadata: (input.metadata ?? null) as Json | null,
  });

  if (error) {
    throw new Error(error.message);
  }

  await logEvent('feedback_submitted', {
    providerId: input.providerId,
    metadata: {
      page_path: input.pagePath,
      has_metadata: Boolean(input.metadata),
    },
  });
}
