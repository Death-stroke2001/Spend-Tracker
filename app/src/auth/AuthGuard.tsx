/**
 * Auth Guard — No authentication needed for Google Sheets sync.
 * Always renders children (the app). Sync setup is done in Settings.
 */

import { type ReactNode } from 'react';

export default function AuthGuard({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
