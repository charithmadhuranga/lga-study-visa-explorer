/**
 * Filter rail (FR-10) — the left column on country, university and finder screens.
 * Ported from `rail()` / `chipRow()` in the reference: search, chip groups with counts,
 * budget slider, extras toggles and "Clear all filters". State lives in the filters store
 * keyed by scope, so the three screens never share selections.
 */

import { useFilters, filterState } from '../store/filters';
import { type ChipOption, type FilterState } from '../data/filters';
import { fmt } from '../data/format';
import { Icon } from './Icon';

export interface ChipGroup {
  title: string;
  key: 'prov' | 'lvl' | 'fld' | 'co' | 'mon';
  options: ChipOption[];
  /** Cap the visible chips until "Show all" (reference caps regions at 10) */
  limit?: number;
}

export interface FilterRailProps {
  scope: string;
  placeholder?: string;
  groups: ChipGroup[];
  /** Budget slider: undefined = no budget control for this scope */
  budget?: { currency: string; max: number; step: number } | null;
  extras?: boolean;
}

export function FilterRail({
  scope,
  placeholder,
  groups,
  budget,
  extras,
}: FilterRailProps): React.JSX.Element {
  const state = useFilters((s) => filterState(s, scope));
  const patch = useFilters((s) => s.patch);
  const clear = useFilters((s) => s.clear);

  const toggle = (key: ChipGroup['key'], value: string): void => {
    const next = new Set(state[key]);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    patch(scope, { [key]: next, show: 24 } as Partial<FilterState>);
  };

  const budgetValue = budget ? state.max || budget.max : 0;
  const atTop = !!budget && budgetValue >= budget.max;

  const active =
    !!state.q ||
    groups.some((group) => state[group.key].size > 0) ||
    !!state.max ||
    state.sch ||
    state.coop;

  return (
    <aside className="rail" aria-label="Filters">
      <div className="rail__head">
        <h2>
          <Icon name="filter" />
          Refine
        </h2>
        {active && (
          <button className="link-btn" onClick={() => clear(scope)}>
            Clear all
          </button>
        )}
      </div>
      <label className="search">
        <Icon name="search" />
        <input
          type="search"
          placeholder={placeholder ?? 'Course, university or city'}
          aria-label="Search"
          value={state.q}
          autoComplete="off"
          onChange={(e) => patch(scope, { q: e.target.value, show: 24 })}
        />
      </label>

      {groups
        .filter((group) => group.options.length > 1)
        .map((group) => {
          const selected = state[group.key];
          const many = !!group.limit && group.options.length > group.limit && !state.provAll;
          const visible = many
            ? group.options.filter((o, i) => i < (group.limit ?? 0) || selected.has(o.value))
            : group.options;
          return (
            <div className="rail__group" key={group.key}>
              <h3>{group.title}</h3>
              <div className="chips">
                {visible.map((option) => (
                  <button
                    key={option.value}
                    aria-pressed={selected.has(option.value)}
                    onClick={() => toggle(group.key, option.value)}
                  >
                    {option.label}
                    <i>{fmt(option.count)}</i>
                  </button>
                ))}
              </div>
              {many && (
                <button className="link-btn" onClick={() => patch(scope, { provAll: true })}>
                  Show all {group.options.length}
                </button>
              )}
            </div>
          );
        })}

      {budget && (
        <div className="rail__group">
          <h3>Max tuition per year</h3>
          <div className="budget__value">
            {state.max && !atTop ? budget.currency + fmt(state.max) : 'Any budget'}
          </div>
          <input
            type="range"
            min={budget.step}
            max={budget.max}
            step={budget.step}
            value={budgetValue}
            aria-label="Maximum tuition per year"
            onChange={(e) => {
              const value = Number(e.target.value);
              patch(scope, { max: value >= budget.max ? 0 : value, show: 24 });
            }}
          />
        </div>
      )}

      {extras && (
        <div className="rail__group">
          <h3>Extras</h3>
          <label className="tog">
            <input
              type="checkbox"
              checked={state.sch}
              onChange={(e) => patch(scope, { sch: e.target.checked, show: 24 })}
            />
            Scholarships available
          </label>
          <label className="tog">
            <input
              type="checkbox"
              checked={state.coop}
              onChange={(e) => patch(scope, { coop: e.target.checked, show: 24 })}
            />
            Co-op / work placement
          </label>
        </div>
      )}
    </aside>
  );
}
