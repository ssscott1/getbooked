import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Complete your booking" };

interface PageProps {
  params: Promise<{ slotId: string }>;
  searchParams: Promise<{
    holdToken?: string;
    patientId?: string;
    depositCents?: string;
    slotTime?: string;
    practitionerName?: string;
    referralId?: string;
  }>;
}

export default async function BookPage({ params, searchParams }: PageProps) {
  const { slotId } = await params;
  const sp = await searchParams;

  if (!sp.holdToken || !sp.patientId) notFound();

  const depositCents = sp.depositCents ? Number(sp.depositCents) : 0;
  const requiresDeposit = depositCents > 0;
  const publishableKey = process.env["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"] ?? "";

  return (
    <>
      <Header />
      <div className="mx-auto max-w-xl px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-900">Complete your booking</h1>

        {/* Appointment summary */}
        <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-6">
          <h2 className="font-semibold text-gray-900">Appointment details</h2>
          {sp.practitionerName && (
            <p className="mt-2 text-sm text-gray-700">
              <span className="font-medium">Practitioner:</span> {sp.practitionerName}
            </p>
          )}
          {sp.slotTime && (
            <p className="mt-1 text-sm text-gray-700">
              <span className="font-medium">Time:</span>{" "}
              {new Date(sp.slotTime).toLocaleString("en-AU", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })}
            </p>
          )}
          {requiresDeposit && (
            <p className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
              A deposit of <strong>${(depositCents / 100).toFixed(2)} AUD</strong> is required
              to secure this appointment. This will be applied to your consultation fee.
            </p>
          )}
        </div>

        {/* Payment / confirm form */}
        <div className="mt-6">
          <CheckoutForm
            slotId={slotId}
            holdToken={sp.holdToken}
            patientId={sp.patientId}
            referralId={sp.referralId}
            requiresDeposit={requiresDeposit}
            depositCents={depositCents}
            publishableKey={publishableKey}
          />
        </div>
      </div>
    </>
  );
}
