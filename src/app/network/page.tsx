import { getAllSources } from '@/lib/sources';
import NetworkPageClient from './NetworkPageClient';

export default function NetworkPage() {
  const sources = getAllSources();
  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-slate-900">Source Network</h1>
      <p className="mb-4 text-sm text-slate-600">
        Every dataset in the catalog as a node, colored by domain. Solid lines are explicit
        lineage (one dataset derived from another); dashed lines connect datasets that share a
        theme or keyword.
      </p>
      <NetworkPageClient sources={sources} />
    </div>
  );
}
