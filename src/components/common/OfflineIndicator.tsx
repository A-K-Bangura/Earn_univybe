import { useEffect, useState } from 'react';
export function OfflineIndicator() {
 const [online, setOnline] = useState(navigator.onLine);
 useEffect(() => { const update = () => setOnline(navigator.onLine); window.addEventListener('online', update); window.addEventListener('offline', update); return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); }; }, []);
 return online ? null : <div role="status" className="sticky top-0 z-50 bg-amber-500 px-4 py-3 text-center text-sm font-semibold text-gray-900">You’re offline. Some pages may be unavailable. Reconnect to send updates.</div>;
}
