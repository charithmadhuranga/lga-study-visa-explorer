/** Provenance footnote (DESIGN §1.5 "honest numbers"): every fee, rule and date carries its source. */

import { Icon } from './Icon';

export function SourceNote({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <p className="note">
      <Icon name="info" />
      <span>{children}</span>
    </p>
  );
}
