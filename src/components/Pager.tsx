/** Show-more pager (24 rows, +24 per click — reference parity; AGENTS: never > 60 unpaged). */

export function Pager({
  shown,
  total,
  onMore,
}: {
  shown: number;
  total: number;
  onMore: () => void;
}): React.JSX.Element | null {
  if (shown >= total) return null;
  return (
    <div className="pager">
      <button className="btn btn--ghost" onClick={onMore}>
        Show {Math.min(24, total - shown)} more
        <span className="muted small">
          {total - shown} of {total} remaining
        </span>
      </button>
    </div>
  );
}
