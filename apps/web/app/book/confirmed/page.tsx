import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";

export const metadata: Metadata = { title: "Booking confirmed" };

export default function ConfirmedPage() {
  return (
    <>
      <Header />
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="mt-6 text-2xl font-bold text-gray-900">Booking confirmed</h1>
        <p className="mt-3 text-gray-600">
          You&apos;ll receive a confirmation SMS shortly with your appointment details
          and any preparation instructions from the practice.
        </p>
        <div className="mt-8 space-y-3">
          <Link
            href="/directory"
            className="block rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            Back to directory
          </Link>
          <Link href="/" className="block text-sm text-gray-500 hover:text-gray-700">
            Return home
          </Link>
        </div>
      </div>
    </>
  );
}
