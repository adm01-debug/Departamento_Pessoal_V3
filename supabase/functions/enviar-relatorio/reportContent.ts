/** Serializes tabular data without allowing spreadsheet formula execution. */
export function toCsv(dados: unknown): string {
  const arr = Array.isArray(dados) ? dados : [dados];
  if (arr.length === 0 || !arr[0] || typeof arr[0] !== "object") return "";
  const headers = Object.keys(arr[0] as Record<string, unknown>);
  const escape = (value: unknown) => {
    const raw = value == null ? "" : String(value);
    // Excel/LibreOffice evaluate cells starting with these markers, including
    // values preceded by whitespace. Prefixing an apostrophe keeps the data
    // visible as text in CSV consumers.
    const safe = /^[\t\r ]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return [
    headers.join(","),
    ...arr.map((row) => headers.map((header) => escape((row as Record<string, unknown>)[header])).join(",")),
  ].join("\n");
}
