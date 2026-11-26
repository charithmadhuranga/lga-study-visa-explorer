/**
 * University logo plate with the crest fallback (FR-22): cached logo (desktop, works offline)
 * → remote logo → navy initials crest. Never a broken-image icon.
 */

import { useEffect, useState } from 'react';
import { initials } from '../data/format';
import { logosResolveAsync, resolveLogo } from '../data/logos';

export interface LogoBadgeProps {
  name: string;
  src: string;
  size?: 'md' | 'lg';
}

export function LogoBadge({ name, src, size = 'md' }: LogoBadgeProps): React.JSX.Element {
  // Browser: the URL is final immediately. Desktop: wait for the cache lookup (≈1 ms) so the
  // crest never flashes before a cached logo appears.
  const [url, setUrl] = useState<string | null>(() => (logosResolveAsync() ? null : src));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    setFailed(false);
    void resolveLogo(src).then((resolved) => {
      if (live) setUrl(resolved);
    });
    return () => {
      live = false;
    };
  }, [src]);

  const pending = url === null && !!src;

  return (
    <div className={size === 'lg' ? 'logo logo--lg' : 'logo'} aria-hidden="true">
      {pending ? null : url && !failed ? (
        <img src={url} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span className="crest">{initials(name)}</span>
      )}
    </div>
  );
}
