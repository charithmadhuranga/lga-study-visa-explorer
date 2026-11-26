/**
 * Segmented control (DESIGN §5) used for tabs and view switches. The navy "ink" slides
 * between options with a shared `layoutId` (Motion owns it — DESIGN §7.1); reduced motion
 * makes the move instant.
 */

import { motion } from 'motion/react';
import { spring } from '../animation/variants';
import { useMotionEnabled } from '../animation/useMotionEnabled';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export function Segmented<T extends string>({
  id,
  label,
  options,
  value,
  onChange,
  asTabs,
}: {
  /** Unique per screen: scopes the shared-layout animation */
  id: string;
  label: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Render as an ARIA tablist (country tabs) instead of a toggle group */
  asTabs?: boolean;
}): React.JSX.Element {
  const enabled = useMotionEnabled();
  return (
    <div className="segmented" role={asTabs ? 'tablist' : 'group'} aria-label={label}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role={asTabs ? 'tab' : undefined}
            aria-selected={asTabs ? active : undefined}
            aria-pressed={asTabs ? undefined : active}
            onClick={() => onChange(option.value)}
          >
            {active && (
              <motion.span
                className="segmented__ink"
                layoutId={`seg-${id}`}
                transition={enabled ? spring : { duration: 0 }}
              />
            )}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
