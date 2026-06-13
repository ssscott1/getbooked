import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Find a Specialist",
  description:
    "Search Australia's specialist medical practitioners by specialty, location, and availability.",
};

// Placeholder data — will be replaced by live Postgres queries once the API is wired up.
const PLACEHOLDER_PRACTITIONERS = [
  {
    id: "dr-sarah-chen",
    name: "Dr Sarah Chen",
    specialty: "Cardiology",
    location: "Surry Hills, NSW",
    nextAvailable: "Tomorrow, 9:30 am",
    languages: ["English", "Mandarin"],
    acceptsReferrals: true,
  },
  {
    id: "dr-james-okafor",
    name: "Dr James Okafor",
    specialty: "Orthopaedics",
    location: "Southbank, VIC",
    nextAvailable: "Thu 19 Jun, 2:00 pm",
    languages: ["English"],
    acceptsReferrals: true,
  },
  {
    id: "dr-priya-nair",
    name: "Dr Priya Nair",
    specialty: "Dermatology",
    location: "Spring Hill, QLD",
    nextAvailable: "Mon 23 Jun, 11:00 am",
    languages: ["English", "Hindi", "Malayalam"],
    acceptsReferrals: true,
  },
  {
    id: "dr-michael-wu",
    name: "Dr Michael Wu",
    specialty: "Gastroenterology",
    location: "East Perth, WA",
    nextAvailable: "Fri 20 Jun, 3:30 pm",
    languages: ["English", "Cantonese"],
    acceptsReferrals: true,
  },
];

interface PageProps {
  searchParams: Promise<{ q?: string; specialty?: string; location?: string }>;
}

export default async function DirectoryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = params.q ?? "";

  const results = query
    ? PLACEHOLDER_PRACTITIONERS.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.specialty.toLowerCase().includes(query.toLowerCase()) ||
          p.location.toLowerCase().includes(query.toLowerCase())
      )
    : PLACEHOLDER_PRACTITIONERS;

  return (
    <>
      <Header />

      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* Search bar */}
        <form method="get" className="flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Specialty, condition, or practitioner name…"
            className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-base shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
          <button
            type="submit"
            className="rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            Search
          </button>
        </form>

        <p className="mt-6 text-sm text-gray-500">
          {results.length} practitioner{results.length !== 1 ? "s" : ""} found
          {query ? ` for "${query}"` : ""}
        </p>

        {/* Results */}
        <div className="mt-4 space-y-4">
          {results.map((p) => (
            <article
              key={p.id}
              className="flex items-start justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
              itemScope
              itemType="https://schema.org/Physician"
            >
              <div>
                <h2
                  className="text-lg font-semibold text-gray-900"
                  itemProp="name"
                >
                  {p.name}
                </h2>
                <p className="mt-1 text-sm text-brand-600 font-medium" itemProp="medicalSpecialty">
                  {p.specialty}
                </p>
                <p className="mt-1 text-sm text-gray-500" itemProp="workLocation">
                  {p.location}
                </p>
                {p.languages.length > 1 && (
                  <p className="mt-1 text-xs text-gray-400">
                    Speaks: {p.languages.join(", ")}
                  </p>
                )}
              </div>
              <div className="ml-6 flex flex-col items-end gap-3 shrink-0">
                <span className="text-sm font-medium text-green-700 bg-green-50 rounded-lg px-3 py-1">
                  Next: {p.nextAvailable}
                </span>
                <Link
                  href={`/directory/${p.id}`}
                  className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
                >
                  View &amp; book
                </Link>
              </div>
            </article>
          ))}

          {results.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center">
              <p className="text-gray-500">
                No practitioners found for &ldquo;{query}&rdquo;.
              </p>
              <Link
                href="/directory"
                className="mt-4 inline-block text-brand-600 hover:underline"
              >
                Clear search
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
