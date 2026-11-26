/**
 * Route error screen: whatever goes wrong inside a screen, the room sees a calm branded
 * message and a way back — never a stack trace or a blank page (AGENTS §3.6).
 */

import { useNavigate, useRouteError } from 'react-router-dom';
import { Icon } from '../components/Icon';

export function RouteError(): React.JSX.Element {
  const navigate = useNavigate();
  const error = useRouteError();
  // Keep the detail for developers; the screen itself stays presentation-safe.
  console.error(error);

  return (
    <div className="wrap">
      <div className="empty">
        <span className="icon-badge">
          <Icon name="compass" />
        </span>
        <h3>This page could not be shown</h3>
        <p>Everything else still works. Pick up the consultation from the destinations.</p>
        <div className="row-gap">
          <button className="btn" onClick={() => navigate('/destinations')}>
            Back to destinations
          </button>
          <button className="btn btn--ghost" onClick={() => navigate('/')}>
            Welcome screen
          </button>
        </div>
      </div>
    </div>
  );
}
