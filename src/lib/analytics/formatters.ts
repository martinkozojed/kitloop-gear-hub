const currencyFormatter = new Intl.NumberFormat("cs-CZ", {
  style: "currency",
  currency: "CZK",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("cs-CZ", {
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("cs-CZ", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const shortDateFormatter = new Intl.DateTimeFormat("cs-CZ", {
  day: "2-digit",
  month: "2-digit",
});

export const longDateFormatter = new Intl.DateTimeFormat("cs-CZ", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function formatCurrencyCZ(amountCents: number, currency = "CZK"): string {
  const formatter =
    currency === "CZK"
      ? currencyFormatter
      : new Intl.NumberFormat("cs-CZ", {
          style: "currency",
          currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

  return formatter.format(amountCents / 100);
}

export function formatInteger(value: number): string {
  return numberFormatter.format(value);
}

export function formatPercent(ratio: number): string {
  return percentFormatter.format(ratio);
}

export function formatPercentDelta(ratio: number): string {
  const formatted = percentFormatter.format(Math.abs(ratio));
  if (ratio === 0) return formatted;
  return ratio > 0 ? `+${formatted}` : `-${formatted}`;
}

export function formatShortDateLabel(dateIso: string): string {
  const date = new Date(dateIso);
  return shortDateFormatter.format(date);
}

export function formatLongDate(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return longDateFormatter.format(value);
}

export function formatRelativeTimeFromNow(
  input: Date | number,
  locale = "cs-CZ"
): string {
  const date = typeof input === "number" ? new Date(input) : input;
  const diffMs = date.getTime() - Date.now();
  const diffSeconds = Math.round(diffMs / 1000);

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
    ["second", 1],
  ];

  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  for (const [unit, unitSeconds] of units) {
    const value = diffSeconds / unitSeconds;
    if (Math.abs(value) >= 1 || unit === "second") {
      return formatter.format(Math.round(value), unit);
    }
  }

  return formatter.format(0, "second");
}
