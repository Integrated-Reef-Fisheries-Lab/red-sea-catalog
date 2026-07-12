'use client';

import { useEffect, useRef } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';

export default function MiniMap({ bbox }: { bbox: [number, number, number, number] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let map: import('maplibre-gl').Map | null = null;

    (async () => {
      const maplibregl = (await import('maplibre-gl')).default;
      if (cancelled || !containerRef.current) return;

      const [w, s, e, n] = bbox;
      map = new maplibregl.Map({
        container: containerRef.current,
        style: 'https://demotiles.maplibre.org/style.json',
        bounds: [
          [w, s],
          [e, n],
        ],
        fitBoundsOptions: { padding: 20 },
      });

      map.on('load', () => {
        if (!map) return;
        map.addSource('bbox', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [w, s],
                  [e, s],
                  [e, n],
                  [w, n],
                  [w, s],
                ],
              ],
            },
          },
        });
        map.addLayer({
          id: 'bbox-fill',
          type: 'fill',
          source: 'bbox',
          paint: { 'fill-color': '#2563eb', 'fill-opacity': 0.25 },
        });
        map.addLayer({
          id: 'bbox-outline',
          type: 'line',
          source: 'bbox',
          paint: { 'line-color': '#2563eb', 'line-width': 1.5 },
        });
      });
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [bbox]);

  return <div ref={containerRef} className="h-64 w-full rounded-lg border border-slate-200" />;
}
