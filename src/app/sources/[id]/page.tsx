import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllSources, getSourceById } from '@/lib/sources';
import { DOMAIN_COLORS } from '@/lib/types';
import MiniMapClient from './MiniMapClient';

export function generateStaticParams() {
  return getAllSources().map((s) => ({ id: s.id }));
}

export default async function SourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const source = getSourceById(id);
  if (!source) notFound();

  const allSources = getAllSources();
  const lineageSources = source.provenance.derived_from
    .map((id) => allSources.find((s) => s.id === id))
    .filter(Boolean);

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-2 flex flex-wrap gap-2">
          {source.domain.map((d) => (
            <span
              key={d}
              className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: DOMAIN_COLORS[d] }}
            >
              {d}
            </span>
          ))}
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">{source.title}</h1>
        <p className="mt-2 text-slate-600">{source.abstract}</p>
      </div>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Overview</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-3">
          <div>
            <dt className="text-slate-500">Themes</dt>
            <dd>{source.themes.join(', ')}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Keywords</dt>
            <dd>{source.keywords.join(', ')}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Temporal coverage</dt>
            <dd>
              {source.temporal.start}&ndash;{source.temporal.ongoing ? 'present' : source.temporal.end} (
              {source.temporal.frequency})
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Quality status</dt>
            <dd className="capitalize">{source.quality.status.replace('-', ' ')}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Last verified</dt>
            <dd>{source.quality.last_verified}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Resolution</dt>
            <dd>{source.spatial.resolution}</dd>
          </div>
        </dl>
        {source.quality.known_issues.length > 0 && (
          <div className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            <strong>Known issues:</strong> {source.quality.known_issues.join('; ')}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Spatial Info</h2>
        <p className="mb-2 text-sm text-slate-600">
          bbox [{source.spatial.bbox.join(', ')}] &middot; subbasins:{' '}
          {source.spatial.subbasins.join(', ')}
        </p>
        <MiniMapClient bbox={source.spatial.bbox} />
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Resources</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="p-3">Name</th>
                <th className="p-3">Format</th>
                <th className="p-3">Path</th>
                <th className="p-3">Size</th>
                <th className="p-3">Rows</th>
              </tr>
            </thead>
            <tbody>
              {source.resources.map((r) => (
                <tr key={r.name} className="border-b border-slate-100 last:border-0">
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3">{r.format}</td>
                  <td className="p-3 font-mono text-xs text-slate-500">{r.path}</td>
                  <td className="p-3">{r.size}</td>
                  <td className="p-3">{r.n_rows.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Variable Dictionary</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="p-3">Name</th>
                <th className="p-3">Type</th>
                <th className="p-3">Unit</th>
                <th className="p-3">Description</th>
                <th className="p-3">Maps to</th>
              </tr>
            </thead>
            <tbody>
              {source.resources.flatMap((r) =>
                r.variables.map((v) => (
                  <tr key={`${r.name}-${v.name}`} className="border-b border-slate-100 last:border-0">
                    <td className="p-3 font-medium">{v.name}</td>
                    <td className="p-3">{v.type}</td>
                    <td className="p-3">{v.unit}</td>
                    <td className="p-3 text-slate-600">{v.description}</td>
                    <td className="p-3 text-slate-500">{v.maps_to.join(', ') || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Lineage</h2>
        {lineageSources.length > 0 ? (
          <ul className="list-inside list-disc text-sm">
            {lineageSources.map((s) => (
              <li key={s!.id}>
                <Link href={`/sources/${s!.id}`} className="text-blue-600 hover:underline">
                  {s!.title}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No upstream sources recorded.</p>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Access</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-3">
          <div>
            <dt className="text-slate-500">Tier</dt>
            <dd className="capitalize">{source.access.tier.replace('-', ' ')}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Steward</dt>
            <dd>
              {source.access.steward.name} &lt;{source.access.steward.email}&gt;
            </dd>
          </div>
          <div className="col-span-2 md:col-span-3">
            <dt className="text-slate-500">How to request</dt>
            <dd>{source.access.how_to_request}</dd>
          </div>
        </dl>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Provenance</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-3">
          <div>
            <dt className="text-slate-500">Originator</dt>
            <dd>{source.provenance.originator}</dd>
          </div>
          <div>
            <dt className="text-slate-500">License</dt>
            <dd>{source.provenance.license}</dd>
          </div>
          {source.provenance.doi && (
            <div>
              <dt className="text-slate-500">DOI</dt>
              <dd>{source.provenance.doi}</dd>
            </div>
          )}
          <div className="col-span-2 md:col-span-3">
            <dt className="text-slate-500">Citation</dt>
            <dd>{source.provenance.citation}</dd>
          </div>
        </dl>
      </section>

      {source.used_in.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold text-slate-900">Used In</h2>
          <ul className="list-inside list-disc text-sm text-slate-700">
            {source.used_in.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
