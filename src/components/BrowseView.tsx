'use client';

import { useMemo, useState } from 'react';
import type { Source } from '@/lib/types';
import SearchBar from './SearchBar';
import FacetPanel, { EMPTY_FACETS, type Facets } from './FacetPanel';
import SourceCard from './SourceCard';

export default function BrowseView({ sources }: { sources: Source[] }) {
  const [facets, setFacets] = useState<Facets>(EMPTY_FACETS);
  const [searchIds, setSearchIds] = useState<string[] | null>(null);

  const filtered = useMemo(() => {
    let result = sources;

    if (facets.domain.length) {
      result = result.filter((s) => s.domain.some((d) => facets.domain.includes(d)));
    }
    if (facets.subbasin.length) {
      result = result.filter((s) => s.spatial.subbasins.some((sb) => facets.subbasin.includes(sb)));
    }
    if (facets.access.length) {
      result = result.filter((s) => facets.access.includes(s.access.tier));
    }
    if (facets.quality.length) {
      result = result.filter((s) => facets.quality.includes(s.quality.status));
    }

    if (searchIds) {
      const rank = new Map(searchIds.map((id, i) => [id, i]));
      result = result.filter((s) => rank.has(s.id)).sort((a, b) => rank.get(a.id)! - rank.get(b.id)!);
    }

    return result;
  }, [sources, facets, searchIds]);

  return (
    <div>
      <div className="mb-6">
        <SearchBar onResults={setSearchIds} />
      </div>
      <div className="flex gap-8">
        <FacetPanel facets={facets} onChange={setFacets} />
        <div className="flex-1">
          <p className="mb-3 text-sm text-slate-500">
            {filtered.length} dataset{filtered.length === 1 ? '' : 's'}
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filtered.map((source) => (
              <SourceCard key={source.id} source={source} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
