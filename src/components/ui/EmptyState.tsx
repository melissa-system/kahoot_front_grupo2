import type { ReactNode } from 'react';
import reminder from '../../assets/brand/link-reminder.png';

export function EmptyState({ title, description, action, image = reminder }: { title: string; description?: ReactNode; action?: ReactNode; image?: string }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      <img src={image} alt="" className="h-28 w-auto select-none" draggable={false} />
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && <p className="mx-auto max-w-md text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
