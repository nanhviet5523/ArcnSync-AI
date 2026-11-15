import { useCallback, useEffect, useState } from 'react';
import { getAdminUsers } from './usersApi';

export interface AccountStats {
  total: number;
  active: number;
  invited: number;
}

// No dashboard-stats endpoint yet, so read the counts from GET /admin/users:
// limit=1 keeps the payload tiny and `total` already reflects the applied filter.
export function useAccountStats() {
  const [stats, setStats] = useState<AccountStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError('');
    Promise.all([
      getAdminUsers({ page: 1, limit: 1 }),
      getAdminUsers({ page: 1, limit: 1, status: 'ACTIVE' }),
      getAdminUsers({ page: 1, limit: 1, status: 'INVITED' }),
    ])
      .then(([all, active, invited]) => {
        if (!ignore) setStats({ total: all.total, active: active.total, invited: invited.total });
      })
      .catch((err) => {
        if (!ignore) setError(err instanceof Error ? err.message : 'Failed to load account statistics.');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);

  return { stats, loading, error, retry };
}
