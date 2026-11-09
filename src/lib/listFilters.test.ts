import { describe, expect, it } from 'vitest';
import { hasActiveFilters, inDateRange, matchesText } from './listFilters';

describe('Filtros de listas', () => {
  it('busca coincidencias sin importar mayúsculas ni tildes', () => {
    expect(matchesText('Paradigmas: repaso rápido', 'paradigmas')).toBe(true);
    expect(matchesText('Álgebra lineal', 'algebra')).toBe(true);
    expect(matchesText('Kahoot de lógica', 'xyz')).toBe(false);
    expect(matchesText('Cualquier cosa', '  ')).toBe(true);
  });

  it('incluye el día completo del rango local', () => {
    const iso = '2026-10-15T18:00:00.000Z';
    expect(inDateRange(iso, '2026-10-15', '2026-10-15')).toBe(true);
    expect(inDateRange(iso, '2026-10-16', '')).toBe(false);
    expect(inDateRange(iso, '', '2026-10-14')).toBe(false);
    expect(inDateRange(iso, '2026-10-01', '2026-10-31')).toBe(true);
  });

  it('detecta filtros activos', () => {
    expect(hasActiveFilters('', '', '')).toBe(false);
    expect(hasActiveFilters('kahoot', '', '')).toBe(true);
    expect(hasActiveFilters('', '2026-10-01', '')).toBe(true);
  });
});
