/**
 * CSV Export Utility
 *
 * Provides reusable functions for exporting analytics data to CSV format.
 */

export interface CsvExportOptions {
  /** The filename (without extension) for the downloaded CSV file */
  filename: string;
  /** Column headers as an array of strings */
  headers: string[];
  /** Data rows as an array of arrays (each inner array is one row) */
  rows: (string | number | null | undefined)[][];
}

/**
 * Escapes a CSV value by:
 * - Wrapping in quotes if it contains comma, newline, or quote
 * - Doubling any internal quotes
 */
function escapeCsvValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }

  const str = String(value);

  // If the value contains comma, newline, or quote, wrap it in quotes
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Exports data to a CSV file and triggers a browser download.
 *
 * @param options - Configuration for the CSV export
 *
 * @example
 * ```ts
 * exportToCsv({
 *   filename: "top-items-2025-01",
 *   headers: ["Rank", "Item", "Revenue"],
 *   rows: [
 *     [1, "Tent Pro", 15000],
 *     [2, "Backpack", 8500],
 *   ],
 * });
 * ```
 */
export function exportToCsv(options: CsvExportOptions): void {
  const { filename, headers, rows } = options;

  // Build CSV content
  const headerRow = headers.map(escapeCsvValue).join(",");
  const dataRows = rows.map((row) => row.map(escapeCsvValue).join(","));
  const csv = [headerRow, ...dataRows].join("\n");

  // Create blob and trigger download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
