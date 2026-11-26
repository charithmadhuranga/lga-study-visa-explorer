/**
 * Breadcrumb trail with the Back pill. Back uses history when there is one, otherwise it
 * falls back to Destinations.
 */

import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }): React.JSX.Element {
  const navigate = useNavigate();
  const goBack = (): void => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/destinations');
  };

  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      <button className="crumbs__back" onClick={goBack}>
        <Icon name="arrow-left" />
        Back
      </button>
      {items.map((crumb, i) => {
        const last = i === items.length - 1;
        return (
          <span key={`${crumb.label}-${i}`} className="crumbs__item">
            {crumb.to && !last ? (
              <>
                <button className="crumbs__link" onClick={() => crumb.to && navigate(crumb.to)}>
                  {crumb.label}
                </button>
                <span className="crumbs__sep" aria-hidden="true">
                  /
                </span>
              </>
            ) : (
              <span className="crumbs__here" aria-current={last ? 'page' : undefined}>
                {crumb.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
