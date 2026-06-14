import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Practice portal — GetBooked",
  description: "Manage your bookings, referrals, and practice settings from one place.",
};

const FEATURES = [
  {
    title: "Real-time booking diary",
    body: "New appointments from GetBooked appear instantly alongside your existing schedule. No double-entry, no manual reconciliation.",
  },
  {
    title: "One-click referral triage",
    body: "Referral documents are extracted automatically using AI. Review pre-filled fields, verify details, and approve in seconds.",
  },
  {
    title: "Configurable fees & deposits",
    body: "Set consultation fees, Medicare rebates, and deposit requirements per appointment type. Patients see exact gap estimates at booking time.",
  },
  {
    title: "Automated patient communications",
    body: "Confirmation, reminder, and two-way confirm SMS sent automatically. Replies write appointment status back in real time.",
  },
  {
    title: "Waitlist backfill",
    body: "Cancellations trigger automatic offers to waitlisted patients with priority based on clinical urgency. First offer within 60 seconds.",
  },
  {
    title: "Full audit trail",
    body: "Every patient data read and write is logged with actor, timestamp, and action — meets Privacy Act 1988 and ISO 27001 requirements.",
  },
];

export default function PortalLandingPage() {
  return (
    <>
      <Header />

      {/* Hero */}
      <section className="bg-brand-900 px-4 py-20 text-center text-white">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight">
          The practice portal that works the way you do
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-brand-100">
          GetBooked fills your schedule with referred, high-quality patients while
          your team stays in full control of every booking decision.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/portal/login"
            className="rounded-xl bg-white px-8 py-3 font-semibold text-brand-900 hover:bg-brand-50 transition-colors"
          >
            Log in to your practice
          </Link>
          <a
            href="mailto:practices@getbooked.com.au"
            className="rounded-xl border border-white/30 px-8 py-3 font-semibold text-white hover:bg-white/10 transition-colors"
          >
            Request a demo
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center text-3xl font-bold text-gray-900">
          Built for specialist practices
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing note */}
      <section className="border-t border-gray-100 bg-gray-50 px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Simple, transparent pricing</h2>
        <p className="mx-auto mt-4 max-w-lg text-gray-600">
          Pay per booking or subscribe — no setup fee, no lock-in. Talk to us
          about what works for your practice volume.
        </p>
        <a
          href="mailto:practices@getbooked.com.au"
          className="mt-6 inline-block rounded-xl bg-brand-600 px-8 py-3 font-semibold text-white hover:bg-brand-700 transition-colors"
        >
          Get in touch
        </a>
      </section>
    </>
  );
}
