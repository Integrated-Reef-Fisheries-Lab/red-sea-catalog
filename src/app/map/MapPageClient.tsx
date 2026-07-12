'use client';

import dynamic from 'next/dynamic';
import type { Source } from '@/lib/types';

// MapLibre GL accesses `window`, so it must never run during SSR/static generation.
const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[70vh] items-center justify-center rounded-lg border border-slate-200 text-sm text-slate-500">
      Loading map…
    </div>
  ),
});

export default function MapPageClient({ sources }: { sources: Source[] }) {
  return <MapView sources={sources} />;
}
