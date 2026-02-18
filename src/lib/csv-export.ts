/** RFC4180-ish CSV helpers */

function escapeField(value: unknown): string {
  const str = value == null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\r') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function buildCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(escapeField).join(',')];
  for (const row of rows) {
    lines.push(row.map(escapeField).join(','));
  }
  return lines.join('\r\n');
}

function downloadCsv(csv: string, filename: string): void {
  const bom = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Inventory ────────────────────────────────────────────────────────────────

export interface InventoryCsvRow {
  id: string;
  asset_tag: string;
  product_name: string;
  variant_name: string;
  sku: string | null;
  status: string;
  created_at: string;
}

const INVENTORY_HEADERS = [
  'item_id',
  'asset_tag',
  'product_name',
  'variant_name',
  'sku',
  'status',
  'created_at',
];

export function exportInventoryCsv(rows: InventoryCsvRow[]): void {
  const data = rows.map((r) => [
    r.id,
    r.asset_tag,
    r.product_name,
    r.variant_name,
    r.sku ?? '',
    r.status,
    r.created_at,
  ]);
  const csv = buildCsv(INVENTORY_HEADERS, data);
  downloadCsv(csv, `kitloop_inventory_${todayStr()}.csv`);
}

// ── Reservations ─────────────────────────────────────────────────────────────

export interface ReservationCsvRow {
  id: string;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  total_lines: number;
  created_at: string | null;
}

const RESERVATION_HEADERS = [
  'reservation_id',
  'status',
  'date_from',
  'date_to',
  'customer_name',
  'customer_email',
  'customer_phone',
  'total_lines',
  'created_at',
];

export function exportReservationsCsv(rows: ReservationCsvRow[]): void {
  const data = rows.map((r) => [
    r.id,
    r.status ?? '',
    r.start_date ?? '',
    r.end_date ?? '',
    r.customer_name,
    r.customer_email ?? '',
    r.customer_phone ?? '',
    r.total_lines,
    r.created_at ?? '',
  ]);
  const csv = buildCsv(RESERVATION_HEADERS, data);
  downloadCsv(csv, `kitloop_reservations_${todayStr()}.csv`);
}
