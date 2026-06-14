"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { createDepositIntent, confirmBooking } from "@/lib/api";

interface CheckoutFormProps {
  slotId: string;
  holdToken: string;
  patientId: string;
  referralId?: string;
  requiresDeposit: boolean;
  depositCents: number;
  publishableKey: string;
}

// ── Direct confirm (no deposit) ───────────────────────────────────────────────

function DirectConfirmForm({
  slotId,
  holdToken,
  patientId,
  referralId,
}: Omit<CheckoutFormProps, "requiresDeposit" | "depositCents" | "publishableKey">) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      const appt = await confirmBooking({ slotId, holdToken, patientId, referralId }) as { id: string };
      router.push(`/book/confirmed?appointmentId=${appt.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        onClick={handleConfirm}
        disabled={loading}
        className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Confirming…" : "Confirm appointment"}
      </button>
    </div>
  );
}

// ── Stripe payment form ────────────────────────────────────────────────────────

function StripePaymentForm({
  depositCents,
}: {
  depositCents: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message ?? "Payment error");
      setLoading(false);
      return;
    }

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/book/confirmed`,
      },
    });

    if (confirmError) {
      setError(confirmError.message ?? "Payment failed");
      setLoading(false);
    }
    // On success Stripe redirects to return_url; webhook confirms the appointment
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement />
      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
      >
        {loading
          ? "Processing…"
          : `Pay deposit $${(depositCents / 100).toFixed(2)} AUD`}
      </button>
      <p className="text-center text-xs text-gray-400">
        Secured by Stripe · SSL encrypted
      </p>
    </form>
  );
}

// ── Root component ─────────────────────────────────────────────────────────────

export function CheckoutForm({
  slotId,
  holdToken,
  patientId,
  referralId,
  requiresDeposit,
  depositCents,
  publishableKey,
}: CheckoutFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [intentError, setIntentError] = useState<string | null>(null);

  useEffect(() => {
    if (!requiresDeposit || !publishableKey) return;
    createDepositIntent({ slotId, holdToken, patientId, referralId })
      .then((res) => setClientSecret(res.clientSecret))
      .catch((e) =>
        setIntentError(e instanceof Error ? e.message : "Could not initialise payment")
      );
  }, [slotId, holdToken, patientId, referralId, requiresDeposit, publishableKey]);

  if (!requiresDeposit) {
    return (
      <DirectConfirmForm
        slotId={slotId}
        holdToken={holdToken}
        patientId={patientId}
        referralId={referralId}
      />
    );
  }

  if (intentError) {
    return (
      <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
        {intentError}
      </p>
    );
  }

  if (!clientSecret || !publishableKey) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  const stripePromise = loadStripe(publishableKey);

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <StripePaymentForm depositCents={depositCents} />
    </Elements>
  );
}
