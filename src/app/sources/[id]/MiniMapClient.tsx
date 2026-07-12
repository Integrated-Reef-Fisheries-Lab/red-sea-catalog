'use client';

import dynamic from 'next/dynamic';

const MiniMap = dynamic(() => import('@/components/MiniMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 w-full items-center justify-center rounded-lg border border-slate-200 text-sm text-slate-500">
      Loading map…
    </div>
  ),
});

export default function MiniMapClient({ bbox }: { bbox: [number, number, number, number] }) {
  return <MiniMap bbox={bbox} />;
}
