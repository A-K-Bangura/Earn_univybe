import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

// Cancel before clearing: a late response must not repopulate another account's cache.
export async function clearPrivateData() {
  await queryClient.cancelQueries();
  queryClient.clear();
  if (typeof caches !== 'undefined') {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key === 'api-cache' || key.startsWith('earn-api')).map(key => caches.delete(key)));
  }
}
