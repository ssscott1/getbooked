import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-gray-100 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-bold text-brand-700">
          GetBooked
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-gray-600">
          <Link href="/directory" className="hover:text-brand-600 transition-colors">
            Find a specialist
          </Link>
          <Link
            href="/portal"
            className="hover:text-brand-600 transition-colors"
          >
            For practices
          </Link>
          <Link
            href="/portal/login"
            className="rounded-lg bg-brand-600 px-4 py-2 text-white hover:bg-brand-700 transition-colors"
          >
            Practice login
          </Link>
        </nav>
      </div>
    </header>
  );
}
