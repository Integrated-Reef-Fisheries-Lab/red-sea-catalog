// Pure data-shaping for the network graph — no rendering or physics here.
// Two kinds of edges are computed from the source records:
//  - "lineage": provenance.derived_from (a real, explicit relationship)
//  - "theme": two sources share at least one theme or keyword (a soft,
//    computed relationship that makes the graph read as a web, not just
//    isolated lineage chains)
import type { Source, Domain } from './types';

export interface GraphNode {
  id: string;
  title: string;
  domain: Domain[];
  quality: Source['quality']['status'];
  accessTier: Source['access']['tier'];
}

export interface GraphLink {
  source: string;
  target: string;
  kind: 'lineage' | 'theme';
  sharedThemes?: string[];
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

function normalizedTerms(source: Source): Set<string> {
  return new Set([...source.themes, ...source.keywords].map((t) => t.toLowerCase().trim()));
}

export function buildGraph(sources: Source[]): GraphData {
  const ids = new Set(sources.map((s) => s.id));

  const nodes: GraphNode[] = sources.map((s) => ({
    id: s.id,
    title: s.title,
    domain: s.domain,
    quality: s.quality.status,
    accessTier: s.access.tier,
  }));

  const links: GraphLink[] = [];
  const seenPairs = new Set<string>();

  // Lineage edges: real, explicit derived_from relationships.
  for (const s of sources) {
    for (const parentId of s.provenance.derived_from) {
      if (!ids.has(parentId) || parentId === s.id) continue;
      const key = [s.id, parentId].sort().join('|lineage|');
      if (seenPairs.has(key)) continue;
      seenPairs.add(key);
      links.push({ source: parentId, target: s.id, kind: 'lineage' });
    }
  }

  // Theme edges: computed overlap in themes/keywords, one edge per pair
  // with at least one shared term, skipping pairs already linked by lineage.
  const terms = new Map(sources.map((s) => [s.id, normalizedTerms(s)]));
  for (let i = 0; i < sources.length; i++) {
    for (let j = i + 1; j < sources.length; j++) {
      const a = sources[i];
      const b = sources[j];
      const key = [a.id, b.id].sort().join('|lineage|');
      if (seenPairs.has(key)) continue;

      const shared = [...terms.get(a.id)!].filter((t) => terms.get(b.id)!.has(t));
      if (shared.length === 0) continue;

      const themeKey = [a.id, b.id].sort().join('|theme|');
      if (seenPairs.has(themeKey)) continue;
      seenPairs.add(themeKey);
      links.push({ source: a.id, target: b.id, kind: 'theme', sharedThemes: shared });
    }
  }

  return { nodes, links };
}
