'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as MapLibreMap, MapGeoJSONFeature } from 'maplibre-gl';
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

// A dataset whose bbox is much wider than the Red Sea basin itself (roughly
// 11 x 17 degrees) is global/near-global in extent. Filling those as map
// rectangles would blanket the whole map in one color and hide every
// Red-Sea-scale footprint underneath it, so they're listed separately
// instead of drawn.
const GLOBAL_SCALE_DEGREES = 60;

function bboxSpan([w, s, e, n]: [number, number, number, number]) {
  return { width: e - w, height: n - s };
}

function isGlobalScale(bbox: [number, number, number, number]) {
  const { width, height } = bboxSpan(bbox);
  return width > GLOBAL_SCALE_DEGREES || height > GLOBAL_SCALE_DEGREES;
}

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
  const [pickerOptions, setPickerOptions] = useState<Source[] | null>(null);

  const localSources = sources.filter((s) => s.spatial.bbox && !isGlobalScale(s.spatial.bbox));
  const globalSources = sources.filter((s) => s.spatial.bbox && isGlobalScale(s.spatial.bbox));
  const pointSources = sources.filter((s) => !s.spatial.bbox && s.spatial.subbasins.length > 0);

  function pick(ids: string[]) {
    const matches = ids
      .map((id) => sources.find((s) => s.id === id))
      .filter((s): s is Source => Boolean(s));
    if (matches.length === 0) return;
    if (matches.length === 1) {
      setSelected(matches[0]);
      setPickerOptions(null);
    } else {
      setPickerOptions(matches);
      setSelected(null);
    }
  }

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
        const rectangleFeatures = localSources.map((s) => ({
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
          const features: MapGeoJSONFeature[] = map.queryRenderedFeatures(e.point, { layers: ['bbox-fill'] });
          const ids = Array.from(new Set(features.map((f) => f.properties?.id as string).filter(Boolean)));
          pick(ids);
        });
        map.on('mouseenter', 'bbox-fill', () => (map.getCanvas().style.cursor = 'pointer'));
        map.on('mouseleave', 'bbox-fill', () => (map.getCanvas().style.cursor = ''));

        // Point markers for sources without a bbox, grouped by subbasin
        // centroid so overlapping markers still resolve to a picker.
        const bySubbasin = new Map<string, Source[]>();
        for (const s of pointSources) {
          const key = s.spatial.subbasins[0];
          if (!bySubbasin.has(key)) bySubbasin.set(key, []);
          bySubbasin.get(key)!.push(s);
        }
        for (const [subbasin, group] of bySubbasin) {
          const centroid = SUBBASIN_CENTROIDS[subbasin as Subbasin];
          const marker = new maplibregl.Marker({ color: DOMAIN_COLORS[group[0].domain[0]] })
            .setLngLat(centroid)
            .addTo(map);
          marker.getElement().style.cursor = 'pointer';
          marker.getElement().addEventListener('click', (evt) => {
            evt.stopPropagation();
            pick(group.map((s) => s.id));
          });
        }
      });
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sources]);

  return (
    <div>
      <div className="relative flex h-[70vh] gap-4">
        <div ref={containerRef} className="h-full flex-1 rounded-lg border border-slate-200" />
        {(selected || pickerOptions) && (
          <div className="w-80 shrink-0 overflow-y-auto">
            <button
              onClick={() => {
                setSelected(null);
                setPickerOptions(null);
              }}
              className="mb-2 text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              Close ✕
            </button>
            {selected && <SourceCard source={selected} />}
            {pickerOptions && (
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="mb-2 text-xs font-medium text-slate-600">
                  {pickerOptions.length} datasets overlap here — pick one:
                </p>
                <ul className="space-y-1">
                  {pickerOptions.map((s) => (
                    <li key={s.id}>
                      <button
                        onClick={() => {
                          setSelected(s);
                          setPickerOptions(null);
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-slate-50"
                      >
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: DOMAIN_COLORS[s.domain[0]] }}
                        />
                        <span className="text-slate-800">{s.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {globalSources.length > 0 && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="mb-2 text-sm font-medium text-slate-700">
            {globalSources.length} global / very large-extent dataset{globalSources.length === 1 ? '' : 's'} (not
            drawn on the map — their footprint would cover the whole basin and hide everything else)
          </p>
          <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {globalSources.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => {
                    setSelected(s);
                    setPickerOptions(null);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-white"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: DOMAIN_COLORS[s.domain[0]] }}
                  />
                  <span className="text-slate-700">{s.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
