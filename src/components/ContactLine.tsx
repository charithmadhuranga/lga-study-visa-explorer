/** LGA contact details with icons (welcome footer, closing call-to-action). Copy from content.ts. */

import { CONTACT_DETAILS } from '../data/content';
import { Icon } from './Icon';

export function ContactLine({ className }: { className: string }): React.JSX.Element {
  return (
    <p className={className}>
      <span>
        <Icon name="phone" />
        {CONTACT_DETAILS.phone}
      </span>
      <span>
        <Icon name="mail" />
        {CONTACT_DETAILS.email}
      </span>
      <span>
        <Icon name="globe" />
        {CONTACT_DETAILS.web}
      </span>
      <span>
        <Icon name="pin" />
        {CONTACT_DETAILS.address}
      </span>
    </p>
  );
}
