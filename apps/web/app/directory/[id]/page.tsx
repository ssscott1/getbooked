import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const name = id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return { title: name };
}

export default async function PractitionerPage({ params }: PageProps) {
  const { id } = await params;
  const name = id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <>
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Link
          href="/directory"
          className="text-sm text-brand-600 hover:underline"
        >
          ← Back to directory
        </Link>

        <div
          className="mt-6 rounded-2xl border border-gray-100 bg-white p-8 shadow-sm"
          itemScope
          itemType="https://schema.org/Physician"
        >
          <h1 className="text-2xl font-bold text-gray-900" itemProp="name">
            {name}
          </h1>
          <p className="mt-1 text-brand-600 font-medium" itemProp="medicalSpecialty">
            Specialist
          </p>

          <div className="mt-8 rounded-xl bg-gray-50 p-6">
            <h2 className="font-semibold text-gray-900">Book an appointment</h2>
            <p className="mt-2 text-sm text-gray-600">
              You&apos;ll need a valid GP referral to book with this specialist.
              Upload it during checkout — we&apos;ll extract the details for you.
            </p>
            <button
              disabled
              className="mt-4 w-full rounded-xl bg-brand-600 py-3 font-semibold text-white opacity-50 cursor-not-allowed"
            >
              Select a time (coming soon)
            </button>
            <p className="mt-3 text-center text-xs text-gray-400">
              Live availability will be shown here once this practice is connected.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
