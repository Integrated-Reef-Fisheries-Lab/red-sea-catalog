import type { Source, Subbasin, QualityStatus } from '@/lib/types';
import { SUBBASINS, QUALITY_COLORS } from '@/lib/types';

interface Column {
  key: string;
  label: string;
  domain: Source['domain'][number];
  theme: string;
}

// Domain x theme columns are defined here from the seed dataset's themes.
// Add a column whenever a new domain/theme combination should be tracked.
const COLUMNS: Column[] = [
  { key: 'env-sst', label: 'Environmental — SST', domain: 'environmental', theme: 'SST' },
  { key: 'env-chl', label: 'Environmental — Chlorophyll', domain: 'environmental', theme: 'chlorophyll-a' },
  { key: 'eco-coral', label: 'Ecological — Coral Cover', domain: 'ecological', theme: 'coral cover' },
  { key: 'eco-fish', label: 'Ecological — Reef Fish', domain: 'ecological', theme: 'reef fish' },
  { key: 'prod-catch', label: 'Production — Fisheries Catch', domain: 'production', theme: 'fisheries catch reconstruction' },
  { key: 'nutri-consumption', label: 'Nutrition — Seafood Consumption', domain: 'nutrition-health', theme: 'seafood consumption' },
  { key: 'socio-pop', label: 'Socio-economic — Population Density', domain: 'socio-economic', theme: 'population density' },
];

function bestStatusFor(sources: Source[], subbasin: Subbasin, column: Column): QualityStatus | null {
  const matches = sources.filter(
    (s) =>
      s.spatial.subbasins.includes(subbasin) &&
      s.domain.includes(column.domain) &&
      s.themes.includes(column.theme)
  );
  if (matches.length === 0) return null;

  const order: QualityStatus[] = ['analysis-ready', 'cleaned', 'raw', 'deprecated'];
  matches.sort((a, b) => order.indexOf(a.quality.status) - order.indexOf(b.quality.status));
  return matches[0].quality.status;
}

export default function CoverageMatrix({ sources }: { sources: Source[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 bg-slate-50 p-3 text-left font-semibold text-slate-700">Subbasin</th>
            {COLUMNS.map((col) => (
              <th key={col.key} className="p-3 text-left font-medium text-slate-600">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SUBBASINS.map((subbasin) => (
            <tr key={subbasin} className="border-t border-slate-100">
              <td className="sticky left-0 bg-white p-3 font-medium capitalize text-slate-800">
                {subbasin.replace(/-/g, ' ')}
              </td>
              {COLUMNS.map((col) => {
                const status = bestStatusFor(sources, subbasin, col);
                return (
                  <td key={col.key} className="p-2">
                    <div
                      title={status ? `${col.label} — ${subbasin}: ${status}` : `${col.label} — ${subbasin}: no data`}
                      className="flex h-10 w-full items-center justify-center rounded text-xs font-medium text-white"
                      style={{ backgroundColor: status ? QUALITY_COLORS[status] : '#e2e8f0', color: status ? '#fff' : '#94a3b8' }}
                    >
                      {status ? status.replace('-', ' ') : 'gap'}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
