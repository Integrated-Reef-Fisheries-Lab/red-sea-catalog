import { getAllSources } from '@/lib/sources';
import CoverageMatrix from '@/components/CoverageMatrix';

export default function CoveragePage() {
  const sources = getAllSources();
  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-slate-900">Coverage Gap Matrix</h1>
      <p className="mb-4 text-sm text-slate-600">
        Rows are Red Sea subbasins, columns are domain × theme combinations. Cell color reflects the
        best available data quality; gray means no data.
      </p>
      <CoverageMatrix sources={sources} />
    </div>
  );
}
