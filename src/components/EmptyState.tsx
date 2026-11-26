/** Empty / not-found state (DESIGN §5): never a blank area — title, hint and an escape route. */

import { useNavigate } from 'react-router-dom';
import { Icon, type IconName } from './Icon';

export function EmptyState({
  title,
  hint,
  action,
  to = '/destinations',
  icon = 'compass',
}: {
  title: string;
  hint?: string;
  action?: string;
  /** Where the action button goes */
  to?: string;
  icon?: IconName;
}): React.JSX.Element {
  const navigate = useNavigate();
  return (
    <div className="empty">
      <span className="icon-badge">
        <Icon name={icon} />
      </span>
      <h3>{title}</h3>
      {hint && <p>{hint}</p>}
      {action && (
        <button className="btn btn--ghost" onClick={() => navigate(to)}>
          {action}
        </button>
      )}
    </div>
  );
}
