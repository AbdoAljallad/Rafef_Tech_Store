import { env } from '../../config/env';

export function DevModeBadge() {
  if (!env.useMockAuth) {
    return null;
  }

  return (
    <div className="dev-mode-badge" aria-label="Development mock authentication is enabled">
      MOCK AUTH
    </div>
  );
}
