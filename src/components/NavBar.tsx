import Link from 'next/link';

const LINKS = [
  { href: '/', label: 'Browse' },
  { href: '/map', label: 'Map' },
  { href: '/coverage', label: 'Coverage' },
  { href: '/network', label: 'Network' },
];

export default function NavBar() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-semibold text-slate-900">
          Red Sea Marine Data Catalog
        </Link>
        <ul className="flex gap-6 text-sm font-medium text-slate-600">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="hover:text-slate-900">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
