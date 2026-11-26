/** App version + "Check for app update" inside the status popover (FR-24). */

import { useAppUpdate } from '../store/appUpdate';

const MESSAGES: Partial<Record<string, string>> = {
  checking: 'Checking for a new version…',
  'up-to-date': 'This is the latest version.',
  error: 'Could not reach the release feed. The app keeps working as it is.',
  downloading: 'Downloading the update…',
  restarting: 'Restarting…',
};

export function AppVersion(): React.JSX.Element {
  const state = useAppUpdate((s) => s.state);
  const version = useAppUpdate((s) => s.version);
  const manual = useAppUpdate((s) => s.manual);
  const check = useAppUpdate((s) => s.check);
  const install = useAppUpdate((s) => s.install);

  if (state === 'unsupported') {
    return (
      <p className="muted small">App version {__APP_VERSION__} · updates run in the desktop app.</p>
    );
  }

  // Background checks stay quiet; feedback is shown when a person asked.
  const message =
    state === 'available'
      ? `Version ${version} is available.`
      : manual || state === 'downloading' || state === 'restarting'
        ? MESSAGES[state]
        : undefined;

  return (
    <div className="status-pop__app">
      <div className="status-pop__facts">
        <div>
          <dt>App version</dt>
          <dd>{__APP_VERSION__}</dd>
        </div>
      </div>
      {message && <p className="small muted">{message}</p>}
      {state === 'available' ? (
        <button className="btn btn--sm btn--block" onClick={() => void install()}>
          Restart &amp; update to {version}
        </button>
      ) : (
        <button
          className="btn btn--sm btn--ghost btn--block"
          disabled={state === 'checking' || state === 'downloading' || state === 'restarting'}
          onClick={() => void check(true)}
        >
          Check for app update
        </button>
      )}
    </div>
  );
}
