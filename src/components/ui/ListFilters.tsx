import { type FormEvent, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from './Button';
import { hasActiveFilters } from '../../lib/listFilters';

const inputClass =
  'h-11 w-full rounded-xl border border-line bg-surface-2 px-3.5 text-fg placeholder:text-muted/70 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30';

export interface ListFilterValues {
  query: string;
  from: string;
  to: string;
}

interface Props {
  query: string;
  from: string;
  to: string;
  searchLabel: string;
  searchPlaceholder: string;
  onApply(values: ListFilterValues): void;
  onClear(): void;
}

export function ListFilters({
  query,
  from,
  to,
  searchLabel,
  searchPlaceholder,
  onApply,
  onClear,
}: Props) {
  const [draftQuery, setDraftQuery] = useState(query);
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);

  useEffect(() => {
    setDraftQuery(query);
    setDraftFrom(from);
    setDraftTo(to);
  }, [query, from, to]);

  const canClear = hasActiveFilters(query, from, to) || hasActiveFilters(draftQuery, draftFrom, draftTo);

  function submit(event: FormEvent) {
    event.preventDefault();
    onApply({ query: draftQuery, from: draftFrom, to: draftTo });
  }

  function clear() {
    setDraftQuery('');
    setDraftFrom('');
    setDraftTo('');
    onClear();
  }

  return (
    <form onSubmit={submit} className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_11rem_11rem_auto] lg:items-end">
      <label className="relative block min-w-0">
        <span className="sr-only">{searchLabel}</span>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
        <input
          type="search"
          value={draftQuery}
          onChange={(e) => setDraftQuery(e.target.value)}
          placeholder={searchPlaceholder}
          autoComplete="off"
          className={`${inputClass} pl-10`}
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Desde</span>
        <input type="date" value={draftFrom} max={draftTo || undefined} onChange={(e) => setDraftFrom(e.target.value)} className={inputClass} />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Hasta</span>
        <input type="date" value={draftTo} min={draftFrom || undefined} onChange={(e) => setDraftTo(e.target.value)} className={inputClass} />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" icon={<Search className="h-4 w-4" />}>
          Buscar
        </Button>
        {canClear && (
          <Button type="button" variant="secondary" onClick={clear}>
            Limpiar filtros
          </Button>
        )}
      </div>
    </form>
  );
}
