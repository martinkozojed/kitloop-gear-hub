import { supabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/error-utils";

const MEMBERSHIP_CONFLICT_KEY = "user_id,provider_id";

export async function ensureProviderMembership(
  userId: string,
  providerId: string,
  role: "owner" | "manager" | "staff" = "owner"
) {
  if (!userId || !providerId) {
    return;
  }

  const { error } = await supabase
    .from("user_provider_memberships")
    .upsert(
      {
        user_id: userId,
        provider_id: providerId,
        role,
      },
      { onConflict: MEMBERSHIP_CONFLICT_KEY }
    );

  if (error) {
    console.warn(
      "ensureProviderMembership: failed to upsert membership",
      getErrorMessage(error),
      error
    );
  }
}

