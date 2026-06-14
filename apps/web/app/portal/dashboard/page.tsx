import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Dashboard — Practice portal" };

// Placeholder data — replaced by API queries once auth is wired
const UPCOMING = [
  {
    id: "appt-1",
    patient: "James Miller",
    type: "New patient consult",
    time: "Today, 10:30 am",
    status: "CONFIRMED",
    depositPaid: true,
    depositAmount: 150,
  },
  {
    id: "appt-2",
    patient: "Priya Singh",
    type: "Review",
    time: "Today, 2:00 pm",
    status: "CONFIRMED",
    depositPaid: false,
    depositAmount: 0,
  },
  {
    id: "appt-3",
    patient: "Robert Chen",
    type: "New patient consult",
    time: "Tomorrow, 9:00 am",
    status: "REQUESTED",
    depositPaid: true,
    depositAmount: 150,
  },
];

const REFERRAL_QUEUE = [
  {
    id: "ref-1",
    patient: "Robert Chen",
    uploadedAt: "2 min ago",
    fieldsNeedingReview: ["referringDoctor", "referralDate"],
  },
  {
    id: "ref-2",
    patient: "Maria Santos",
    uploadedAt: "45 min ago",
    fieldsNeedingReview: [],
  },
];

const STATUS_COLOURS: Record<string, string> = {
  CONFIRMED: "bg-green-100 text-green-800",
  REQUESTED: "bg-amber-100 text-amber-800",
  CANCELLED: "bg-gray-100 text-gray-600",
};

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-bold text-brand-700">GetBooked</Link>
          <nav className="flex items-center gap-4 text-sm text-gray-600">
            <Link href="/portal/dashboard" className="font-medium text-brand-700">Dashboard</Link>
            <Link href="/portal/settings" className="hover:text-gray-900">Settings</Link>
            <button className="rounded-lg border border-gray-200 px-3 py-1.5 hover:bg-gray-50 text-xs">
              Log out
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-8">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Today's appointments", value: "2" },
            { label: "Pending requests", value: "1" },
            { label: "Referrals to triage", value: "2" },
            { label: "Waitlisted patients", value: "7" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-white border border-gray-100 p-5">
              <p className="text-3xl font-bold text-gray-900">{s.value}</p>
              <p className="mt-1 text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Upcoming appointments */}
          <section className="rounded-2xl bg-white border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Upcoming appointments</h2>
              <Link href="/portal/appointments" className="text-xs text-brand-600 hover:underline">
                View all
              </Link>
            </div>
            <ul className="divide-y divide-gray-100">
              {UPCOMING.map((a) => (
                <li key={a.id} className="flex items-center justify-between px-6 py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{a.patient}</p>
                    <p className="text-xs text-gray-500">{a.type} · {a.time}</p>
                    {a.depositPaid && (
                      <p className="mt-0.5 text-xs text-green-600">
                        Deposit paid ${a.depositAmount}
                      </p>
                    )}
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOURS[a.status] ?? ""}`}>
                    {a.status}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Referral triage queue */}
          <section className="rounded-2xl bg-white border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Referral triage queue</h2>
              <Link href="/portal/referrals" className="text-xs text-brand-600 hover:underline">
                View all
              </Link>
            </div>
            <ul className="divide-y divide-gray-100">
              {REFERRAL_QUEUE.map((r) => (
                <li key={r.id} className="flex items-center justify-between px-6 py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{r.patient}</p>
                    <p className="text-xs text-gray-500">Uploaded {r.uploadedAt}</p>
                    {r.fieldsNeedingReview.length > 0 && (
                      <p className="mt-0.5 text-xs text-amber-600">
                        Needs review: {r.fieldsNeedingReview.join(", ")}
                      </p>
                    )}
                    {r.fieldsNeedingReview.length === 0 && (
                      <p className="mt-0.5 text-xs text-green-600">All fields extracted ✓</p>
                    )}
                  </div>
                  <button className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">
                    Triage
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Deposit settings notice */}
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-6">
          <h3 className="font-semibold text-brand-900">Configure deposit requirements</h3>
          <p className="mt-1 text-sm text-brand-700">
            You can require a deposit for new patient consultations and other appointment types.
            Deposits are collected via Stripe before the booking is confirmed.
          </p>
          <Link
            href="/portal/settings/fees"
            className="mt-3 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            Manage fees &amp; deposits
          </Link>
        </div>
      </main>
    </div>
  );
}
