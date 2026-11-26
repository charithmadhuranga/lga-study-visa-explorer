/**
 * University logo plate with the crest fallback (FR-22): any missing, blocked or offline
 * image degrades to a navy initials crest — never a broken-image icon.
 */

import { useState } from 'react';
import { initials } from '../data/format';

export interface LogoBadgeProps {
  name: string;
  src: string;
  size?: 'md' | 'lg';
}

export function LogoBadge({ name, src, size = 'md' }: LogoBadgeProps): React.JSX.Element {
  const [failed, setFailed] = useState(false);

  return (
    <div className={size === 'lg' ? 'logo logo--lg' : 'logo'} aria-hidden="true">
      {src && !failed ? (
        <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span className="crest">{initials(name)}</span>
      )}
    </div>
  );
}
