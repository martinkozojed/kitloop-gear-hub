/**
 * Provider-aware date utility for Today List triage.
 *
 * Uses provider's IANA timezone (from providers.time_zone) to compute
 * the correct "today" boundary for DATE column comparisons.
 *
 * Fallback: operator's local clock (browser timezone) — preserves F1 pilot behavior.
 *
 * Returns YYYY-MM-DD strings matching Postgres DATE columns (no timestamp, no TZ shift).
 */

/**
 * Compute today and tomorrow date strings in the given IANA timezone.
 *
 * @param timezone - IANA timezone string (e.g. 'Europe/Prague'). If nullish, uses browser local.
 * @returns { todayDate: string; tomorrowDate: string } in YYYY-MM-DD format
 */
export function getProviderTodayDates(timezone?: string | null): {
    todayDate: string;
    tomorrowDate: string;
} {
    const now = new Date();

    if (timezone) {
        // Use Intl.DateTimeFormat to get the correct date in the provider's timezone.
        // This avoids adding date-fns-tz as a dependency.
        try {
            const formatter = new Intl.DateTimeFormat('en-CA', {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            });
            // en-CA locale formats as YYYY-MM-DD natively
            const todayDate = formatter.format(now);

            // Compute tomorrow: add 1 day in the provider's timezone
            // We parse the provider-local date and add a day
            const [year, month, day] = todayDate.split('-').map(Number);
            const tomorrowLocal = new Date(year, month - 1, day + 1);
            const tomorrowDate = formatter.format(tomorrowLocal);

            return { todayDate, tomorrowDate };
        } catch {
            // Invalid timezone string → fall through to fallback
            console.warn(`Invalid provider timezone "${timezone}", using local fallback.`);
        }
    }

    // Fallback: operator's local clock (F1 pilot default behavior)
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;

    return { todayDate, tomorrowDate };
}
