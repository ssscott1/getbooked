import Link from "next/link";
import { Header } from "@/components/Header";

const SPECIALTIES = [
  "Cardiology",
  "Orthopaedics",
  "Dermatology",
  "Gastroenterology",
  "Neurology",
  "Oncology",
  "Ophthalmology",
  "Rheumatology",
];

const STEPS = [
  {
    number: "01",
    title: "Get a referral",
    body: "Ask your GP for a referral. Upload it securely during booking — we extract the details automatically.",
  },
  {
    number: "02",
    title: "Search & compare",
    body: "Filter by specialty, location, language, and next available appointment. No hidden rankings.",
  },
  {
    number: "03",
    title: "Book in seconds",
    body: "Hold your slot while you complete checkout. Your booking is confirmed in real time.",
  },
];

export default function HomePage() {
  return (
    <>
      <Header />

      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-50 to-white px-4 py-20 text-center">
        <h1 className="mx-auto max-w-3xl text-5xl font-bold leading-tight tracking-tight text-brand-900">
          Find a specialist,{" "}
          <span className="text-brand-600">skip the wait</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-gray-600">
          Australia&apos;s first specialist-first booking marketplace. Search
          real availability, upload your referral, and lock in your appointment
          — all in under two minutes.
        </p>

        {/* Search bar */}
        <form
          action="/directory"
          method="get"
          className="mx-auto mt-10 flex max-w-xl gap-2"
        >
          <input
            type="text"
            name="q"
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

        {/* Quick-links */}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {SPECIALTIES.map((s) => (
            <Link
              key={s}
              href={`/directory?q=${encodeURIComponent(s)}`}
              className="rounded-full border border-brand-200 bg-white px-4 py-1.5 text-sm text-brand-700 hover:bg-brand-50 transition-colors"
            >
              {s}
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center text-3xl font-bold text-gray-900">
          How it works
        </h2>
        <p className="mt-3 text-center text-gray-500">
          From referral to confirmed appointment in minutes, not weeks.
        </p>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.number} className="rounded-2xl border border-gray-100 bg-gray-50 p-8">
              <span className="text-4xl font-black text-brand-200">
                {step.number}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* For practices CTA */}
      <section className="bg-brand-900 px-4 py-16 text-center text-white">
        <h2 className="text-3xl font-bold">Running a specialist practice?</h2>
        <p className="mx-auto mt-4 max-w-lg text-brand-100">
          GetBooked fills your schedule with referred, high-quality patients
          while you stay in complete control of your diary. No setup fee.
          Pay per booking or subscribe.
        </p>
        <Link
          href="/portal"
          className="mt-8 inline-block rounded-xl bg-white px-8 py-3 font-semibold text-brand-900 hover:bg-brand-50 transition-colors"
        >
          Learn more for practices
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-4 py-10 text-center text-sm text-gray-400">
        <p>
          © {new Date().getFullYear()} GetBooked Pty Ltd · All data hosted in
          Australia · HIPAA-equivalent AU privacy compliance
        </p>
        <div className="mt-3 flex justify-center gap-6">
          <Link href="/privacy" className="hover:text-gray-600">Privacy policy</Link>
          <Link href="/terms" className="hover:text-gray-600">Terms of service</Link>
          <Link href="/portal" className="hover:text-gray-600">Practice portal</Link>
        </div>
      </footer>
    </>
  );
}
