import { cn } from '../../lib/cn';
import { OWL_AVATARS, owlAvatarOf, owlAvatarSrc, type OwlAvatarId } from '../../lib/owlAvatar';

const SIZE = {
  xs: 'h-7 w-7',
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
  xl: 'h-20 w-20',
  '2xl': 'h-28 w-28',
} as const;

export function OwlAvatar({
  id,
  name,
  size = 'md',
  className,
}: {
  id?: string | null;
  name: string;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const avatar = owlAvatarOf(id);
  return (
    <img
      src={owlAvatarSrc(avatar.id)}
      alt={`${name}, avatar ${avatar.label}`}
      draggable={false}
      className={cn('inline-block shrink-0 rounded-full object-cover', SIZE[size], className)}
    />
  );
}

export function OwlAvatarPicker({
  value,
  onChange,
}: {
  value: OwlAvatarId;
  onChange: (id: OwlAvatarId) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">Avatar</legend>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4" role="listbox" aria-label="Elige un búho">
        {OWL_AVATARS.map((avatar) => {
          const selected = avatar.id === value;
          return (
            <button
              key={avatar.id}
              type="button"
              role="option"
              aria-selected={selected}
              aria-label={avatar.label}
              onClick={() => onChange(avatar.id)}
              className={cn(
                'flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl border px-3 py-4 transition-colors',
                selected ? 'border-primary bg-primary-soft ring-2 ring-primary/40' : 'border-line hover:border-primary/50 hover:bg-surface-2',
              )}
            >
              <OwlAvatar id={avatar.id} name={avatar.label} size="2xl" />
              <span className="max-w-full truncate text-sm font-semibold">{avatar.label}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
