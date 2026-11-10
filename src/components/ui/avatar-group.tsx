import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

export interface AvatarGroupProps {
  avatars: { src: string; alt?: string; label?: string }[];
  maxVisible?: number;
  size?: number;
  overlap?: number;
}

export function AvatarGroup({ avatars, maxVisible = 5, size = 40, overlap = 14 }: AvatarGroupProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const visibleAvatars = avatars.slice(0, maxVisible);
  const extraCount = avatars.length - maxVisible;

  return (
    <div className="flex items-center pt-8" role="list" aria-label="Lista de participantes">
      <div className="flex -space-x-3">
        {visibleAvatars.map((avatar, idx) => {
          const isHovered = hoveredIdx === idx;
          const label = avatar.label || avatar.alt;
          return (
            <div
              key={`${avatar.src}-${label ?? idx}`}
              role="listitem"
              className="relative rounded-full border-4 border-surface bg-surface transition-all duration-300"
              style={{
                width: size,
                height: size,
                zIndex: isHovered ? 100 : visibleAvatars.length - idx,
                marginLeft: -overlap,
                position: 'relative',
                transition:
                  'margin-left 0.3s cubic-bezier(0.4,0,0.2,1), z-index 0s, box-shadow 0.3s cubic-bezier(0.4,0,0.2,1), transform 0.3s cubic-bezier(0.4,0,0.2,1)',
                transform: isHovered ? 'translateY(-10px)' : 'translateY(0)',
              }}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <img
                src={avatar.src}
                alt={avatar.alt || label || `Avatar ${idx + 1}`}
                width={size}
                height={size}
                className="h-full w-full rounded-full object-cover"
                draggable={false}
              />
              {label && <span className="sr-only">{label}</span>}
              <AnimatePresence>
                {isHovered && label && (
                  <motion.div
                    key="tooltip"
                    initial={{ x: '-50%', y: 10, opacity: 0, scale: 0.7 }}
                    animate={{ x: '-50%', y: 0, opacity: 1, scale: 1 }}
                    exit={{ x: '-50%', y: 10, opacity: 0, scale: 0.7 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                    className="pointer-events-none absolute z-50 whitespace-nowrap rounded bg-primary px-2 py-1 text-xs font-semibold text-white shadow-lg"
                    style={{ top: -size * 0.7, left: '50%' }}
                  >
                    {label}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
        {extraCount > 0 && (
          <div
            className="flex items-center justify-center rounded-full border-4 border-surface bg-primary font-semibold text-white"
            style={{
              width: size,
              height: size,
              marginLeft: -overlap,
              zIndex: 0,
              fontSize: size * 0.32,
            }}
            aria-label={`${extraCount} participantes más`}
          >
            +{extraCount}
          </div>
        )}
      </div>
    </div>
  );
}
