import { getAllSources } from '@/lib/sources';
import MapPageClient from './MapPageClient';

export default function MapPage() {
  const sources = getAllSources();
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-slate-900">Spatial Footprints</h1>
      <MapPageClient sources={sources} />
    </div>
  );
}
