'use client';

import dynamic from 'next/dynamic';
import type { Source } from '@/lib/types';

// d3-force simulation touches layout/timing that only makes sense in the
// browser, and the drag/pan interactions need real pointer events — keep
// this out of SSR/static generation like MapView.
const NetworkGraph = dynamic(() => import('@/components/NetworkGraph'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[620px] items-center justify-center rounded-lg border border-slate-200 text-sm text-slate-500">
      Loading network graph…
    </div>
  ),
});

export default function NetworkPageClient({ sources }: { sources: Source[] }) {
  return <NetworkGraph sources={sources} />;
}
