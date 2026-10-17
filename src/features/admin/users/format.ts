const EMPTY_PLACEHOLDER = '—';

// "string" is the default example value Swagger fills in, so seed/test data often contains it.
export function isEmptyValue(value: string | number | null | undefined): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' || trimmed === 'string';
  }
  return false;
}

export function formatValue(value: string | number | null | undefined): string {
  return isEmptyValue(value) ? EMPTY_PLACEHOLDER : String(value);
}
