import type { ReactNode } from 'react';
import { PageShell } from './PageShell';
export function FeaturePage({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <PageShell><div className="own-links mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10"><header className="mb-7"><p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-blue-violet-400 dark:text-blue-violet-700">UniVybe Earn</p><h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">{title}</h1>{description && <p className="mt-3 max-w-2xl text-gray-600 dark:text-gray-400">{description}</p>}</header>{children}</div></PageShell>;
}
