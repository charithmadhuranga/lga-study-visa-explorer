/**
 * Slide-style page header (DESIGN §5): gold eyebrow (chapter marker), title, lead and
 * right-aligned actions. Every chapter screen opens with one so the room always knows
 * where the consultant is in the story.
 */

export function PageHeader({
  eyebrow,
  title,
  lead,
  actions,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  actions?: React.ReactNode;
}): React.JSX.Element {
  return (
    <header className="page-head">
      <div className="page-head__text">
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {lead && <p className="lead">{lead}</p>}
      </div>
      {actions && <div className="page-head__actions">{actions}</div>}
    </header>
  );
}
