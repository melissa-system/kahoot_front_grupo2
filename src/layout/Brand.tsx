import { Link } from 'react-router-dom';
import icon from '../assets/brand/profelink-icon.png';
import { cn } from '../lib/cn';

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn('grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#11162a] shadow-[0_6px_20px_-8px_rgb(59_130_246/0.6)]', className)}>
      <img src={icon} alt="" className="h-full w-full object-cover" draggable={false} />
    </span>
  );
}

export function Brand({ to = '/', subtitle }: { to?: string; subtitle?: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-primary">
      <BrandMark />
      <span className="flex flex-col leading-tight">
        <span className="text-xl font-extrabold tracking-tight sm:text-2xl">ProfeLink</span>
        {subtitle && <span className="hidden text-sm text-muted sm:block">{subtitle}</span>}
      </span>
    </Link>
  );
}
