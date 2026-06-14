import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { searchPractitioners, type PractitionerSummary } from "@/lib/api";

export const metadata: Metadata = {
  title: "Find a Specialist",
  description:
    "Search Australia's specialist medical practitioners by specialty, location, and availability.",
};

// Fallback data shown when the API is unreachable (e.g. before API is deployed)
const FALLBACK_PRACTITIONERS: PractitionerSummary[] = [
  {
    id: "dr-sarah-chen",
    firstName: "Sarah",
    lastName: "Chen",
    title: "Dr",
    specialty: "Cardiology",
    specialInterests: ["Heart failure", "Cardiac imaging"],
    languages: ["English", "Mandarin"],
    telehealth: true,
    practice: {
      name: "Sydney Heart Centre",
      phone: null,
      locations: [{ id: "1", name: "Main clinic", suburb: "Surry Hills", state: "NSW", postcode: "2010" }],
      appointmentTypes: [{ id: "1", name: "New patient consult", durationMinutes: 45, bookingMode: "REQUEST" }],
    },
    slots: [{ startsAt: new Date(Date.now() + 86400000).toISOString() }],
  },
];

function formatNextAvailable(slots: Array<{ startsAt: string }>) {
  if (!slots.length) return null;
  const d = new Date(slots[0]!.startsAt);
  return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
}

interface PageProps {
  searchParams: Promise<{ q?: string; specialty?: string; suburb?: string; state?: string; page?: string }>;
}

export default async function DirectoryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = params.q ?? "";

  let result;
  try {
    result = await searchPractitioners({
      q: query || undefined,
      specialty: params.specialty,
      suburb: params.suburb,
      state: params.state,
      page: params.page ? Number(params.page) : 1,
    });
  } catch {
    // API not yet reachable — show fallback
    result = { data: FALLBACK_PRACTITIONERS, meta: { total: 1, page: 1, limit: 20, pages: 1 } };
  }

  const { data: practitioners, meta } = result;

  return (
    <>
      <Header />

      <div className="mx-auto max-w-6xl px-4 py-10">
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
          {meta.total} practitioner{meta.total !== 1 ? "s" : ""} found
          {query ? ` for "${query}"` : ""}
        </p>

        <div className="mt-4 space-y-4">
          {practitioners.map((p) => {
            const location = p.practice.locations[0];
            const nextAvail = formatNextAvailable(p.slots);

            return (
              <article
                key={p.id}
                className="flex items-start justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
                itemScope
                itemType="https://schema.org/Physician"
              >
                <div>
                  <h2 className="text-lg font-semibold text-gray-900" itemProp="name">
                    {p.title ? `${p.title} ` : ""}{p.firstName} {p.lastName}
                  </h2>
                  <p className="mt-1 text-sm text-brand-600 font-medium" itemProp="medicalSpecialty">
                    {p.specialty}
                  </p>
                  {location && (
                    <p className="mt-1 text-sm text-gray-500" itemProp="workLocation">
                      {p.practice.name} · {location.suburb}, {location.state}
                    </p>
                  )}
                  {p.telehealth && (
                    <span className="mt-1 inline-block text-xs text-brand-500">
                      Telehealth available
                    </span>
                  )}
                  {p.languages.length > 1 && (
                    <p className="mt-1 text-xs text-gray-400">
                      Speaks: {p.languages.join(", ")}
                    </p>
                  )}
                </div>
                <div className="ml-6 flex flex-col items-end gap-3 shrink-0">
                  {nextAvail && (
                    <span className="text-sm font-medium text-green-700 bg-green-50 rounded-lg px-3 py-1">
                      Next: {nextAvail}
                    </span>
                  )}
                  {!nextAvail && (
                    <span className="text-sm text-gray-400 bg-gray-50 rounded-lg px-3 py-1">
                      No slots shown
                    </span>
                  )}
                  <Link
                    href={`/directory/${p.id}`}
                    className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
                  >
                    View &amp; book
                  </Link>
                </div>
              </article>
            );
          })}

          {practitioners.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center">
              <p className="text-gray-500">
                No practitioners found{query ? ` for "${query}"` : ""}.
              </p>
              <Link href="/directory" className="mt-4 inline-block text-brand-600 hover:underline">
                Clear search
              </Link>
            </div>
          )}
        </div>

        {/* Pagination */}
        {meta.pages > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            {Array.from({ length: meta.pages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={`/directory?${new URLSearchParams({ ...(query && { q: query }), page: String(p) })}`}
                className={`rounded-lg px-4 py-2 text-sm font-medium ${
                  p === meta.page
                    ? "bg-brand-600 text-white"
                    : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {p}
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
