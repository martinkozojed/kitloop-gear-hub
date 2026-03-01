import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

// Basic resend email function, can be expanded
async function sendEmailViaResend(
  resendApiKey: string,
  to: string,
  subject: string,
  htmlContent: string
) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: 'Kitloop Notifications <notifications@kitloop.cz>',
      to,
      subject,
      html: htmlContent,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Resend error: ${err}`)
  }

  return await res.json()
}

/**
 * Check if a user has email_enabled for a given provider.
 * Returns false if no preference row exists (safe default for pilot).
 */
export async function isEmailEnabledForUser(
  // deno-lint-ignore no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  providerId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('email_enabled')
    .eq('user_id', userId)
    .eq('provider_id', providerId)
    .maybeSingle()

  if (error || !data) return false // safe default: email OFF
  return data.email_enabled === true
}

if (import.meta.main) {
  serve(async (req) => {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    // Create a Supabase client with the service role key
    const supabase = createClient(supabaseUrl, supabaseKey)

    try {
      // 1. Fetch pending notifications
      // We limit to 50 to avoid timeout issues in a single run
      const { data: outboxItems, error: fetchError } = await supabase
        .from('notification_outbox')
        .select('*, profiles!user_id(email)')
        .eq('status', 'pending')
        .lte('next_attempt_at', new Date().toISOString())
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(50)

      if (fetchError) throw fetchError

      if (!outboxItems || outboxItems.length === 0) {
        return new Response(JSON.stringify({ message: 'No pending notifications' }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const results = []

      for (const item of outboxItems) {
        let deliveryStatus = 'sent'
        let errorMessage = null
        let externalId = null

        try {
          // Mark as processing
          await supabase
            .from('notification_outbox')
            .update({ status: 'processing' })
            .eq('id', item.id)

          const userEmail = item.profiles?.email
          const payload = item.payload

          if (item.channel === 'email') {
            // ── Preference gate: skip email if user has email_enabled=false ──
            const emailAllowed = await isEmailEnabledForUser(
              supabase,
              item.user_id,
              item.provider_id
            )

            if (!emailAllowed) {
              // Mark as skipped — do NOT call Resend
              deliveryStatus = 'skipped'
              errorMessage = 'Email disabled in user preferences'
            } else if (!resendApiKey) {
              throw new Error('RESEND_API_KEY is not configured')
            } else if (!userEmail) {
              throw new Error('User email not found')
            } else {
              const resendResponse = await sendEmailViaResend(
                resendApiKey,
                userEmail,
                payload.subject || 'Kitloop Notification',
                payload.html || `<p>${payload.text || 'No content'}</p>`
              )

              externalId = resendResponse.id
            }

          } else if (item.channel === 'inapp') {
            // For in-app, we just need to log the delivery so the UI can fetch it
            // Nothing to physically "send" to an external provider
            externalId = `inapp_${Date.now()}_${item.id.substring(0, 8)}`
          } else {
            throw new Error(`Unsupported channel: ${item.channel}`)
          }

        } catch (err) {
          deliveryStatus = 'failed'
          errorMessage = err.message
        }

        // Update the outbox status
        const attemptCount = item.attempt_count + 1
        // Skipped items are marked as 'canceled' to prevent retries
        const finalStatus = deliveryStatus === 'skipped'
          ? 'canceled'
          : deliveryStatus === 'sent'
            ? 'sent'
            : (attemptCount >= 3 ? 'failed' : 'pending')

        const nextAttemptAt = new Date()
        if (finalStatus === 'pending') {
          // Simple backoff: 5 minutes * attempt count
          nextAttemptAt.setMinutes(nextAttemptAt.getMinutes() + (5 * attemptCount))
        }

        await supabase
          .from('notification_outbox')
          .update({
            status: finalStatus,
            attempt_count: attemptCount,
            last_error: errorMessage,
            sent_at: finalStatus === 'sent' ? new Date().toISOString() : null,
            next_attempt_at: nextAttemptAt.toISOString()
          })
          .eq('id', item.id)

        // Create delivery log (skip for canceled — no external action taken)
        if (finalStatus === 'sent' || finalStatus === 'failed') {
          await supabase
            .from('notification_deliveries')
            .insert({
              outbox_id: item.id,
              provider_id: item.provider_id,
              user_id: item.user_id,
              channel: item.channel,
              external_id: externalId,
              delivered_at: finalStatus === 'sent' ? new Date().toISOString() : null,
              meta: { error: errorMessage }
            })
        }

        results.push({ id: item.id, status: finalStatus, error: errorMessage })
      }

      return new Response(JSON.stringify({ processed: results.length, results }), {
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  })
}
