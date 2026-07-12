'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Source, Subbasin } from '@/lib/types';
import { DOMAIN_COLORS } from '@/lib/types';
import SourceCard from './SourceCard';

// Approximate centroids used for sources that have a subbasin but no bbox.
const SUBBASIN_CENTROIDS: Record<Subbasin, [number, number]> = {
  northern: [35.3, 27.5],
  central: [38.0, 21.0],
  southern: [40.5, 17.0],
  'gulf-of-aqaba': [34.9, 29.2],
  farasan: [42.1, 16.7],
};

function bboxToPolygon([w, s, e, n]: [number, number, number, number]) {
  return [
    [w, s],
    [e, s],
    [e, n],
    [w, n],
    [w, s],
  ];
}

export default function MapView({ sources }: { sources: Source[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [selected, setSelected] = useState<Source | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const maplibregl = (await import('maplibre-gl')).default;
      if (cancelled || !containerRef.current) return;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: 'https://demotiles.maplibre.org/style.json',
        center: [38.5, 20.5],
        zoom: 4.2,
      });
      mapRef.current = map;

      map.on('load', () => {
        const rectangleFeatures = sources
          .filter((s) => s.spatial.bbox)
          .map((s) => ({
            type: 'Feature' as const,
            properties: { id: s.id, color: DOMAIN_COLORS[s.domain[0]] },
            geometry: { type: 'Polygon' as const, coordinates: [bboxToPolygon(s.spatial.bbox)] },
          }));

        map.addSource('bboxes', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: rectangleFeatures },
        });
        map.addLayer({
          id: 'bbox-fill',
          type: 'fill',
          source: 'bboxes',
          paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.25 },
        });
        map.addLayer({
          id: 'bbox-outline',
          type: 'line',
          source: 'bboxes',
          paint: { 'line-color': ['get', 'color'], 'line-width': 1.5 },
        });

        map.on('click', 'bbox-fill', (e) => {
          const id = e.features?.[0]?.properties?.id;
          const source = sources.find((s) => s.id === id);
          if (source) setSelected(source);
        });
        map.on('mouseenter', 'bbox-fill', () => (map.getCanvas().style.cursor = 'pointer'));
        map.on('mouseleave', 'bbox-fill', () => (map.getCanvas().style.cursor = ''));

        // Point markers for sources without a bbox, at their subbasin centroid.
        sources
          .filter((s) => !s.spatial.bbox && s.spatial.subbasins.length > 0)
          .forEach((s) => {
            const centroid = SUBBASIN_CENTROIDS[s.spatial.subbasins[0]];
            const marker = new maplibregl.Marker({ color: DOMAIN_COLORS[s.domain[0]] })
              .setLngLat(centroid)
              .addTo(map);
            marker.getElement().addEventListener('click', () => setSelected(s));
          });
      });
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
    };
  }, [sources]);

  return (
    <div className="relative flex h-[70vh] gap-4">
      <div ref={containerRef} className="h-full flex-1 rounded-lg border border-slate-200" />
      {selected && (
        <div className="w-80 shrink-0 overflow-y-auto">
          <button
            onClick={() => setSelected(null)}
            className="mb-2 text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            Close ✕
          </button>
          <SourceCard source={selected} />
        </div>
      )}
    </div>
  );
}
