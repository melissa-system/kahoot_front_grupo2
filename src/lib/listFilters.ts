export function normalizeSearch(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

export function matchesText(haystack: string, query: string) {
  const needle = normalizeSearch(query);
  if (!needle) return true;
  return normalizeSearch(haystack).includes(needle);
}

export function hasActiveFilters(query: string, from: string, to: string) {
  return Boolean(query.trim() || from || to);
}

function startOfLocalDay(yyyyMmDd: string) {
  const [year, month, day] = yyyyMmDd.split('-').map(Number);
  return new Date(year, month - 1, day).getTime();
}

function endOfLocalDay(yyyyMmDd: string) {
  const [year, month, day] = yyyyMmDd.split('-').map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
}

/** Incluye ambos extremos del día local. `from`/`to` van en YYYY-MM-DD. */
export function inDateRange(iso: string, from: string, to: string) {
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return false;
  if (from && time < startOfLocalDay(from)) return false;
  if (to && time > endOfLocalDay(to)) return false;
  return true;
}
